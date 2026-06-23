import { AdminAuthError, requireAdmin } from '@/lib/admin-auth'
import { createServiceClient } from '@/lib/supabase-service'
import { getCorrelationId, jsonWithCorrelation, logError, logInfo, logWarn } from '@/lib/observability'

const STALE_DISPATCH_MS = 60 * 60 * 1000
const STALE_JOB_MS = 30 * 60 * 1000

export async function GET(request: Request) {
  const correlationId = getCorrelationId(request)
  const logContext = { route: 'GET /api/admin/operations/dispatch-health', correlationId }
  const json = (body: unknown, init?: ResponseInit) => jsonWithCorrelation(body, init, correlationId)

  try {
    await requireAdmin()

    const supabase = createServiceClient()
    const now = Date.now()
    const staleJobIso = new Date(now - STALE_JOB_MS).toISOString()

    const [
      activeDispatches,
      staleJobs,
      failedJobs,
      dueScheduledDispatches,
    ] = await Promise.all([
      supabase
        .from('survey_dispatches')
        .select('id, survey_id, status, total_jobs, completed_jobs, failed_jobs, personalized, created_at, started_at, scheduled_at, completed_at')
        .in('status', ['sending', 'partial_failure', 'failed'])
        .order('created_at', { ascending: true })
        .limit(50),
      supabase
        .from('survey_dispatch_jobs')
        .select('id, dispatch_id, community_id, status, retry_count, error, total_users, processed_users, failed_users, locked_at, locked_until, created_at')
        .eq('status', 'sending')
        .lt('created_at', staleJobIso)
        .order('created_at', { ascending: true })
        .limit(50),
      supabase
        .from('survey_dispatch_jobs')
        .select('id, dispatch_id, community_id, status, retry_count, error, created_at')
        .eq('status', 'failed')
        .order('created_at', { ascending: false })
        .limit(50),
      supabase
        .from('survey_dispatches')
        .select('id, survey_id, status, scheduled_at, total_jobs, completed_jobs, failed_jobs, created_at')
        .eq('status', 'scheduled')
        .lte('scheduled_at', new Date().toISOString())
        .order('scheduled_at', { ascending: true })
        .limit(50),
    ])

    const firstError = activeDispatches.error ?? staleJobs.error ?? failedJobs.error ?? dueScheduledDispatches.error
    if (firstError) {
      logError('operations.dispatch_health.query_failed', logContext, firstError)
      return json({ error: 'Erro ao consultar saúde de dispatches' }, { status: 500 })
    }

    const zombieDispatches = (activeDispatches.data ?? []).filter(dispatch => (
      dispatch.status === 'sending' &&
      new Date(dispatch.created_at).getTime() < now - STALE_DISPATCH_MS
    ))

    const staleSendingJobs = (staleJobs.data ?? []).filter(job => (
      !job.locked_until || new Date(job.locked_until).getTime() < now
    ))

    const summary = {
      zombie_dispatches: zombieDispatches.length,
      stale_sending_jobs: staleSendingJobs.length,
      failed_jobs: failedJobs.data?.length ?? 0,
      due_scheduled_dispatches: dueScheduledDispatches.data?.length ?? 0,
    }

    const ok = summary.zombie_dispatches === 0 &&
      summary.stale_sending_jobs === 0 &&
      summary.due_scheduled_dispatches === 0

    logInfo('operations.dispatch_health.loaded', logContext, summary)

    return json({
      ok,
      status: ok ? 'ok' : 'warn',
      thresholds: {
        zombie_dispatch_minutes: STALE_DISPATCH_MS / 60000,
        stale_job_minutes: STALE_JOB_MS / 60000,
      },
      summary,
      zombie_dispatches: zombieDispatches,
      stale_sending_jobs: staleSendingJobs,
      failed_jobs: failedJobs.data ?? [],
      due_scheduled_dispatches: dueScheduledDispatches.data ?? [],
      timestamp: new Date().toISOString(),
    }, { status: ok ? 200 : 200 })
  } catch (error) {
    if (error instanceof AdminAuthError) {
      logWarn('operations.dispatch_health.unauthorized', logContext)
      return json({ error: error.message }, { status: error.status })
    }

    logError('operations.dispatch_health.unhandled_error', logContext, error)
    return json({ error: 'Erro interno' }, { status: 500 })
  }
}
