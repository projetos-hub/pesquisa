import dotenv from 'dotenv'
import { createClient } from '@supabase/supabase-js'
import fs from 'node:fs'
import path from 'node:path'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const SURVEY_ID = '897a492a-62ed-42a8-8b7d-8bebf01dbd22'
const BASE_URL = 'https://api.layers.digital'
const APPLY = process.argv.includes('--apply')
const LIMIT_ARG = process.argv.find(arg => arg.startsWith('--limit='))
const LIMIT = LIMIT_ARG ? Number(LIMIT_ARG.split('=')[1]) : null

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY
const LAYERS_TOKEN = process.env.LAYERS_API_TOKEN

if (!SUPABASE_URL || !SERVICE_ROLE || !LAYERS_TOKEN) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY or LAYERS_API_TOKEN')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE, {
  auth: { persistSession: false },
})

function normalizeGroupText(value) {
  return (value ?? '').trim()
}

function isLikelySerie(group) {
  const text = `${group?.name ?? ''} ${group?.alias ?? ''}`.toLowerCase()
  return /\b(ano|serie|ensino|fundamental|medio|infantil)\b/.test(text)
    || /^\s*\d{4}\s*[-]/.test(group?.name ?? '')
}

function extractSerieTurmaFromGroups(groups) {
  const classroomGroups = (groups ?? []).filter(group => !group.type || group.type === 'classroom')
  const sourceGroups = classroomGroups.length > 0 ? classroomGroups : (groups ?? [])
  if (sourceGroups.length === 0) return { serie: '', turma: '' }

  const serieGroup = sourceGroups.find(isLikelySerie) ?? sourceGroups[0]
  const turmaGroup = sourceGroups.find(group => group !== serieGroup && !isLikelySerie(group))
    ?? sourceGroups.find(group => group !== serieGroup)
    ?? serieGroup

  const serie = normalizeGroupText(serieGroup.name || serieGroup.alias)
  const turmaCandidate = normalizeGroupText(turmaGroup.name || turmaGroup.alias)
  const serieAlias = normalizeGroupText(serieGroup.alias)
  const turma = turmaCandidate && turmaCandidate !== serie
    ? turmaCandidate
    : serieAlias && serieAlias !== serie
      ? serieAlias
      : ''

  return { serie, turma }
}

