//
// Endpoint: POST https://api.layers.digital/v2/notification/send
// Auth: Bearer LAYERS_API_TOKEN + community-id header
// Docs: docs/layers-notifications.md

import { createServiceClient } from './supabase-service'
import { sendToOneCommunity } from './layers-notification-client'
import { executePersonalizedJob, executePersonalizedJobSample } from './layers-notification-jobs'
import {
  buildNotificationPayload,
  type DispatchRecord,
  type DispatchResult,
  type JobResult,
  type TargetScope,
} from './layers-notification-payloads'

const SAMPLE_COMMUNITY_PAGE_SIZE = 1000

export {
  sendToOneCommunity,
} from './layers-notification-client'

export {
  executePersonalizedJob,
  executePersonalizedJobSample,
} from './layers-notification-jobs'

export {
  buildNotificationAuditLog,
  buildNotificationPayload,
  buildSamplePersonalizedPayload,
  interpolatePlaceholders,
  type Channel,
  type DispatchRecord,
  type DispatchResult,
  type JobResult,
  type LayersPayload,
  type PersonalizedVars,
  type TargetRole,
  type TargetScope,
} from './layers-notification-payloads'

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

  if (scope === 'sample') {
    const communities = new Set<string>()
    let from = 0

    while (true) {
      let query = supabase
        .from('survey_sample_lists')
        .select('community_id')
        .eq('survey_id', surveyId)
        .not('layers_user_id', 'is', null)
        .neq('layers_user_id', 'NOT_FOUND')
        .range(from, from + SAMPLE_COMMUNITY_PAGE_SIZE - 1)

      if (communityIds && communityIds.length > 0) {
        query = query.in('community_id', communityIds)
      }

      const { data, error } = await query
      if (error || !data || data.length === 0) break

      for (const row of data as { community_id: string }[]) {
        communities.add(row.community_id)
      }

      if (data.length < SAMPLE_COMMUNITY_PAGE_SIZE) break
      from += SAMPLE_COMMUNITY_PAGE_SIZE
    }

    return [...communities]
  }

  const { data, error } = await supabase
    .from('survey_communities')
    .select('community_id')
    .eq('survey_id', surveyId)
    .eq('active', true)

  if (error || !data) return []
  return data.map((r: { community_id: string }) => r.community_id)
}

//
// Faz o POST para a Layers API e retorna o resultado.


//
// selecionados, faz uma chamada por role e deduplica por _id.



// Processa disparo personalizado para amostra segmentada.


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

  if (dispatchRecord.personalized) {
    const communityIds = jobs.map((job: { community_id: string }) => job.community_id)
    const { data: communityRows } = await supabase
      .from('communities')
      .select('community_id, nome_escola')
      .in('community_id', communityIds)
    const nomeEscolaByCommunity = new Map(
      (communityRows ?? []).map(row => [row.community_id, row.nome_escola ?? ''])
    )

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
              nomeEscolaByCommunity.get(job.community_id) ?? '',
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

  const results = await Promise.allSettled(
    jobs.map(async (job: { id: string; community_id: string }) => {
      const payload = buildNotificationPayload(dispatch as DispatchRecord)

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
