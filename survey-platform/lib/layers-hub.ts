// ─── Layers Hub API — enriquecimento de perfil do usuário ────────────────────
//
// Documentação completa: docs/layers-api.md
// Auth: Bearer LAYERS_API_TOKEN (env var) + community-id header
// Base URL: https://api.layers.digital

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

export async function fetchLayersUser(
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
    }

    const perfil = mapRole(user.roles ?? [])
    let nomeAluno = ''

    // 2. Se responsável, busca aluno relacionado
    if (perfil === 'responsavel') {
      const relRes = await fetch(`${BASE_URL}/v1/users/${userId}/related`, {
        headers,
        signal: AbortSignal.timeout(5_000),
      })

      if (relRes.ok) {
        const rel = await relRes.json() as { members?: { name?: string }[] }
        nomeAluno = rel.members?.[0]?.name ?? ''
      }
    }

    return {
      nome:      user.name  ?? '',
      perfil,
      nomeAluno,
      serie:     '',  // requer lookup de enrollment + group — não implementado
    }
  } catch {
    return null
  }
}
