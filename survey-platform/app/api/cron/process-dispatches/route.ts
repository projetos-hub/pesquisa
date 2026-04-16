// GET /api/cron/process-dispatches
// Vercel Cron: a cada 5 minutos — processa disparos agendados cujo horário chegou

import { createServiceClient } from '@/lib/supabase-service'
import { executeDispatch } from '@/lib/layers-notifications'

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

  // Busca dispatches agendados cujo horário já chegou
  const { data: pending, error } = await supabase
    .from('survey_dispatches')
    .select('id')
    .eq('status', 'scheduled')
    .lte('scheduled_at', new Date().toISOString())

  if (error) {
    console.error('[cron/process-dispatches] erro ao buscar dispatches:', error)
    return Response.json({ error: 'Erro ao buscar dispatches' }, { status: 500 })
  }

  if (!pending || pending.length === 0) {
    return Response.json({ ok: true, processed: 0, message: 'Nenhum dispatch pendente' })
  }

  // Processa cada dispatch em paralelo
  const results = await Promise.allSettled(
    pending.map(async (d: { id: string }) => {
      const result = await executeDispatch(d.id)
      return { dispatchId: d.id, ...result }
    })
  )

  const processed = results.filter(r => r.status === 'fulfilled').length
  const errors    = results.filter(r => r.status === 'rejected').length

  const summary = results.map(r =>
    r.status === 'fulfilled'
      ? r.value
      : { error: String(r.reason) }
  )

  console.log(`[cron/process-dispatches] processed=${processed} errors=${errors}`)

  return Response.json({
    ok:        true,
    processed,
    errors,
    summary,
  })
}
