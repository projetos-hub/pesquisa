// Client para a Layers Education Open API
// Docs: https://developers.layers.education/open-api/data/

const LAYERS_API_BASE = 'https://api.layers.digital'

function getToken(): string {
  const token = process.env.LAYERS_API_TOKEN
  if (!token) throw new Error('LAYERS_API_TOKEN não configurado')
  return token
}

function layersHeaders(communityId: string) {
  return {
    'Authorization': `Bearer ${getToken()}`,
    'community-id': communityId,
    'Content-Type': 'application/json',
  }
}

export interface LayersGroup {
  _id: string
  name: string
  alias: string
  season: string
  active: boolean
  tags: string[]
  admins: { user: string }[]
}

export interface LayersEnrollment {
  _id: string
  entity: string
  group: string
  active: boolean
  kind: string
}

export interface LayersNotificationTarget {
  kind: 'group' | 'user'
  id?: string
  email?: string
  alias?: string
  roles?: string[]
}

export interface LayersNotificationPayload {
  title: string
  description: string
  targets: LayersNotificationTarget[]
  action?: { type: 'external'; url: string }
  scheduleDate?: string
  channels?: ('push' | 'email')[]
}

// Lista turmas ativas de uma comunidade
export async function getGroups(communityId: string, season?: string): Promise<LayersGroup[]> {
  const params = new URLSearchParams({ active: 'true' })
  if (season) params.set('season', season)

  const res = await fetch(`${LAYERS_API_BASE}/v1/groups?${params}`, {
    headers: layersHeaders(communityId),
    signal: AbortSignal.timeout(10_000),
  })
  if (!res.ok) throw new Error(`Layers API groups error: ${res.status}`)
  return res.json() as Promise<LayersGroup[]>
}

// Lista matrículas de uma turma (para estimar alcance)
export async function getEnrollments(communityId: string, groupId: string): Promise<LayersEnrollment[]> {
  const res = await fetch(`${LAYERS_API_BASE}/v1/enrollments?group=${groupId}&active=true`, {
    headers: layersHeaders(communityId),
    signal: AbortSignal.timeout(10_000),
  })
  if (!res.ok) throw new Error(`Layers API enrollments error: ${res.status}`)
  return res.json() as Promise<LayersEnrollment[]>
}

// Dispara notificação push+email para uma lista de alvos
export async function sendNotification(
  communityId: string,
  payload: LayersNotificationPayload
): Promise<{ ok: boolean; response: unknown }> {
  const res = await fetch(`${LAYERS_API_BASE}/v2/notification/send`, {
    method: 'POST',
    headers: layersHeaders(communityId),
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(15_000),
  })
  const data = await res.json().catch(() => ({})) as unknown
  return { ok: res.ok, response: data }
}
