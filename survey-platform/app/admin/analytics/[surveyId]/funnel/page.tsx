import { createServerSupabaseClient } from '@/lib/supabase-server'
import { createServiceClient } from '@/lib/supabase-service'
import { notFound } from 'next/navigation'
import { FunnelViz } from '@/components/analytics/FunnelViz'

interface PageProps {
  params: Promise<{ surveyId: string }>
}

export default async function FunnelPage({ params }: PageProps) {
  const { surveyId } = await params

  const authClient = await createServerSupabaseClient()
  const { data: { user } } = await authClient.auth.getUser()
  if (!user) return null

  const db = createServiceClient()

  const { data: survey } = await db
    .from('surveys')
    .select('id')
    .eq('id', surveyId)
    .single()

  if (!survey) notFound()

  // Dispatches
  const { data: dispatches } = await db
    .from('survey_dispatches')
    .select('id, title, created_at, status, total_jobs, completed_jobs')
    .eq('survey_id', surveyId)
    .in('status', ['sent', 'partial_failure', 'completed'])
    .order('created_at', { ascending: false })

  const dispatchList = dispatches ?? []
  const dispatchIds = dispatchList.map(d => d.id)

  // Audit logs
  const { data: auditLogs } = dispatchIds.length > 0
    ? await db
        .from('notification_audit_logs')
        .select('dispatch_id, status')
        .in('dispatch_id', dispatchIds)
    : { data: [] }

  const logsByDispatch = new Map<string, { sent: number; failed: number }>()
  for (const log of auditLogs ?? []) {
    if (!logsByDispatch.has(log.dispatch_id)) {
      logsByDispatch.set(log.dispatch_id, { sent: 0, failed: 0 })
    }
    const entry = logsByDispatch.get(log.dispatch_id)!
    if (log.status === 'sent') entry.sent++
    else if (log.status === 'failed') entry.failed++
  }

  const funnelDispatches = dispatchList.map(d => ({
    id: d.id,
    title: d.title as string | null,
    created_at: d.created_at,
    status: d.status,
    notificados: logsByDispatch.get(d.id)?.sent ?? 0,
    falhos: logsByDispatch.get(d.id)?.failed ?? 0,
  }))

  const { count: total_respondentes } = await db
    .from('response_sessions')
    .select('id', { count: 'exact', head: true })
    .eq('survey_id', surveyId)

  const total_notificados = funnelDispatches.reduce((sum, d) => sum + d.notificados, 0)
  const respondentes = total_respondentes ?? 0
  const conversion_rate: number | null = total_notificados > 0
    ? Math.round((respondentes / total_notificados) * 1000) / 10
    : null

  return (
    <div className="p-6">
      <FunnelViz
        dispatches={funnelDispatches}
        total_notificados={total_notificados}
        total_respondentes={respondentes}
        conversion_rate={conversion_rate}
      />
    </div>
  )
}
