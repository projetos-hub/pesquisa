// GET /api/cron/process-dispatches
// Vercel Cron: a cada 5 minutos
// Processa: (1) dispatches agendados cujo horário chegou
//           (2) jobs personalizados em andamento (status 'sending')

import { createServiceClient } from '@/lib/supabase-service'
import { executeDispatch, executePersonalizedJob, type DispatchRecord } from '@/lib/layers-notifications'

function isAuthorized(req: Request): boolean {
  const auth   = req.headers.get('authorization') ?? ''
  const secret = process.env.CRON_SECRET
  if (!secret) return false
  return auth === `Bearer ${secret}`
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

      const result = await executePersonalizedJob(
        job.id,
        dispatch as DispatchRecord,
        job.community_id,
        '',
      )
      return { jobId: job.id, ...result }
    })
  )

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
    ok:                   true,
    processed_scheduled:  processedScheduled,
    processed_personalized: processedPersonalized,
    errors,
  })
}
