// ─── Layers Notifications API — cliente de disparo ───────────────────────────
//
// Endpoint: POST https://api.layers.digital/v2/notification/send
// Auth: Bearer LAYERS_API_TOKEN + community-id header
// Docs: docs/layers-notifications.md

import { createServiceClient } from './supabase-service'

const LAYERS_BASE_URL = 'https://api.layers.digital'
const PORTAL_ALIAS    = '@raizeducacao:pesquisa'

// ─── Tipos ────────────────────────────────────────────────────────────────────

export type TargetScope = 'all' | 'communities' | 'group'
export type TargetRole  = 'guardian' | 'student' | 'admin'
export type Channel     = 'pushNotification' | 'email'

export interface DispatchRecord {
  id:                   string
  survey_id:            string
  title:                string
  body:                 string
  push_title:           string | null
  push_body:            string | null
  email_title:          string | null
  email_body:           string | null
  email_action_label:   string
  email_background_url: string | null
  channels:             Channel[]
  target_scope:         TargetScope
  target_community_ids: string[] | null
  target_group_alias:   string | null
  target_roles:         TargetRole[]
}

interface LayersTopic {
  kind:   'user' | 'member' | 'group'
  alias?: string
  email?: string
  id?:    string
}

interface LayersPayload {
  targets: {
    topics: LayersTopic[]
    roles:  TargetRole[]
  }
  title:        string
  body:         string
  action: {
    type:        'portal'
    portalAlias: string
    path:        string
  }
  channels?: {
    pushNotification?: { title: string; body: string }
    email?: {
      title:           string
      body:            string
      actionLabel?:    string
      backgroundUrl?:  string
    }
  }
}

export interface JobResult {
  communityId: string
  success:     boolean
  response?:   unknown
  error?:      string
}

export interface DispatchResult {
  sent:   number
  failed: number
  jobs:   JobResult[]
}

// ─── resolveTargetCommunities ─────────────────────────────────────────────────
//
// Retorna a lista de community IDs a serem notificadas baseado no scope.

export async function resolveTargetCommunities(
  surveyId:    string,
  scope:       TargetScope,
  communityIds?: string[] | null,
): Promise<string[]> {
  if (scope === 'communities' && communityIds && communityIds.length > 0) {
    return communityIds
  }

  if (scope === 'group' && communityIds && communityIds.length > 0) {
    // group scope sempre tem exatamente 1 comunidade
    return [communityIds[0]]
  }

  // scope === 'all' — busca todas as instalações ativas da survey
  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('survey_communities')
    .select('community_id')
    .eq('survey_id', surveyId)
    .eq('active', true)

  if (error || !data) return []
  return data.map((r: { community_id: string }) => r.community_id)
}

// ─── buildNotificationPayload ─────────────────────────────────────────────────
//
// Monta o payload da Layers API para uma comunidade específica.

export function buildNotificationPayload(
  dispatch:    DispatchRecord,
  communityId: string,
): LayersPayload {
  // Segmentação: group alias específico ou "all" para a comunidade toda
  const topic: LayersTopic =
    dispatch.target_scope === 'group' && dispatch.target_group_alias
      ? { kind: 'group', alias: dispatch.target_group_alias }
      : { kind: 'group', alias: 'all' }

  const payload: LayersPayload = {
    targets: {
      topics: [topic],
      roles:  dispatch.target_roles,
    },
    title:  dispatch.title,
    body:   dispatch.body,
    action: {
      type:        'portal',
      portalAlias: PORTAL_ALIAS,
      path:        '/',
    },
  }

  // Canais com overrides por canal (fallback para title/body raiz)
  const channels: LayersPayload['channels'] = {}

  if (dispatch.channels.includes('pushNotification')) {
    channels.pushNotification = {
      title: dispatch.push_title ?? dispatch.title,
      body:  dispatch.push_body  ?? dispatch.body,
    }
  }

  if (dispatch.channels.includes('email')) {
    const emailChannel: NonNullable<LayersPayload['channels']>['email'] = {
      title: dispatch.email_title ?? dispatch.title,
      body:  dispatch.email_body  ?? dispatch.body,
    }
    if (dispatch.email_action_label) {
      emailChannel.actionLabel = dispatch.email_action_label
    }
    if (dispatch.email_background_url) {
      emailChannel.backgroundUrl = dispatch.email_background_url
    }
    channels.email = emailChannel
  }

  if (Object.keys(channels).length > 0) {
    payload.channels = channels
  }

  return payload
}

// ─── sendToOneCommunity ───────────────────────────────────────────────────────
//
// Faz o POST para a Layers API e retorna o resultado.

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

// ─── executeDispatch ──────────────────────────────────────────────────────────
//
// Processa todos os jobs pendentes de um dispatch.
// Chamado diretamente para disparos imediatos e pelo cron para agendados.

export async function executeDispatch(dispatchId: string): Promise<DispatchResult> {
  const supabase = createServiceClient()

  // Busca dispatch + jobs pendentes
  const { data: dispatch } = await supabase
    .from('survey_dispatches')
    .select('*')
    .eq('id', dispatchId)
    .single()

  if (!dispatch) {
    return { sent: 0, failed: 0, jobs: [] }
  }

  const { data: jobs } = await supabase
    .from('survey_dispatch_jobs')
    .select('*')
    .eq('dispatch_id', dispatchId)
    .eq('status', 'pending')

  if (!jobs || jobs.length === 0) {
    return { sent: 0, failed: 0, jobs: [] }
  }

  // Marca dispatch como 'sending'
  await supabase
    .from('survey_dispatches')
    .update({ status: 'sending', started_at: new Date().toISOString() })
    .eq('id', dispatchId)

  // Executa todos os jobs em paralelo
  const results = await Promise.allSettled(
    jobs.map(async (job: { id: string; community_id: string }) => {
      const payload = buildNotificationPayload(dispatch as DispatchRecord, job.community_id)

      // Marca job como 'sending'
      await supabase
        .from('survey_dispatch_jobs')
        .update({ status: 'sending', layers_payload: payload })
        .eq('id', job.id)

      const result = await sendToOneCommunity(job.community_id, payload)

      // Atualiza job com resultado
      await supabase
        .from('survey_dispatch_jobs')
        .update({
          status:          result.success ? 'sent' : 'failed',
          layers_response: result.response ?? null,
          error:           result.error ?? null,
          sent_at:         result.success ? new Date().toISOString() : null,
          retry_count:     (job as { retry_count?: number }).retry_count ?? 0,
        })
        .eq('id', job.id)

      return result
    })
  )

  // Conta resultados
  const jobResults: JobResult[] = results.map(r =>
    r.status === 'fulfilled'
      ? r.value
      : { communityId: 'unknown', success: false, error: String(r.reason) }
  )

  const sent   = jobResults.filter(r => r.success).length
  const failed = jobResults.filter(r => !r.success).length

  // Determina status final do dispatch
  let finalStatus: string
  if (failed === 0)              finalStatus = 'sent'
  else if (sent === 0)           finalStatus = 'failed'
  else                           finalStatus = 'partial_failure'

  await supabase
    .from('survey_dispatches')
    .update({
      status:         finalStatus,
      completed_jobs: sent,
      failed_jobs:    failed,
      completed_at:   new Date().toISOString(),
    })
    .eq('id', dispatchId)

  return { sent, failed, jobs: jobResults }
}
