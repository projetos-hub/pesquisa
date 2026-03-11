import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase-service'
import { syncToSheets } from '@/lib/sheets'

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
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createServiceClient()

  // 1. Busca sessões não sincronizadas (máx 50 por execução)
  const { data: sessions, error } = await supabase
    .from('response_sessions')
    .select(`
      id,
      community_id,
      user_id,
      perfil,
      nome_responsavel,
      nome_aluno,
      serie,
      school,
      onda,
      surveys ( slug )
    `)
    .eq('synced_to_sheets', false)
    .order('submitted_at', { ascending: true })
    .limit(50)

  if (error) {
    console.error('[cron/sync-sheets] query error:', error)
    return NextResponse.json({ error: 'Query failed' }, { status: 500 })
  }

  if (!sessions?.length) {
    return NextResponse.json({ ok: true, synced: 0, message: 'Nada pendente' })
  }

  let synced = 0
  let failed = 0

  for (const session of sessions) {
    // 2. Busca respostas da sessão
    const { data: responses } = await supabase
      .from('responses')
      .select('question_key, value')
      .eq('session_id', session.id)

    // Reconstrói answers como objeto { question_key: value }
    const answers: Record<string, unknown> = {}
    for (const r of responses ?? []) {
      answers[r.question_key] = r.value
    }

    const surveyRaw = session.surveys
    const survey = (Array.isArray(surveyRaw) ? surveyRaw[0] : surveyRaw) as { slug: string } | null

    const ok = await syncToSheets({
      surveyId:     survey?.slug ?? '',
      communityId:  session.community_id  ?? '',
      userId:       session.user_id        ?? '',
      onda:         session.onda           ?? '',
      perfil:       session.perfil         ?? '',
      nomeCompleto: session.nome_responsavel ?? '',
      nomeAluno:    session.nome_aluno      ?? '',
      serie:        session.serie           ?? '',
      answers,
    })

    if (ok) {
      await supabase
        .from('response_sessions')
        .update({ synced_to_sheets: true, synced_at: new Date().toISOString() })
        .eq('id', session.id)
      synced++
    } else {
      failed++
    }
  }

  console.log(`[cron/sync-sheets] synced=${synced} failed=${failed}`)
  return NextResponse.json({ ok: true, synced, failed })
}
