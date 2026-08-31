// Backfill de serie/turma/nome_aluno das sessões do CSAT (e de qualquer survey) via Layers API.
//
// Uso:
//   node scripts/backfill-csat-serie-turma.mjs --list                 → lista surveys (id, slug, título, sessões)
//   node scripts/backfill-csat-serie-turma.mjs --survey=<id>          → dry-run (relatório em ../tmp)
//   node scripts/backfill-csat-serie-turma.mjs --survey=<id> --apply  → aplica updates
//   Opcional: --limit=N
//
// Só preenche campos VAZIOS (nunca sobrescreve valor existente).
// Baseado em scripts/backfill-amostral2-serie-turma.mjs, com cache de enrollments/groups
// por comunidade (o CSAT tem ~1.2k linhas; sem cache seria 1 full-scan por linha).

import dotenv from 'dotenv'
import { createClient } from '@supabase/supabase-js'
import fs from 'node:fs'
import path from 'node:path'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const BASE_URL = 'https://api.layers.digital'
const APPLY = process.argv.includes('--apply')
const LIST = process.argv.includes('--list')
const SURVEY_ARG = process.argv.find(arg => arg.startsWith('--survey='))
const SURVEY_ID = SURVEY_ARG ? SURVEY_ARG.split('=')[1] : null
const LIMIT_ARG = process.argv.find(arg => arg.startsWith('--limit='))
const LIMIT = LIMIT_ARG ? Number(LIMIT_ARG.split('=')[1]) : null

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY
const LAYERS_TOKEN = process.env.LAYERS_API_TOKEN

if (!SUPABASE_URL || !SERVICE_ROLE || !LAYERS_TOKEN) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY or LAYERS_API_TOKEN')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } })

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
    signal: AbortSignal.timeout(15000),
  })
  if (!res.ok) return { ok: false, status: res.status, data: null }
  return { ok: true, status: res.status, data: await res.json() }
}

// ── Caches por comunidade ────────────────────────────────────────────────────
const enrollmentsCache = new Map()  // communityId → hits[] | null (falha)
const groupCache = new Map()        // communityId/groupId → group | null

async function getEnrollmentHits(communityId) {
  if (enrollmentsCache.has(communityId)) return enrollmentsCache.get(communityId)
  const enroll = await fetchJson(`${BASE_URL}/v1/enrollments/search?active=true`, communityId)
  const hits = enroll.ok && Array.isArray(enroll.data?.hits) ? enroll.data.hits : null
  enrollmentsCache.set(communityId, hits)
  return hits
}

async function getGroup(communityId, groupId) {
  const key = `${communityId}/${groupId}`
  if (groupCache.has(key)) return groupCache.get(key)
  const group = await fetchJson(`${BASE_URL}/v1/groups/${groupId}`, communityId)
  const data = group.ok ? group.data : null
  groupCache.set(key, data)
  return data
}

async function fetchGroupInfo(entityId, communityId) {
  const hits = await getEnrollmentHits(communityId)
  if (!hits) return { status: 'enrollments_failed', serie: '', turma: '' }

  const groups = hits.filter(item => item?.entity === entityId).map(item => item?.group).filter(Boolean)
  const uniqueGroups = [...new Set(groups)]

  if (uniqueGroups.length === 0) return { status: 'no_enrollment', serie: '', turma: '' }
  if (uniqueGroups.length > 1) return { status: 'multiple_enrollments', serie: '', turma: '' }

  const group = await getGroup(communityId, uniqueGroups[0])
  if (!group) return { status: 'group_failed', serie: '', turma: '' }

  const serie = normalizeGroupText(group.name || group.alias)
  const turma = normalizeGroupText(group.alias && group.alias !== group.name ? group.alias : '')
  return { status: serie || turma ? 'ok' : 'empty_group', serie, turma }
}

const blank = (v) => !(v ?? '').trim()

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

    const update = {}
    if (blank(row.serie) && serie) update.serie = serie
    if (blank(row.turma) && turma) update.turma = turma
    if (blank(row.nome_aluno) && student.name?.trim()) update.nome_aluno = student.name.trim()
    if (Object.keys(update).length === 0) return { action: 'skip', reason: 'nothing_to_fill', row, source }
    return { action: 'update', row, update, source }
  }

  if (row.perfil === 'aluno') {
    const update = {}
    let source = ''

    // O token atual tem só escopo users:* — /related do próprio aluno devolve o member
    // dele com groups embutidos (serie/turma) e nome. enrollments/groups ficam como
    // fallback (só funcionam se o token ganhar enrollment:read/group:read).
    const related = await fetchJson(`${BASE_URL}/v1/users/${row.user_id}/related`, row.community_id)
    const members = related.ok && Array.isArray(related.data?.members) ? related.data.members : []
    const self = members.length === 1 ? members[0] : null

    if (blank(row.serie) || blank(row.turma)) {
      let serie = ''
      let turma = ''
      if (self) {
        ;({ serie, turma } = extractSerieTurmaFromGroups(self.groups))
        if (serie || turma) source = 'own_related_groups'
      }
      if (!serie && !turma) {
        const fallback = await fetchGroupInfo(row.user_id, row.community_id)
        serie = fallback.serie
        turma = fallback.turma
        source = `student_${fallback.status}`
      }
      if (blank(row.serie) && serie) update.serie = serie
      if (blank(row.turma) && turma) update.turma = turma
    }

    // Nome do próprio aluno (export usa nome_aluno para userName)
    if (blank(row.nome_aluno)) {
      let name = (self?.name ?? '').trim()
      if (!name) {
        const user = await fetchJson(`${BASE_URL}/v1/users/${row.user_id}`, row.community_id)
        name = user.ok ? (user.data?.name ?? '').trim() : ''
      }
      if (name) update.nome_aluno = name
      source = source || 'user_name'
    }

    if (Object.keys(update).length === 0) return { action: 'skip', reason: source || 'nothing_to_fill', row }
    return { action: 'update', row, update, source }
  }

  return { action: 'skip', reason: `perfil_${row.perfil || 'empty'}`, row }
}

