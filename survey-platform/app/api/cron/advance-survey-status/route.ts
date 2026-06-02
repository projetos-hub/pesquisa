import { createServiceClient } from '@/lib/supabase-service'

// Vercel injeta automaticamente Authorization: Bearer <CRON_SECRET>
// Protege o endpoint de chamadas externas não autorizadas
function isAuthorized(req: Request): boolean {
  const auth   = req.headers.get('authorization') ?? ''
  const secret = process.env.CRON_SECRET
  if (!secret) return false
  return auth === `Bearer ${secret}`
}

export async function GET(req: Request) {
  if (!isAuthorized(req)) {
    return Response.json({ error: 'Não autorizado' }, { status: 401 })
  }

  const supabase = createServiceClient()
  const now = new Date().toISOString()

  // surveys: auto-open (rascunho/pausada → ativa quando open_date chegou)
  const { data: openedSurveys } = await supabase
    .from('surveys')
    .update({ status: 'ativa' })
    .lte('open_date', now)
    .in('status', ['rascunho', 'pausada'])
    .not('open_date', 'is', null)
    .select('id, title')

  // surveys: auto-close (ativa → encerrada quando close_date chegou)
  const { data: closedSurveys } = await supabase
    .from('surveys')
    .update({ status: 'encerrada' })
    .lte('close_date', now)
    .eq('status', 'ativa')
    .not('close_date', 'is', null)
    .select('id, title')

  // communities: auto-open (nao_aberta/pausada → ativa quando open_date chegou)
  const { data: openedCommunities } = await supabase
    .from('survey_communities')
    .update({ status: 'ativa' })
    .lte('open_date', now)
    .in('status', ['nao_aberta', 'pausada'])
    .not('open_date', 'is', null)
    .select('id, survey_id, community_id')

  // communities: auto-close (ativa → encerrada quando close_date chegou)
  const { data: closedCommunities } = await supabase
    .from('survey_communities')
    .update({ status: 'encerrada' })
    .lte('close_date', now)
    .eq('status', 'ativa')
    .not('close_date', 'is', null)
    .select('id, survey_id, community_id')

  const result = {
    ok: true,
    surveys_opened:     (openedSurveys ?? []).length,
    surveys_closed:     (closedSurveys ?? []).length,
    communities_opened: (openedCommunities ?? []).length,
    communities_closed: (closedCommunities ?? []).length,
    processed_at:       now,
  }

  console.log('[cron/advance-survey-status]', result)
  return Response.json(result)
}
