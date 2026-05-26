// POST /api/admin/dispatch/[dispatchId]/retry
// Reprocessa jobs com status 'failed' (max 3 tentativas por job)

import { createServerSupabaseClient } from '@/lib/supabase-server'
import { createServiceClient } from '@/lib/supabase-service'
import { executeDispatch } from '@/lib/layers-notifications'

async function requireAuth() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Não autorizado')
  return user
}

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ dispatchId: string }> },
) {
  try {
    await requireAuth()
    const { dispatchId } = await params
    const supabase = createServiceClient()

    // Verifica que o dispatch existe
    const { data: dispatch } = await supabase
      .from('survey_dispatches')
      .select('id, status, failed_jobs')
      .eq('id', dispatchId)
      .single()

    if (!dispatch) {
      return Response.json({ error: 'Dispatch não encontrado' }, { status: 404 })
    }

    if (dispatch.failed_jobs === 0) {
      return Response.json({ error: 'Nenhum job falho para reprocessar' }, { status: 422 })
    }

    // Reseta jobs falhos com retry_count < 3 para 'pending'
    const { data: resetJobs } = await supabase
      .from('survey_dispatch_jobs')
      .update({ status: 'pending', error: null })
      .eq('dispatch_id', dispatchId)
      .eq('status', 'failed')
      .lt('retry_count', 3)
      .select('id')

    const resetCount = resetJobs?.length ?? 0

    if (resetCount === 0) {
      return Response.json(
        { error: 'Todos os jobs falhos já atingiram o limite de 3 tentativas' },
        { status: 422 },
      )
    }

    // Incrementa retry_count nos jobs resetados
    if (resetJobs && resetJobs.length > 0) {
      const ids = resetJobs.map((j: { id: string }) => j.id)
      await supabase.rpc('increment_retry_count', { job_ids: ids }).maybeSingle()
    }

    // Reseta contadores do dispatch
    await supabase
      .from('survey_dispatches')
      .update({ status: 'sending', completed_at: null })
      .eq('id', dispatchId)

    // Executa
    const result = await executeDispatch(dispatchId)

    return Response.json({
      ok:          true,
      retried:     resetCount,
      sent:        result.sent,
      failed:      result.failed,
    })
  } catch (err) {
    if (err instanceof Error && err.message === 'Não autorizado') {
      return Response.json({ error: 'Não autorizado' }, { status: 401 })
    }
    console.error('[dispatch retry] error:', err)
    return Response.json({ error: 'Erro interno' }, { status: 500 })
  }
}
