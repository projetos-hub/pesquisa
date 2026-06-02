import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { createServiceClient } from '@/lib/supabase-service'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const surveyId = searchParams.get('surveyId')
  if (!surveyId) return NextResponse.json({ error: 'surveyId required' }, { status: 400 })

  // Auth check
  const authClient = await createServerSupabaseClient()
  const { data: { user } } = await authClient.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const db = createServiceClient()

  // Dispatches for this survey
  const { data: dispatches } = await db
    .from('survey_dispatches')
    .select('id, title, created_at, status, total_jobs, completed_jobs')
    .eq('survey_id', surveyId)
    .in('status', ['sent', 'partial_failure', 'completed'])
    .order('created_at', { ascending: false })

  type DispatchRow = { id: string; title: string | null; created_at: string; status: string; total_jobs: number | null; completed_jobs: number | null }
  const dispatchList: DispatchRow[] = dispatches ?? []
  const dispatchIds = dispatchList.map((d: DispatchRow) => d.id)

  // Notification audit logs
  type AuditRow = { dispatch_id: string; status: string }
  const auditLogs: AuditRow[] = dispatchIds.length > 0
    ? (await db
        .from('notification_audit_logs')
        .select('dispatch_id, status')
        .in('dispatch_id', dispatchIds)).data ?? []
    : []

  // Aggregate per dispatch
  const logsByDispatch = new Map<string, { sent: number; failed: number }>()
  for (const log of auditLogs) {
    if (!logsByDispatch.has(log.dispatch_id)) {
      logsByDispatch.set(log.dispatch_id, { sent: 0, failed: 0 })
    }
    const entry = logsByDispatch.get(log.dispatch_id)!
    if (log.status === 'sent') entry.sent++
    else if (log.status === 'failed') entry.failed++
  }

  const funnelDispatches = dispatchList.map((d: DispatchRow) => ({
    id: d.id,
    title: d.title,
    created_at: d.created_at,
    status: d.status,
    notificados: logsByDispatch.get(d.id)?.sent ?? 0,
    falhos: logsByDispatch.get(d.id)?.failed ?? 0,
  }))

  // Total respondents
  const { count: total_respondentes } = await db
    .from('response_sessions')
    .select('id', { count: 'exact', head: true })
    .eq('survey_id', surveyId)

  // Total notificados across all dispatches
  const total_notificados = funnelDispatches.reduce((sum: number, d: { notificados: number }) => sum + d.notificados, 0)

  return NextResponse.json({
    dispatches: funnelDispatches,
    total_notificados,
    total_respondentes: total_respondentes ?? 0,
    conversion_rate: total_notificados > 0
      ? Math.round(((total_respondentes ?? 0) / total_notificados) * 1000) / 10
      : null,
  })
}
