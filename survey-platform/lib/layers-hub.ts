// ─── Layers Hub API — enriquecimento de perfil do usuário ────────────────────
//
// Auth: Bearer LAYERS_API_TOKEN (env var) + community-id header
// Base URL: https://api.layers.digital

import { unstable_cache } from 'next/cache'

const BASE_URL = 'https://api.layers.digital'

export interface LayersUserProfile {
  nome:      string
  perfil:    'responsavel' | 'aluno'
  nomeAluno: string
  serie:     string
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
): Promise<string> {
  try {
    const enrollRes = await fetch(`${BASE_URL}/v1/enrollments/search?active=true`, {
      headers,
      signal: AbortSignal.timeout(5_000),
    })
    if (!enrollRes.ok) return ''

    const enrollData = await enrollRes.json() as {
      hits?: { entity?: string; group?: string }[]
    }

    const groupId = enrollData.hits?.find(e => e.entity === entityId)?.group
    if (!groupId) return ''

    const groupRes = await fetch(`${BASE_URL}/v1/groups/${groupId}`, {
      headers,
      signal: AbortSignal.timeout(5_000),
    })
    if (!groupRes.ok) return ''

    const group = await groupRes.json() as { alias?: string; name?: string }
    return group.alias || group.name || ''
  } catch {
    return ''
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

    if (perfil === 'responsavel') {
      const relRes = await fetch(`${BASE_URL}/v1/users/${userId}/related`, {
        headers,
        signal: AbortSignal.timeout(5_000),
      })
      if (relRes.ok) {
        const rel = await relRes.json() as {
          members?: { _id?: string; name?: string }[]
        }
        const student = rel.members?.[0]
        nomeAluno = student?.name ?? ''
        if (student?._id) {
          serie = await fetchSerie(student._id, headers)
        }
      }
    } else {
      serie = await fetchSerie(userId, headers)
    }

    return {
      nome:      user.name  ?? '',
      email:     user.email ?? '',
      perfil,
      nomeAluno,
      serie,
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
): Promise<{ id: string; name: string } | null> {
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
      | { _id?: string; name?: string; hits?: { _id?: string; name?: string }[] }
      | { _id?: string; name?: string }[]

    // Trata 3 formatos possíveis da Layers Hub API:
    // 1. Array direto: [{ _id, name, ... }]
    // 2. Objeto paginado: { hits: [{ _id, name }] }
    // 3. Objeto único: { _id, name }
    let userId: string | undefined
    let name: string = ''

    if (Array.isArray(data)) {
      userId = data[0]?._id
      name   = data[0]?.name ?? ''
    } else {
      const hit = data.hits?.[0]
      userId = hit?._id || data._id
      name   = hit?.name ?? (data as { name?: string }).name ?? ''
    }

    return userId ? { id: userId, name } : null
  } catch {
    return null
  }
}
