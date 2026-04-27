// GET /api/admin/surveys/[id]/dispatch-audit?dispatch_id=...&limit=100&offset=0

import { createServerSupabaseClient } from '@/lib/supabase-server'
import { createServiceClient }        from '@/lib/supabase-service'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return Response.json({ error: 'Não autorizado' }, { status: 401 })

    const { id: surveyId } = await params
    const url        = new URL(request.url)
    const dispatchId = url.searchParams.get('dispatch_id')
    const limit      = Math.min(Number(url.searchParams.get('limit')  ?? 100), 500)
    const offset     = Number(url.searchParams.get('offset') ?? 0)

    if (!dispatchId) {
      return Response.json({ error: 'dispatch_id obrigatório' }, { status: 400 })
    }

    const service = createServiceClient()

    // Garante que o dispatch pertence à survey
    const { data: dispatch } = await service
      .from('survey_dispatches')
      .select('id, title, total_jobs, completed_jobs, failed_jobs')
      .eq('id', dispatchId)
      .eq('survey_id', surveyId)
      .single()

    if (!dispatch) {
      return Response.json({ error: 'Dispatch não encontrado' }, { status: 404 })
    }

    const { data: logs, count } = await service
      .from('notification_audit_logs')
      .select('id, email, nome, status, error, sent_at, created_at', { count: 'exact' })
      .eq('dispatch_id', dispatchId)
      .order('created_at', { ascending: true })
      .range(offset, offset + limit - 1)

    const totalSent   = (logs ?? []).filter(l => l.status === 'sent').length
    const totalFailed = (logs ?? []).filter(l => l.status === 'failed').length

    return Response.json({
      dispatch_id:   dispatchId,
      total:         count ?? 0,
      total_sent:    totalSent,
      total_failed:  totalFailed,
      logs:          logs ?? [],
    })
  } catch {
    return Response.json({ error: 'Erro interno' }, { status: 500 })
  }
}
