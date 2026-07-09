// ─── Layers Hub API — enriquecimento de perfil do usuário ────────────────────
//
// Auth: Bearer LAYERS_API_TOKEN (env var) + community-id header
// Base URL: https://api.layers.digital

import { unstable_cache } from 'next/cache'

const BASE_URL = 'https://api.layers.digital'

export interface LayersUserProfile {
  nome:      string
  perfil:    'responsavel' | 'aluno' | 'colaborador'
  nomeAluno: string
  serie:     string
  turma:     string
  email:     string
  meta: {
    roles:       string[]
    lastSeenAt:  string | null
    groupsIds:   string[]
    membersId:   string[]
    address:     Record<string, string | null>
    fields:      Record<string, unknown>
  }
}
export interface LayersRelatedGroup {
  _id?: string
  id?: string
  name?: string
  alias?: string
  type?: string
  season?: string
}

export interface LayersRelatedMember {
  _id?: string
  name?: string
  groups?: LayersRelatedGroup[]
}

function normalizeGroupText(value: string | null | undefined): string {
  return (value ?? '').trim()
}

function isLikelySerie(group: LayersRelatedGroup): boolean {
  const text = `${group.name ?? ''} ${group.alias ?? ''}`.toLowerCase()
  return /\b(ano|serie|ensino|fundamental|medio|infantil)\b/.test(text)
    || /^\s*\d{4}\s*[-]/.test(group.name ?? '')
}

