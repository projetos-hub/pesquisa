// GET /api/cron/process-dispatches
// Vercel Cron: a cada 5 minutos
// Processa: (1) dispatches agendados cujo horário chegou
//           (2) jobs personalizados em andamento (status 'sending')

import { createServiceClient }                                          from '@/lib/supabase-service'
import { executeDispatch, executePersonalizedJob, executePersonalizedJobSample, type DispatchRecord } from '@/lib/layers-notifications'
import { fetchLayersUserByEmail }                                        from '@/lib/layers-hub'
import { decideDispatchClose, type DispatchJobStatus }                    from '@/lib/dispatch-state'
import { getCorrelationId, jsonWithCorrelation, logError, logInfo, logWarn } from '@/lib/observability'

interface ClaimedDispatchJob {
  id: string
  dispatch_id: string
  community_id: string
}

interface InProgressDispatchJob {
  id: string
  community_id: string
  dispatchId: string
}

function isAuthorized(req: Request): boolean {
  const auth        = req.headers.get('authorization') ?? ''
  const cronSecret  = process.env.CRON_SECRET
  const serviceKey  = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!auth) return false
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : auth
  return (!!cronSecret && token === cronSecret) ||
         (!!serviceKey  && token === serviceKey)
}

export async function GET(request: Request) {
  const correlationId = getCorrelationId(request)
  const logContext = { route: 'GET /api/cron/process-dispatches', correlationId }
  const json = (body: unknown, init?: ResponseInit) => jsonWithCorrelation(body, init, correlationId)

  if (!isAuthorized(request)) {
    logWarn('cron.dispatches.unauthorized', logContext)
    return json({ error: 'Não autorizado' }, { status: 401 })
  }

  logInfo('cron.dispatches.started', logContext)
  const supabase = createServiceClient()

  // ── 1. Dispatches agendados com horário chegado ────────────────────────────
  const { data: scheduled } = await supabase
    .from('survey_dispatches')
    .select('id')
    .eq('status', 'scheduled')
    .lte('scheduled_at', new Date().toISOString())
  const scheduledCount = scheduled?.length ?? 0

  const scheduledResults = await Promise.allSettled(
    (scheduled ?? []).map(async (d: { id: string }) => {
      const result = await executeDispatch(d.id)
      return { dispatchId: d.id, ...result }
    })
  )

  // ── 2. Jobs personalizados em andamento (próximo lote) ────────────────────
  // Busca dispatches personalizados com jobs ainda em 'sending'
  const { data: claimedJobs } = await supabase.rpc('claim_sending_dispatch_jobs', {
    p_limit: 15,
    p_lock_seconds: 240,
  })

  const claimedDispatchJobs = (claimedJobs ?? []) as ClaimedDispatchJob[]
  const claimedJobsCount = claimedDispatchJobs.length
  const inProgressJobs: InProgressDispatchJob[] = claimedDispatchJobs.map(job => ({
    id: job.id,
    community_id: job.community_id,
    dispatchId: job.dispatch_id,
  }))

  const personalizedResults = await Promise.allSettled(
    inProgressJobs.map(async (job) => {
      const { data: dispatch } = await supabase
        .from('survey_dispatches')
        .select('*')
        .eq('id', job.dispatchId)
        .single()

      if (!dispatch) return { jobId: job.id, processed: 0, failed: 0, hasMore: false }

      const dispatchRecord = dispatch as DispatchRecord
      const isSampleScope  = dispatchRecord.target_scope === 'sample'

      const result = isSampleScope
        ? await executePersonalizedJobSample(job.id, dispatchRecord, job.community_id)
        : await executePersonalizedJob(job.id, dispatchRecord, job.community_id, '')

      return { jobId: job.id, ...result }
    })
  )

  // ── 2b. Fecha dispatches cujos jobs todos completaram ─────────────────────
  // O cron chama executePersonalizedJob diretamente (sem executeDispatch), então
  // a lógica de fechar o pai nunca roda automaticamente — sem isso, dispatches
  // ficam em 'sending' para sempre (zombie).
  const dispatchIdsToCheck = [...new Set(inProgressJobs.map(j => j.dispatchId))]

  for (const dispatchId of dispatchIdsToCheck) {
    const { data: allJobs } = await supabase
      .from('survey_dispatch_jobs')
      .select('status')
      .eq('dispatch_id', dispatchId)

    if (!allJobs || allJobs.length === 0) continue

    const stillRunning = allJobs.filter(j => j.status === 'pending' || j.status === 'sending')
    if (stillRunning.length > 0) continue  // ainda há trabalho a fazer neste dispatch

    const sentCount   = allJobs.filter(j => j.status === 'sent').length
    const failedCount = allJobs.filter(j => j.status === 'failed').length
    const finalStatus =
      failedCount === 0 ? 'sent' :
      sentCount   === 0 ? 'failed' : 'partial_failure'
    const decision = decideDispatchClose(allJobs.map(j => j.status as DispatchJobStatus))
    if (!decision.shouldClose) continue

    await supabase
      .from('survey_dispatches')
      .update({
        status:         decision.status ?? finalStatus,
        completed_jobs: decision.completedJobs ?? sentCount,
        failed_jobs:    decision.failedJobs ?? failedCount,
        completed_at:   new Date().toISOString(),
      })
      .eq('id', dispatchId)
      .eq('status', 'sending')  // guard: só fecha se ainda estava 'sending' (evita race)
  }

  // ── 3. Resolve layers_user_id de amostras pendentes (50 por ciclo) ──────────
  // Resolve amostras pendentes — processa tudo com concorrência 20
  // Timeout: função tem 300s, a ~50 resoluções/s = ~6000 entradas por ciclo
  const { data: pendingSamples } = await supabase
    .from('survey_sample_lists')
    .select('id, community_id, email')
    .is('layers_user_id', null)
    .limit(5000) // processa até 5000 por ciclo
  const pendingSamplesCount = pendingSamples?.length ?? 0

  let resolvedSamples = 0
  if (pendingSamples && pendingSamples.length > 0) {
    const CONCURRENCY = 20
    for (let i = 0; i < pendingSamples.length; i += CONCURRENCY) {
      await Promise.all(pendingSamples.slice(i, i + CONCURRENCY).map(async (entry) => {
        const userId = await fetchLayersUserByEmail(entry.community_id, entry.email).catch(() => null)
        await supabase
          .from('survey_sample_lists')
          .update({ layers_user_id: userId ?? 'NOT_FOUND' })
          .eq('id', entry.id)
        if (userId) resolvedSamples++
      }))
    }
  }

  const processedScheduled    = scheduledResults.filter(r => r.status === 'fulfilled').length
  const processedPersonalized = personalizedResults.filter(r => r.status === 'fulfilled').length
  const errors = [
    ...scheduledResults.filter(r => r.status === 'rejected'),
    ...personalizedResults.filter(r => r.status === 'rejected'),
  ].length

  for (const result of scheduledResults) {
    if (result.status === 'rejected') {
      logError('cron.dispatches.scheduled_failed', logContext, result.reason)
    }
  }

  for (const result of personalizedResults) {
    if (result.status === 'rejected') {
      logError('cron.dispatches.personalized_failed', logContext, result.reason)
    }
  }

  logInfo('cron.dispatches.completed', logContext, {
    scheduledCount,
    claimedJobsCount,
    pendingSamplesCount,
    processedScheduled,
    processedPersonalized,
    resolvedSamples,
    errors,
  })

  return json({
    ok:                      true,
    processed_scheduled:     processedScheduled,
    processed_personalized:  processedPersonalized,
    resolved_samples:        resolvedSamples,
    errors,
  })
}
