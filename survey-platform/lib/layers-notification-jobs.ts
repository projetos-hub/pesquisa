import { fetchLayersUser } from './layers-hub'
import { sendToOneCommunity } from './layers-notification-client'
import {
  buildNotificationAuditLog,
  buildPersonalizedPayload,
  buildSamplePersonalizedPayload,
  formatFirstName,
  type DispatchRecord,
  type JobResult,
  type PersonalizedVars,
} from './layers-notification-payloads'
import { fetchCommunityUsers } from './layers-notification-users'
import { createServiceClient } from './supabase-service'

const PERSONALIZED_DELAY_MS = 150
const PERSONALIZED_BATCH_SIZE = 75

export async function executePersonalizedJobSample(
  jobId:       string,
  dispatch:    DispatchRecord,
  communityId: string,
): Promise<{ processed: number; failed: number; hasMore: boolean }> {
  const supabase = createServiceClient()

  const { data: commRow } = await supabase
    .from('communities')
    .select('nome_escola')
    .eq('community_id', communityId)
    .maybeSingle()
  const communityNomeEscola = commRow?.nome_escola ?? ''

  const { data: job } = await supabase
    .from('survey_dispatch_jobs')
    .select('processed_users, failed_users, total_users')
    .eq('id', jobId)
    .single()

  const processedUsers = job?.processed_users ?? 0
  const failedUsers    = job?.failed_users    ?? 0
  const offset         = processedUsers + failedUsers

  if (offset === 0) {
    const { count } = await supabase
      .from('survey_sample_lists')
      .select('*', { count: 'exact', head: true })
      .eq('survey_id', dispatch.survey_id)
      .eq('community_id', communityId)
      .not('layers_user_id', 'is', null)
      .neq('layers_user_id', 'NOT_FOUND')

    const total = count || 0
    if (total > 0) {
      await supabase
        .from('survey_dispatch_jobs')
        .update({ total_users: total, status: 'sending' })
        .eq('id', jobId)
    }
  }

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
      let nomeAluno  = ''
      let serie      = ''
      if (entry.layers_user_id && entry.layers_user_id !== 'NOT_FOUND') {
        try {
          const hub = await fetchLayersUser(entry.layers_user_id, communityId)
          if (hub) {
            nomeAluno = hub.nomeAluno || ''
            serie     = hub.serie    || ''
            if (!entry.nome && hub.nome) entry.nome = hub.nome
          }
        } catch { /* ignore lookup failures */ }
      }

      const vars: PersonalizedVars = {
        nome:       formatFirstName(entry.nome ?? ''),
        nomeAluno,
        nomeEscola: communityNomeEscola,
        serie,
      }

      const payload = buildSamplePersonalizedPayload(dispatch, {
        layersUserId: entry.layers_user_id,
        vars,
      })

      sendResult = await sendToOneCommunity(communityId, payload)
      if (sendResult.success) processed++
      else                    failed++
    } catch (err) {
      console.error(`[sample-dispatch] Erro ao disparar para ${entry.email}:`, err)
      failed++
    }

    const { error: auditError } = await supabase.from('notification_audit_logs').insert(buildNotificationAuditLog({
      dispatchId: dispatch.id,
      jobId,
      email: entry.email,
      nome: entry.nome ?? null,
      success: sendResult?.success ?? false,
      error: sendResult?.error ?? null,
    }))
    if (auditError) console.error('[audit] Failed to insert audit log for', entry.email, ':', auditError)

    await new Promise(r => setTimeout(r, PERSONALIZED_DELAY_MS))
  }

  const handledInBatch = sampleEntries?.length || 0
  const newOffset = offset + handledInBatch
  const { count: totalCount } = await supabase
    .from('survey_sample_lists')
    .select('*', { count: 'exact', head: true })
    .eq('survey_id', dispatch.survey_id)
    .eq('community_id', communityId)
    .not('layers_user_id', 'is', null)
    .neq('layers_user_id', 'NOT_FOUND')

  const total = totalCount || 0
  const hasMore = newOffset < total

  await supabase
    .from('survey_dispatch_jobs')
    .update({
      processed_users: processedUsers + processed,
      failed_users:    failedUsers + failed,
      status:          hasMore ? 'sending' : ((processedUsers + processed) === 0 ? 'failed' : 'sent'),
      sent_at:         hasMore ? null : new Date().toISOString(),
      lock_token:      null,
      locked_until:    null,
    })
    .eq('id', jobId)

  return { processed, failed, hasMore }
}

export async function executePersonalizedJob(
  jobId:       string,
  dispatch:    DispatchRecord,
  communityId: string,
  nomeEscola:  string,
): Promise<{ processed: number; failed: number; hasMore: boolean }> {
  const supabase = createServiceClient()

  const { data: job } = await supabase
    .from('survey_dispatch_jobs')
    .select('processed_users, failed_users, total_users')
    .eq('id', jobId)
    .single()

  const processedUsers = job?.processed_users ?? 0
  const failedUsers    = job?.failed_users    ?? 0
  const offset         = processedUsers + failedUsers

  const { users, total } = await fetchCommunityUsers(
    communityId,
    dispatch.target_roles,
    PERSONALIZED_BATCH_SIZE,
    offset,
  )

  if (offset === 0 && total > 0) {
    await supabase
      .from('survey_dispatch_jobs')
      .update({ total_users: total, status: 'sending' })
      .eq('id', jobId)
  }

  let processed = 0
  let failed    = 0

  for (const user of users) {
    const payload = buildPersonalizedPayload(dispatch, user, nomeEscola)
    const result  = await sendToOneCommunity(communityId, payload)

    if (result.success) processed++
    else                failed++

    const { error: auditError } = await supabase.from('notification_audit_logs').insert(buildNotificationAuditLog({
      dispatchId: dispatch.id,
      jobId,
      email: user.email || user._id,
      nome: user.name ?? null,
      success: result.success,
      error: result.error ?? null,
    }))
    if (auditError) console.error('[audit] Failed to insert audit log for', user.email || user._id, ':', auditError)

    await new Promise(r => setTimeout(r, PERSONALIZED_DELAY_MS))
  }

  const newOffset = offset + users.length
  const hasMore   = newOffset < (total || 0)

  await supabase
    .from('survey_dispatch_jobs')
    .update({
      processed_users: processedUsers + processed,
      failed_users:    failedUsers + failed,
      status:          hasMore ? 'sending' : ((processedUsers + processed) === 0 ? 'failed' : 'sent'),
      sent_at:         hasMore ? null : new Date().toISOString(),
      lock_token:      null,
      locked_until:    null,
    })
    .eq('id', jobId)

  return { processed, failed, hasMore }
}
