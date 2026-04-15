// ─── Layers Hub API — enriquecimento de perfil do usuário ────────────────────
//
// Documentação completa: docs/layers-api.md
// Auth: Bearer LAYERS_API_TOKEN (env var) + community-id header
// Base URL: https://api.layers.digital

import { unstable_cache } from 'next/cache'

const BASE_URL = 'https://api.layers.digital'

export interface LayersUserProfile {
  nome:      string
  perfil:    'responsavel' | 'aluno'
  nomeAluno: string
  serie:     string
}

function mapRole(roles: string[][]): 'responsavel' | 'aluno' {
  const flat = roles.flat()
  if (flat.includes('student')) return 'aluno'
  return 'responsavel'
}

async function fetchSerie(
  entityId: string,
  headers: Record<string, string>,
): Promise<string> {
  try {
    // 1. Busca matrículas ativas da comunidade e filtra pelo membro
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

    // 2. Busca o grupo para obter o alias (série)
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

// ── Função interna (não-cacheada) para o fetch real ───────────────────────────
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
    // 1. Dados do usuário (nome + roles)
    const userRes = await fetch(`${BASE_URL}/v1/users/${userId}`, {
      headers,
      signal: AbortSignal.timeout(5_000),
    })
    if (!userRes.ok) return null

    const user = await userRes.json() as {
      name?: string
      roles?: string[][]
      [key: string]: unknown
    }

    // TODO: remover após diagnóstico — ver quais campos a Layers retorna
    console.log('[layers-hub] user payload:', JSON.stringify(user))

    const perfil = mapRole(user.roles ?? [])
    let nomeAluno = ''
    let serie     = ''

    if (perfil === 'responsavel') {
      // 2a. Responsável → busca aluno relacionado
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

        // 2b. Série do aluno via enrollment → group
        if (student?._id) {
          serie = await fetchSerie(student._id, headers)
        }
      }
    } else {
      // 3. Aluno → série via próprio enrollment
      serie = await fetchSerie(userId, headers)
    }

    return {
      nome: user.name ?? '',
      perfil,
      nomeAluno,
      serie,
    }
  } catch {
    return null
  }
}

// ── Versão cacheada com TTL de 30 minutos ────────────────────────────────────
// Reduz 4 chamadas HTTP externas por usuário a 1 chamada a cada 30 minutos.
const _fetchLayersUserCached = unstable_cache(
  _fetchLayersUserUncached,
  ['layers-user'], // Identificador do cache
  { revalidate: 1800 } // 30 minutos = 1800 segundos
)

export async function fetchLayersUser(
  userId: string,
  communityId: string,
): Promise<LayersUserProfile | null> {
  return _fetchLayersUserCached(userId, communityId)
}