export function extractSerieTurmaFromGroups(groups: LayersRelatedGroup[] | null | undefined): { serie: string; turma: string } {
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

function formatStudentNameList(names: string[]): string {
  const cleanNames = names.map(name => name.trim()).filter(Boolean)
  if (cleanNames.length === 0) return ''
  if (cleanNames.length === 1) return cleanNames[0]
  if (cleanNames.length === 2) return `${cleanNames[0]} e ${cleanNames[1]}`
  return `${cleanNames.slice(0, -1).join(', ')} e ${cleanNames[cleanNames.length - 1]}`
}

export function summarizeRelatedStudents(
  members: LayersRelatedMember[] | null | undefined,
): { nomeAluno: string; serie: string; turma: string; primaryStudentId?: string } {
  const students = (members ?? []).filter(member => member.name?.trim() || member._id)
  if (students.length === 0) {
    return { nomeAluno: '', serie: '', turma: '' }
  }

  if (students.length > 1) {
    return {
      nomeAluno: formatStudentNameList(students.map(student => student.name ?? '')),
      serie: '',
      turma: '',
    }
  }

  const student = students[0]
  const groupInfo = extractSerieTurmaFromGroups(student.groups)
  return {
    nomeAluno: student.name ?? '',
    serie: groupInfo.serie,
    turma: groupInfo.turma,
    primaryStudentId: student._id,
  }
}
// Roles da Layers que correspondem a responsáveis familiares (confirmado via API)
const RESPONSAVEL_ROLES = new Set([
  'guardian',
  'father',
  'mother',
  'financial_responsible',
  'academic_responsible',
])

// Retorna null para roles sem vínculo familiar (admin puro, teacher, coordinator, etc.)
// Lógica: student → aluno; qualquer role de responsável (mesmo junto com admin) → responsavel; resto → null
function mapRole(roles: string[]): 'responsavel' | 'aluno' | null {
  if (roles.includes('student')) return 'aluno'
  if (roles.some(r => RESPONSAVEL_ROLES.has(r))) return 'responsavel'
  return null
}

async function fetchSerie(
  entityId: string,
  headers: Record<string, string>,
): Promise<{ serie: string; turma: string }> {
  try {
    const enrollRes = await fetch(`${BASE_URL}/v1/enrollments/search?active=true`, {
      headers,
      signal: AbortSignal.timeout(5_000),
    })
    if (!enrollRes.ok) return { serie: '', turma: '' }

    const enrollData = await enrollRes.json() as {
      hits?: { entity?: string; group?: string }[]
    }

    const groupId = enrollData.hits?.find(e => e.entity === entityId)?.group
    if (!groupId) return { serie: '', turma: '' }

    const groupRes = await fetch(`${BASE_URL}/v1/groups/${groupId}`, {
      headers,
      signal: AbortSignal.timeout(5_000),
    })
    if (!groupRes.ok) return { serie: '', turma: '' }

    const group = await groupRes.json() as { alias?: string; name?: string }
    return { serie: group.name || group.alias || '', turma: group.alias && group.alias !== group.name ? group.alias : '' }
  } catch {
    return { serie: '', turma: '' }
  }
}

async function _fetchLayersUserUncached(
  userId: string,
  communityId: string,
): Promise<LayersUserProfile | null> {
  const token = process.env.LAYERS_API_TOKEN

  if (!token || !userId || !communityId) return null

  const headers = {
    'Authorization': `Bearer ${token}`,
    'community-id':  communityId,
  }

  try {
    const userRes = await fetch(`${BASE_URL}/v1/users/${userId}`, {
      headers,
      signal: AbortSignal.timeout(5_000),
    })
    if (!userRes.ok) return null

    const user = await userRes.json() as {
      name?:       string
      email?:      string
      roles?:      string[]
      lastSeenAt?: string | null
      groupsIds?:  string[]
      membersId?:  string[]
      address?:    Record<string, string | null>
      fields?:     Record<string, unknown>
    }

    const perfil = mapRole(user.roles ?? [])
    if (perfil === null) return null  // sem role familiar — não é respondente válido

    let nomeAluno = ''
    let serie     = ''
    let turma     = ''

    if (perfil === 'responsavel') {
      const relRes = await fetch(`${BASE_URL}/v1/users/${userId}/related`, {
        headers,
        signal: AbortSignal.timeout(5_000),
      })
      if (relRes.ok) {
        const rel = await relRes.json() as {
          members?: LayersRelatedMember[]
        }
        const related = summarizeRelatedStudents(rel.members)
        nomeAluno = related.nomeAluno
        serie = related.serie
        turma = related.turma
        if (related.primaryStudentId && !serie) {
          const fallback = await fetchSerie(related.primaryStudentId, headers)
          serie = fallback.serie
          turma = fallback.turma
        }
      }
    } else {
      const fallback = await fetchSerie(userId, headers)
      serie = fallback.serie
      turma = fallback.turma
    }

    return {
      nome:      user.name  ?? '',
      email:     user.email ?? '',
      perfil,
      nomeAluno,
      serie,
      turma,
      meta: {
        roles:      user.roles      ?? [],
        lastSeenAt: user.lastSeenAt ?? null,
        groupsIds:  user.groupsIds  ?? [],
        membersId:  user.membersId  ?? [],
        address:    user.address    ?? {},
        fields:     user.fields     ?? {},
      },
    }
  } catch {
    return null
  }
}

// Cache de 30 minutos — reduz chamadas à Layers API
const _fetchLayersUserCached = unstable_cache(
  _fetchLayersUserUncached,
  ['layers-user'],
  { revalidate: 1800 }
)

export async function fetchLayersUser(
  userId: string,
  communityId: string,
): Promise<LayersUserProfile | null> {
  return _fetchLayersUserCached(userId, communityId)
}

// Variante que aceita qualquer role da Layers (admin, teacher, etc.)
// Usada em surveys com settings.allow_all_roles = true
async function _fetchLayersUserAnyRoleUncached(
  userId: string,
  communityId: string,
): Promise<LayersUserProfile | null> {
  const token = process.env.LAYERS_API_TOKEN
  if (!token || !userId || !communityId) return null

  const headers = {
    'Authorization': `Bearer ${token}`,
    'community-id':  communityId,
  }

  try {
    const userRes = await fetch(`${BASE_URL}/v1/users/${userId}`, {
      headers,
      signal: AbortSignal.timeout(5_000),
    })
    if (!userRes.ok) return null

    const user = await userRes.json() as {
      name?:       string
      email?:      string
      roles?:      string[]
      lastSeenAt?: string | null
      groupsIds?:  string[]
      membersId?:  string[]
      address?:    Record<string, string | null>
      fields?:     Record<string, unknown>
    }

    const mappedPerfil = mapRole(user.roles ?? [])
    const perfil: LayersUserProfile['perfil'] = mappedPerfil ?? 'colaborador'

    let nomeAluno = ''
    let serie     = ''
    let turma     = ''

    if (perfil === 'responsavel') {
      const relRes = await fetch(`${BASE_URL}/v1/users/${userId}/related`, {
        headers,
        signal: AbortSignal.timeout(5_000),
      })
      if (relRes.ok) {
        const rel = await relRes.json() as { members?: LayersRelatedMember[] }
        const related = summarizeRelatedStudents(rel.members)
        nomeAluno = related.nomeAluno
        serie = related.serie
        turma = related.turma
        if (related.primaryStudentId && !serie) {
          const fallback = await fetchSerie(related.primaryStudentId, headers)
          serie = fallback.serie
          turma = fallback.turma
        }
      }
    } else if (perfil === 'aluno') {
      const fallback = await fetchSerie(userId, headers)
      serie = fallback.serie
      turma = fallback.turma
    }
    // colaborador: sem lookup extra

    return {
      nome:      user.name  ?? '',
      email:     user.email ?? '',
      perfil,
      nomeAluno,
      serie,
      turma,
      meta: {
        roles:      user.roles      ?? [],
        lastSeenAt: user.lastSeenAt ?? null,
        groupsIds:  user.groupsIds  ?? [],
        membersId:  user.membersId  ?? [],
        address:    user.address    ?? {},
        fields:     user.fields     ?? {},
      },
    }
  } catch {
    return null
  }
}

const _fetchLayersUserAnyRoleCached = unstable_cache(
  _fetchLayersUserAnyRoleUncached,
  ['layers-user-any-role'],
  { revalidate: 1800 }
)

export async function fetchLayersUserAnyRole(
  userId: string,
  communityId: string,
): Promise<LayersUserProfile | null> {
  return _fetchLayersUserAnyRoleCached(userId, communityId)
}

export async function fetchLayersUserByEmail(
  communityId: string,
  email: string,
): Promise<string | null> {
  const profile = await fetchLayersUserProfileByEmail(communityId, email)
  return profile?.id ?? null
}

// Retorna id + dados completos do usuário pela mesma chamada — zero custo extra.
// Usado pelo resolve de amostra para salvar nome/nomeAluno/serie junto com layers_user_id.
export async function fetchLayersUserProfileByEmail(
  communityId: string,
  email: string,
): Promise<{ id: string; name: string; perfil: 'responsavel' | 'aluno' | 'colaborador' } | null> {
  const token = process.env.LAYERS_API_TOKEN

  if (!token || !communityId || !email) return null

  const headers = {
    'Authorization': `Bearer ${token}`,
    'community-id':  communityId,
  }

  try {
    const res = await fetch(
      `${BASE_URL}/v1/users?email=${encodeURIComponent(email)}&active=true&limit=1`,
      {
        headers,
        signal: AbortSignal.timeout(3_000),
      }
    )
    if (!res.ok) return null

    const data = await res.json() as
      | { _id?: string; name?: string; roles?: string[]; hits?: { _id?: string; name?: string; roles?: string[] }[] }
      | { _id?: string; name?: string; roles?: string[] }[]

    let userId: string | undefined
    let name: string = ''
    let roles: string[] = []

    if (Array.isArray(data)) {
      userId = data[0]?._id
      name   = data[0]?.name  ?? ''
      roles  = data[0]?.roles ?? []
    } else {
      const hit = data.hits?.[0]
      userId = hit?._id || data._id
      name   = hit?.name  ?? (data as { name?: string }).name   ?? ''
      roles  = hit?.roles ?? (data as { roles?: string[] }).roles ?? []
    }

    if (!userId) return null

    const mapped = mapRole(roles)
    const perfil: 'responsavel' | 'aluno' | 'colaborador' = mapped ?? 'colaborador'

    return { id: userId, name, perfil }
  } catch {
    return null
  }
}
