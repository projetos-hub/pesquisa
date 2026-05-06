// GET /api/cron/process-dispatches
// Vercel Cron: a cada 5 minutos
// Processa: (1) dispatches agendados cujo horário chegou
//           (2) jobs personalizados em andamento (status 'sending')

import { createServiceClient }                                          from '@/lib/supabase-service'
import { executeDispatch, executePersonalizedJob, executePersonalizedJobSample, type DispatchRecord } from '@/lib/layers-notifications'
import { fetchLayersUserByEmail }                                        from '@/lib/layers-hub'

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
  if (!isAuthorized(request)) {
    return Response.json({ error: 'Não autorizado' }, { status: 401 })
  }

  const supabase = createServiceClient()

  // ── 1. Dispatches agendados com horário chegado ────────────────────────────
  const { data: scheduled } = await supabase
    .from('survey_dispatches')
    .select('id')
    .eq('status', 'scheduled')
    .lte('scheduled_at', new Date().toISOString())

  const scheduledResults = await Promise.allSettled(
    (scheduled ?? []).map(async (d: { id: string }) => {
      const result = await executeDispatch(d.id)
      return { dispatchId: d.id, ...result }
    })
  )

  // ── 2. Jobs personalizados em andamento (próximo lote) ────────────────────
  // Busca dispatches personalizados com jobs ainda em 'sending'
  const { data: inProgressDispatches } = await supabase
    .from('survey_dispatches')
    .select('id')
    .eq('status', 'sending')
    .eq('personalized', true)
    .limit(5)

  const inProgressJobs: { id: string; community_id: string; dispatchId: string }[] = []

  for (const d of inProgressDispatches ?? []) {
    const { data: jobs } = await supabase
      .from('survey_dispatch_jobs')
      .select('id, community_id, processed_users, total_users')
      .eq('dispatch_id', d.id)
      .eq('status', 'sending')
      .limit(3)

    for (const j of jobs ?? []) {
      const job = j as { id: string; community_id: string; processed_users: number; total_users: number | null }
      if (job.total_users === null || job.processed_users < job.total_users) {
        inProgressJobs.push({ id: job.id, community_id: job.community_id, dispatchId: d.id as string })
      }
    }
  }

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

  // ── 3. Resolve layers_user_id de amostras pendentes (50 por ciclo) ──────────
  // Resolve amostras pendentes — processa tudo com concorrência 20
  // Timeout: função tem 300s, a ~50 resoluções/s = ~6000 entradas por ciclo
  const { data: pendingSamples } = await supabase
    .from('survey_sample_lists')
    .select('id, community_id, email')
    .is('layers_user_id', null)
    .limit(5000) // processa até 5000 por ciclo

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

  console.log(
    `[cron/process-dispatches] scheduled=${processedScheduled} ` +
    `personalized=${processedPersonalized} errors=${errors}`
  )

  return Response.json({
    ok:                      true,
    processed_scheduled:     processedScheduled,
    processed_personalized:  processedPersonalized,
    resolved_samples:        resolvedSamples,
    errors,
  })
}