async function fetchJson(url, communityId) {
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${LAYERS_TOKEN}`,
      'community-id': communityId,
    },
    signal: AbortSignal.timeout(10000),
  })
  if (!res.ok) return { ok: false, status: res.status, data: null }
  return { ok: true, status: res.status, data: await res.json() }
}

async function fetchGroupInfo(entityId, communityId) {
  const enroll = await fetchJson(`${BASE_URL}/v1/enrollments/search?active=true`, communityId)
  if (!enroll.ok) return { status: `enrollments_${enroll.status}`, serie: '', turma: '' }

  const hits = Array.isArray(enroll.data?.hits) ? enroll.data.hits : []
  const groups = hits.filter(item => item?.entity === entityId).map(item => item?.group).filter(Boolean)
  const uniqueGroups = [...new Set(groups)]

  if (uniqueGroups.length === 0) return { status: 'no_enrollment', serie: '', turma: '' }
  if (uniqueGroups.length > 1) return { status: 'multiple_enrollments', serie: '', turma: '' }

  const group = await fetchJson(`${BASE_URL}/v1/groups/${uniqueGroups[0]}`, communityId)
  if (!group.ok) return { status: `group_${group.status}`, serie: '', turma: '' }

  const serie = normalizeGroupText(group.data?.name || group.data?.alias)
  const turma = normalizeGroupText(group.data?.alias && group.data?.alias !== group.data?.name ? group.data.alias : '')
  return { status: serie || turma ? 'ok' : 'empty_group', serie, turma }
}

async function resolveRow(row) {
  if (!row.community_id || !row.user_id) {
    return { action: 'skip', reason: 'missing_identity', row }
  }

  if (row.perfil === 'responsavel') {
    const related = await fetchJson(`${BASE_URL}/v1/users/${row.user_id}/related`, row.community_id)
    if (!related.ok) return { action: 'skip', reason: `related_${related.status}`, row }

    const members = Array.isArray(related.data?.members) ? related.data.members : []
    const students = members.filter(member => member?.name?.trim() || member?._id)
    if (students.length === 0) return { action: 'skip', reason: 'no_related_student', row }
    if (students.length > 1) return { action: 'skip', reason: 'multiple_related_students', row, relatedCount: students.length }

    const student = students[0]
    let { serie, turma } = extractSerieTurmaFromGroups(student.groups)
    let source = 'related_groups'

    if ((!serie && !turma) && student._id) {
      const fallback = await fetchGroupInfo(student._id, row.community_id)
      serie = fallback.serie
      turma = fallback.turma
      source = `student_${fallback.status}`
    }

    if (!serie && !turma) return { action: 'skip', reason: 'no_serie_turma', row, source }
    return { action: 'update', row, serie, turma, source }
  }

  if (row.perfil === 'aluno') {
    const fallback = await fetchGroupInfo(row.user_id, row.community_id)
    if (!fallback.serie && !fallback.turma) return { action: 'skip', reason: fallback.status, row }
    return { action: 'update', row, serie: fallback.serie, turma: fallback.turma, source: `student_${fallback.status}` }
  }

  return { action: 'skip', reason: `perfil_${row.perfil || 'empty'}`, row }
}

async function fetchRows() {
  let query = supabase
    .from('response_sessions')
    .select('id, survey_id, community_id, user_id, email, perfil, nome_aluno, serie, turma, submitted_at')
    .eq('survey_id', SURVEY_ID)
    .or('serie.is.null,serie.eq.,turma.is.null,turma.eq.')
    .order('submitted_at', { ascending: true })

  if (LIMIT) query = query.limit(LIMIT)

  const { data, error } = await query
  if (error) throw error
  return data ?? []
}

async function applyUpdates(updates) {
  let applied = 0
  for (const item of updates) {
    const { error } = await supabase
      .from('response_sessions')
      .update({ serie: item.serie, turma: item.turma })
      .eq('id', item.row.id)
      .eq('survey_id', SURVEY_ID)

    if (error) throw error
    applied++
  }
  return applied
}

function summarize(results) {
  const byAction = {}
  const byReason = {}
  const bySource = {}
  const byPerfil = {}

  for (const item of results) {
    byAction[item.action] = (byAction[item.action] ?? 0) + 1
    byPerfil[item.row.perfil || ''] = (byPerfil[item.row.perfil || ''] ?? 0) + 1
    if (item.reason) byReason[item.reason] = (byReason[item.reason] ?? 0) + 1
    if (item.source) bySource[item.source] = (bySource[item.source] ?? 0) + 1
  }

  return { byAction, byReason, bySource, byPerfil }
}

async function main() {
  const rows = await fetchRows()
  const results = []

  for (let index = 0; index < rows.length; index++) {
    const result = await resolveRow(rows[index])
    results.push(result)
    if ((index + 1) % 50 === 0 || index + 1 === rows.length) {
      console.error(`processed ${index + 1}/${rows.length}`)
    }
  }

  const updates = results.filter(item => item.action === 'update')
  const skipped = results.filter(item => item.action !== 'update')
  const applied = APPLY ? await applyUpdates(updates) : 0

  const outDir = path.resolve(process.cwd(), '..', 'tmp')
  fs.mkdirSync(outDir, { recursive: true })
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
  const outPath = path.join(outDir, `amostral2-serie-turma-${APPLY ? 'apply' : 'dry-run'}-${timestamp}.json`)

  fs.writeFileSync(outPath, JSON.stringify({
    surveyId: SURVEY_ID,
    mode: APPLY ? 'apply' : 'dry-run',
    totalMissingFetched: rows.length,
    updateCandidates: updates.length,
    skipped: skipped.length,
    applied,
    summary: summarize(results),
    updates: updates.map(item => ({
      id: item.row.id,
      community_id: item.row.community_id,
      perfil: item.row.perfil,
      old_serie: item.row.serie,
      old_turma: item.row.turma,
      serie: item.serie,
      turma: item.turma,
      source: item.source,
    })),
    skippedRows: skipped.map(item => ({
      id: item.row.id,
      community_id: item.row.community_id,
      perfil: item.row.perfil,
      reason: item.reason,
      relatedCount: item.relatedCount,
      source: item.source,
    })),
  }, null, 2))

  console.log(JSON.stringify({
    mode: APPLY ? 'apply' : 'dry-run',
    totalMissingFetched: rows.length,
    updateCandidates: updates.length,
    skipped: skipped.length,
    applied,
    summary: summarize(results),
    report: outPath,
  }, null, 2))
}

main().catch(error => {
  console.error(error)
  process.exit(1)
})
