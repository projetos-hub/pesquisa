// ─── Layers Notifications API — cliente de disparo ───────────────────────────
//
// Endpoint: POST https://api.layers.digital/v2/notification/send
// Auth: Bearer LAYERS_API_TOKEN + community-id header
// Docs: docs/layers-notifications.md

import { createServiceClient } from './supabase-service'
import { fetchLayersUser }    from './layers-hub'

// Delay entre chamadas no modo personalizado (ms) — evita rate limit
const PERSONALIZED_DELAY_MS = 150
// Máximo de usuários processados por execução de cron no modo personalizado
const PERSONALIZED_BATCH_SIZE = 30

const LAYERS_BASE_URL = 'https://api.layers.digital'
const PORTAL_ALIAS    = '@raizeducacao:pesquisa'

// ─── Tipos ────────────────────────────────────────────────────────────────────

export type TargetScope = 'all' | 'communities' | 'group' | 'sample'
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
  personalized:         boolean
}

interface LayersUserListItem {
  _id:       string
  name?:     string
  email?:    string
  roles?:    string[]
  membersId?: string[]
}

interface PersonalizedVars {
  nome:       string
  nomeAluno:  string
  nomeEscola: string
  serie:      string
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

  const supabase = createServiceClient()

  // scope === 'sample' — retorna comunidades que têm entradas na amostra
  if (scope === 'sample') {
    const { data } = await supabase
      .from('survey_sample_lists')
      .select('community_id')
      .eq('survey_id', surveyId)
      .not('layers_user_id', 'is', null)

    if (!data) return []
    const unique = [...new Set(data.map((r: { community_id: string }) => r.community_id))]
    return unique
  }