async function fetchAllSessions(surveyId) {
  const pageSize = 1000
  const rows = []
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await supabase
      .from('response_sessions')
      .select('id, survey_id, community_id, user_id, email, perfil, nome_aluno, serie, turma, submitted_at')
      .eq('survey_id', surveyId)
      .order('submitted_at', { ascending: true })
      .range(from, from + pageSize - 1)
    if (error) throw error
    rows.push(...(data ?? []))
    if (!data || data.length < pageSize) break
  }
  return rows
}

async function listSurveys() {
  const { data, error } = await supabase
    .from('surveys')
    .select('id, slug, title, status')
    .order('created_at', { ascending: false })
  if (error) throw error
  for (const s of data ?? []) {
    const { count } = await supabase
      .from('response_sessions')
      .select('id', { count: 'exact', head: true })
      .eq('survey_id', s.id)
    console.log(`${s.id}  [${s.status}]  ${s.slug}  "${s.title}"  sessões=${count}`)
  }
}

async function applyUpdates(updates, surveyId) {
  let applied = 0
  for (const item of updates) {
    const { error } = await supabase
      .from('response_sessions')
      .update(item.update)
      .eq('id', item.row.id)
      .eq('survey_id', surveyId)
    if (error) throw error
    applied++
  }
  return applied
}

function summarize(results) {
  const byAction = {}, byReason = {}, bySource = {}, byPerfil = {}, fieldsFilled = {}
  for (const item of results) {
    byAction[item.action] = (byAction[item.action] ?? 0) + 1
    byPerfil[item.row.perfil || ''] = (byPerfil[item.row.perfil || ''] ?? 0) + 1
    if (item.reason) byReason[item.reason] = (byReason[item.reason] ?? 0) + 1
    if (item.source) bySource[item.source] = (bySource[item.source] ?? 0) + 1
    if (item.update) for (const k of Object.keys(item.update)) fieldsFilled[k] = (fieldsFilled[k] ?? 0) + 1
  }
  return { byAction, byReason, bySource, byPerfil, fieldsFilled }
}

async function main() {
  if (LIST) return listSurveys()
  if (!SURVEY_ID) {
    console.error('Informe --survey=<id> (ou --list para descobrir os ids)')
    process.exit(1)
  }

  const all = await fetchAllSessions(SURVEY_ID)
  // Só linhas com algo a preencher
  let rows = all.filter(r =>
    blank(r.serie) || blank(r.turma) || (r.perfil === 'aluno' && blank(r.nome_aluno)))
  if (LIMIT) rows = rows.slice(0, LIMIT)
  console.error(`sessões: ${all.length} | com campo vazio: ${rows.length}`)

  // Dedup por (community,user): resolve uma vez, aplica em todas as sessões do par
  const resolutionCache = new Map()
  const results = []
  for (let index = 0; index < rows.length; index++) {
    const row = rows[index]
    const key = `${row.community_id}/${row.user_id}/${row.perfil}`
    let resolved = resolutionCache.get(key)
    if (!resolved) {
      resolved = await resolveRow(row)
      resolutionCache.set(key, resolved)
    } else if (resolved.action === 'update') {
      // recalcula o update para os campos vazios DESTA linha
      const update = {}
      for (const [k, v] of Object.entries(resolved.update)) if (blank(row[k])) update[k] = v
      resolved = Object.keys(update).length
        ? { action: 'update', row, update, source: resolved.source }
        : { action: 'skip', reason: 'nothing_to_fill', row, source: resolved.source }
    }
    results.push({ ...resolved, row })
    if ((index + 1) % 50 === 0 || index + 1 === rows.length) {
      console.error(`processadas ${index + 1}/${rows.length}`)
    }
  }

  const updates = results.filter(item => item.action === 'update')
  const skipped = results.filter(item => item.action !== 'update')
  const applied = APPLY ? await applyUpdates(updates, SURVEY_ID) : 0

  const outDir = path.resolve(process.cwd(), '..', 'tmp')
  fs.mkdirSync(outDir, { recursive: true })
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
  const outPath = path.join(outDir, `csat-serie-turma-${APPLY ? 'apply' : 'dry-run'}-${timestamp}.json`)

  fs.writeFileSync(outPath, JSON.stringify({
    surveyId: SURVEY_ID,
    mode: APPLY ? 'apply' : 'dry-run',
    totalSessions: all.length,
    withMissingFields: rows.length,
    updateCandidates: updates.length,
    skipped: skipped.length,
    applied,
    summary: summarize(results),
    updates: updates.map(item => ({
      id: item.row.id,
      community_id: item.row.community_id,
      perfil: item.row.perfil,
      old: { serie: item.row.serie, turma: item.row.turma, nome_aluno: item.row.nome_aluno },
      update: item.update,
      source: item.source,
    })),
    skippedRows: skipped.map(item => ({
      id: item.row.id,
      community_id: item.row.community_id,
      perfil: item.row.perfil,
      reason: item.reason,
      relatedCount: item.relatedCount,
    })),
  }, null, 2))

  console.log(JSON.stringify({
    mode: APPLY ? 'apply' : 'dry-run',
    totalSessions: all.length,
    withMissingFields: rows.length,
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
