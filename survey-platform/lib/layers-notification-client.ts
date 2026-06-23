import type { JobResult, LayersPayload } from './layers-notification-payloads'

const LAYERS_BASE_URL = 'https://api.layers.digital'

export async function sendToOneCommunity(
  communityId: string,
  payload:     LayersPayload,
): Promise<JobResult> {
  const token = process.env.LAYERS_API_TOKEN
  if (!token) {
    return { communityId, success: false, error: 'LAYERS_API_TOKEN não configurado' }
  }

  try {
    const res = await fetch(`${LAYERS_BASE_URL}/v2/notification/send`, {
      method:  'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'community-id':  communityId,
        'Content-Type':  'application/json',
      },
      body:   JSON.stringify(payload),
      signal: AbortSignal.timeout(15_000),
    })

    const data = await res.json() as unknown

    if (!res.ok) {
      const errMsg = typeof data === 'object' && data !== null && 'error' in data
        ? String((data as { error: unknown }).error)
        : `HTTP ${res.status}`
      return { communityId, success: false, error: errMsg, response: data }
    }

    return { communityId, success: true, response: data }
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erro desconhecido'
    return { communityId, success: false, error: msg }
  }
}