  // scope === 'all' — busca todas as instalações ativas da survey
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

// ─── fetchCommunityUsers ──────────────────────────────────────────────────────
//
// Busca usuários de uma comunidade via Layers Hub API com paginação.

async function fetchCommunityUsers(
  communityId: string,
  roles: TargetRole[],
  limit = 200,
  offset = 0,
): Promise<{ users: LayersUserListItem[]; total: number }> {
  const token = process.env.LAYERS_API_TOKEN
  if (!token) return { users: [], total: 0 }

  try {
    const params = new URLSearchParams({
      active: 'true',
      limit:  String(limit),
      offset: String(offset),
    })
    // Filtra por role se não for 'all'
    if (roles.length > 0 && !(roles.includes('guardian') && roles.includes('student') && roles.includes('admin'))) {
      params.set('role', roles[0]) // Layers aceita um role por vez
    }

    const res = await fetch(`${LAYERS_BASE_URL}/v1/users?${params}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'community-id':  communityId,
      },
      signal: AbortSignal.timeout(10_000),
    })

    if (!res.ok) return { users: [], total: 0 }

    const data = await res.json() as unknown
    if (Array.isArray(data)) {
      return { users: data as LayersUserListItem[], total: (data as unknown[]).length }
    }
    if (typeof data === 'object' && data !== null) {
      const d = data as { hits?: LayersUserListItem[]; total?: number }
      return { users: d.hits ?? [], total: d.total ?? 0 }
    }
    return { users: [], total: 0 }
  } catch {
    return { users: [], total: 0 }
  }
}

// ─── interpolatePlaceholders ──────────────────────────────────────────────────
//
// Substitui {{variavel}} no texto pelos dados do usuário.
// Fallbacks garantem que a mensagem sempre faz sentido mesmo sem o dado.

function interpolatePlaceholders(text: string, vars: PersonalizedVars): string {
  return text
    .replace(/\{\{nome\}\}/g,       vars.nome       || 'você')
    .replace(/\{\{nomeAluno\}\}/g,  vars.nomeAluno  || 'seu filho(a)')
    .replace(/\{\{nomeEscola\}\}/g, vars.nomeEscola || 'a escola')
    .replace(/\{\{serie\}\}/g,      vars.serie      || 'a turma')
}

// ─── buildPersonalizedPayload ─────────────────────────────────────────────────
//
// Monta payload personalizado para um usuário específico.

function buildPersonalizedPayload(
  dispatch:    DispatchRecord,
  communityId: string,
  user:        LayersUserListItem,
  nomeEscola:  string,
): LayersPayload {
  const vars: PersonalizedVars = {
    nome:       user.name?.split(' ')[0] ?? '',
    nomeAluno:  '',   // preenchido se for guardian
    nomeEscola,
    serie:      '',
  }

  const title = interpolatePlaceholders(dispatch.push_title ?? dispatch.title, vars)
  const body  = interpolatePlaceholders(dispatch.push_body  ?? dispatch.body,  vars)

  const payload: LayersPayload = {
    targets: {
      topics: [{ kind: 'user', id: user._id }],
      roles:  dispatch.target_roles,
    },
    title,
    body,
    action: {
      type:        'portal',
      portalAlias: PORTAL_ALIAS,
      path:        '/',
    },
  }

  const channels: LayersPayload['channels'] = {}

  if (dispatch.channels.includes('pushNotification')) {
    channels.pushNotification = { title, body }
  }

  if (dispatch.channels.includes('email')) {
    const emailTitle = interpolatePlaceholders(dispatch.email_title ?? dispatch.title, vars)
    const emailBody  = interpolatePlaceholders(dispatch.email_body  ?? dispatch.body,  vars)
    channels.email = {
      title:       emailTitle,
      body:        emailBody,
      actionLabel: dispatch.email_action_label || 'Responder Pesquisa',
      ...(dispatch.email_background_url ? { backgroundUrl: dispatch.email_background_url } : {}),
    }
  }

  if (Object.keys(channels).length > 0) payload.channels = channels

  return payload
}

// ─── executePersonalizedJobSample ────────────────────────────────────────────
//
// Processa disparo personalizado para amostra segmentada.
// Busca usuários de survey_sample_lists ao invés de Layers Hub API.
// Só dispara para entries com layers_user_id resolvido.

export async function executePersonalizedJobSample(
  jobId:       string,
  dispatch:    DispatchRecord,
  communityId: string,
): Promise<{ processed: number; failed: number; hasMore: boolean }> {
  const supabase = createServiceClient()

  // Busca nomeEscola do tema da community para o placeholder {{nomeEscola}}
  const { data: commRow } = await supabase
    .from('survey_communities')
    .select('theme')
    .eq('survey_id', dispatch.survey_id)
    .eq('community_id', communityId)
    .single()
  const communityNomeEscola = (commRow?.theme as { nomeEscola?: string } | null)?.nomeEscola ?? ''

  // Busca progresso atual do job
  const { data: job } = await supabase
    .from('survey_dispatch_jobs')
    .select('processed_users, failed_users, total_users')
    .eq('id', jobId)
    .single()

  const processedUsers = job?.processed_users ?? 0
  const failedUsers    = job?.failed_users    ?? 0
  // Avança o offset além de falhas — evita reprocessar entries que já falharam
  const offset         = processedUsers + failedUsers

  // Contar total de entries na amostra com layers_user_id resolvido (primeira execução)
  if (offset === 0) {
    const { count } = await supabase
      .from('survey_sample_lists')
      .select('*', { count: 'exact', head: true })
      .eq('survey_id', dispatch.survey_id)
      .eq('community_id', communityId)
      .not('layers_user_id', 'is', null)

    const total = count || 0
    if (total > 0) {
      await supabase
        .from('survey_dispatch_jobs')
        .update({ total_users: total, status: 'sending' })
        .eq('id', jobId)
    }
  }

  // Se target_group_alias contém um UUID de grupo de amostra, filtrar por membros do grupo
  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  const sampleGroupId = dispatch.target_group_alias && UUID_RE.test(dispatch.target_group_alias)
    ? dispatch.target_group_alias
    : null

  let groupMemberIds: string[] | null = null
  if (sampleGroupId) {
    const { data: members } = await supabase
      .from('survey_sample_group_members')
      .select('sample_id')
      .eq('group_id', sampleGroupId)
    groupMemberIds = (members ?? []).map(m => m.sample_id)
    if (groupMemberIds.length === 0) {
      return { processed: 0, failed: 0, hasMore: false }
    }
  }

  // Busca lote de entries na amostra
  let sampleQuery = supabase
    .from('survey_sample_lists')
    .select('id, email, nome, layers_user_id')
    .eq('survey_id', dispatch.survey_id)
    .eq('community_id', communityId)
    .not('layers_user_id', 'is', null)
    .neq('layers_user_id', 'NOT_FOUND')
    .order('created_at')
    .range(offset, offset + PERSONALIZED_BATCH_SIZE - 1)

  if (groupMemberIds) {
    sampleQuery = sampleQuery.in('id', groupMemberIds)
  }

  const { data: sampleEntries } = await sampleQuery

  let processed = 0
  let failed    = 0

  for (const entry of sampleEntries || []) {
    if (!entry.layers_user_id) continue

    let sendResult: JobResult | null = null
    try {
      // Monta payload personalizado para entrada da amostra
      const payload: LayersPayload = {
        targets: {
          topics: [{ kind: 'user', id: entry.layers_user_id }],
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

      // Enriquecer com dados do perfil Layers se disponível
      let nomeAluno  = ''
      let serie      = ''
      if (entry.layers_user_id && entry.layers_user_id !== 'NOT_FOUND') {
        try {
          const hub = await fetchLayersUser(entry.layers_user_id, communityId)
          if (hub) {
            nomeAluno = hub.nomeAluno || ''
            serie     = hub.serie    || ''
            // Usar nome do hub se entry.nome ainda estiver vazio
            if (!entry.nome && hub.nome) entry.nome = hub.nome
          }
        } catch { /* silencioso — nome já vem do resolve */ }
      }

      // Interpolar placeholders com dados da amostra
      const vars: PersonalizedVars = {
        nome:       entry.nome?.split(' ')[0] ?? '',
        nomeAluno,
        nomeEscola: communityNomeEscola,
        serie,
      }

      const title = interpolatePlaceholders(dispatch.push_title ?? dispatch.title, vars)
      const body  = interpolatePlaceholders(dispatch.push_body  ?? dispatch.body,  vars)
      payload.title = title
      payload.body  = body

      // Canais customizados
      const channels: LayersPayload['channels'] = {}

      if (dispatch.channels.includes('pushNotification')) {
        channels.pushNotification = { title, body }
      }

      if (dispatch.channels.includes('email')) {
        const emailTitle = interpolatePlaceholders(dispatch.email_title ?? dispatch.title, vars)
        const emailBody  = interpolatePlaceholders(dispatch.email_body  ?? dispatch.body,  vars)
        channels.email = {
          title:       emailTitle,
          body:        emailBody,
          actionLabel: dispatch.email_action_label || 'Responder Pesquisa',
          ...(dispatch.email_background_url ? { backgroundUrl: dispatch.email_background_url } : {}),
        }
      }

      if (Object.keys(channels).length > 0) payload.channels = channels

      // Enviar notificação
      sendResult = await sendToOneCommunity(communityId, payload)
      if (sendResult.success) processed++
      else                    failed++
    } catch (err) {
      console.error(`[sample-dispatch] Erro ao disparar para ${entry.email}:`, err)
      failed++
    }

    // Inserir audit log
    const { error: auditError } = await supabase.from('notification_audit_logs').insert({
      dispatch_id: dispatch.id,
      job_id:      jobId,
      email:       entry.email,
      nome:        entry.nome ?? null,
      status:      sendResult?.success ? 'sent' : 'failed',
      error:       sendResult?.error ?? null,
      sent_at:     sendResult?.success ? new Date().toISOString() : null,
    })
    if (auditError) console.error('[audit] Failed to insert audit log for', entry.email, ':', auditError)

    // Delay entre chamadas para respeitar rate limit
    await new Promise(r => setTimeout(r, PERSONALIZED_DELAY_MS))
  }

  // Avança o cursor além de tudo que foi tocado (sucesso + falha) para não re-processar
  const handledInBatch = sampleEntries?.length || 0
  const newOffset = offset + handledInBatch
  const { count: totalCount } = await supabase
    .from('survey_sample_lists')
    .select('*', { count: 'exact', head: true })
    .eq('survey_id', dispatch.survey_id)
    .eq('community_id', communityId)
    .not('layers_user_id', 'is', null)

  const total = totalCount || 0
  const hasMore = newOffset < total

  // Atualiza progresso no job
  await supabase
    .from('survey_dispatch_jobs')
    .update({
      processed_users: processedUsers + processed,
      failed_users:    failedUsers + failed,
      status:          hasMore ? 'sending' : ((processedUsers + processed) === 0 ? 'failed' : 'sent'),
      sent_at:         hasMore ? null : new Date().toISOString(),
    })
    .eq('id', jobId)

  return { processed, failed, hasMore }
}

// ─── executePersonalizedJob ───────────────────────────────────────────────────
//
// Processa um job de disparo personalizado em lotes.
// Cada execução de cron processa até PERSONALIZED_BATCH_SIZE usuários.
// A próxima execução continua de onde parou usando processed_users como offset.

export async function executePersonalizedJob(
  jobId:       string,
  dispatch:    DispatchRecord,
  communityId: string,
  nomeEscola:  string,
): Promise<{ processed: number; failed: number; hasMore: boolean }> {
  const supabase = createServiceClient()

  // Busca progresso atual do job
  const { data: job } = await supabase
    .from('survey_dispatch_jobs')
    .select('processed_users, failed_users, total_users')
    .eq('id', jobId)
    .single()

  const processedUsers = job?.processed_users ?? 0
  const failedUsers    = job?.failed_users    ?? 0
  const offset         = processedUsers + failedUsers  // avança além de falhas

  // Busca lote de usuários
  const { users, total } = await fetchCommunityUsers(
    communityId,
    dispatch.target_roles,
    PERSONALIZED_BATCH_SIZE,
    offset,
  )

  // Atualiza total se primeira execução
  if (offset === 0 && total > 0) {
    await supabase
      .from('survey_dispatch_jobs')
      .update({ total_users: total, status: 'sending' })
      .eq('id', jobId)
  }

  let processed = 0
  let failed    = 0

  for (const user of users) {
    const payload = buildPersonalizedPayload(dispatch, communityId, user, nomeEscola)
    const result  = await sendToOneCommunity(communityId, payload)

    if (result.success) processed++
    else                failed++

    // Delay entre chamadas para respeitar rate limit
    await new Promise(r => setTimeout(r, PERSONALIZED_DELAY_MS))
  }

  const newOffset = offset + users.length  // avança além de tudo que foi tocado
  const hasMore   = newOffset < (total || 0)

  // Atualiza progresso no job
  await supabase
    .from('survey_dispatch_jobs')
    .update({
      processed_users: processedUsers + processed,
      failed_users:    failedUsers + failed,
      status:          hasMore ? 'sending' : ((processedUsers + processed) === 0 ? 'failed' : 'sent'),
      sent_at:         hasMore ? null : new Date().toISOString(),
    })
    .eq('id', jobId)

  return { processed, failed, hasMore }
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

  const dispatchRecord = dispatch as DispatchRecord & { personalized?: boolean }

  // scope 'sample' requer modo personalizado
  if (dispatchRecord.target_scope === 'sample' && !dispatchRecord.personalized) {
    await supabase
      .from('survey_dispatches')
      .update({ status: 'failed' })
      .eq('id', dispatchId)

    return { sent: 0, failed: jobs.length, jobs: jobs.map(j => ({
      communityId: (j as { community_id: string }).community_id,
      success: false,
      error: 'SAMPLE_REQUIRES_PERSONALIZED'
    })) }
  }

  const isSampleScope = dispatchRecord.target_scope === 'sample'

  // ── Modo personalizado: delega para executePersonalizedJob ou executePersonalizedJobSample
  if (dispatchRecord.personalized) {
    // Busca nome da escola para placeholder {{nomeEscola}}
    const { data: communityRow } = await supabase
      .from('survey_communities')
      .select('theme')
      .eq('survey_id', dispatch.survey_id)
      .limit(1)
      .single()
    const nomeEscola = (communityRow?.theme as { nomeEscola?: string } | null)?.nomeEscola ?? ''

    // scope 'sample' → executePersonalizedJobSample; outros → executePersonalizedJob
    const results = await Promise.allSettled(
      jobs.map(async (job: { id: string; community_id: string }) => {
        const res = isSampleScope
          ? await executePersonalizedJobSample(
              job.id,
              dispatchRecord as DispatchRecord,
              job.community_id,
            )
          : await executePersonalizedJob(
              job.id,
              dispatchRecord as DispatchRecord,
              job.community_id,
              nomeEscola,
            )
        return { communityId: job.community_id, success: res.failed === 0, hasMore: res.hasMore }
      })
    )

    const jobResults: JobResult[] = results.map(r =>
      r.status === 'fulfilled'
        ? { communityId: r.value.communityId, success: r.value.success }
        : { communityId: 'unknown', success: false, error: String(r.reason) }
    )

    const sent   = jobResults.filter(r => r.success).length
    const failed = jobResults.filter(r => !r.success).length
    const anyHasMore = results.some(r => r.status === 'fulfilled' && r.value.hasMore)

    const finalStatus = anyHasMore
      ? 'sending'  // mais lotes pendentes para o cron processar
      : failed === 0 ? 'sent' : sent === 0 ? 'failed' : 'partial_failure'

    await supabase
      .from('survey_dispatches')
      .update({
        status:         finalStatus,
        completed_jobs: sent,
        failed_jobs:    failed,
        ...(anyHasMore ? {} : { completed_at: new Date().toISOString() }),
      })
      .eq('id', dispatchId)

    return { sent, failed, jobs: jobResults }
  }

  // ── Modo grupo: 1 chamada por comunidade ──────────────────────────────────
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
