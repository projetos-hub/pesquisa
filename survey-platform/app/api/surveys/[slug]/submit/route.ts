import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase-service'
import { checkRateLimit, getClientIp } from '@/lib/rate-limit'

interface RouteContext {
  params: Promise<{ slug: string }>
}

interface SubmitBody {
  communityId?: string
  userId?: string
  accountId?: string
  onda?: string
  school?: string
  tipo?: string
  perfil?: string
  nomeCompleto?: string
  nomeAluno?: string
  serie?: string
  email?: string
  layersMeta?: Record<string, unknown>
  answers: Record<string, unknown>
}

export async function POST(req: Request, { params }: RouteContext) {
  const { slug } = await params

  // ── Rate limiting: máx 100 submissões por IP a cada 1 hora ──────────────────
  const clientIp = getClientIp(req)
  const { allowed, retryAfter } = checkRateLimit(clientIp, {
    maxRequests: 100,
    windowMs: 3_600_000, // 1 hora
  })

  if (!allowed) {
    return NextResponse.json(
      { error: `Rate limit exceeded. Retry after ${retryAfter}s` },
      {
        status: 429,
        headers: { 'Retry-After': String(retryAfter) },
      }
    )
  }

  let body: SubmitBody
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const {
    communityId = '',
    userId = '',
    accountId = '',
    onda = '',
    school = '',
    tipo = '',
    perfil = '',
    nomeCompleto = '',
    nomeAluno = '',
    serie = '',
    email = '',
    layersMeta = {},
    answers,
  } = body

  // Garante unicidade mesmo se userId vier vazio no embed Layers
  const effectiveUserId = userId || accountId

  if (!answers || typeof answers !== 'object') {
    return NextResponse.json({ error: 'answers is required' }, { status: 400 })
  }

  const supabase = createServiceClient()

  // ── 1. Busca survey ativa ──────────────────────────────────────────────────
  const { data: survey } = await supabase
    .from('surveys')
    .select('id')
    .eq('slug', slug)
    .eq('status', 'ativa')
    .single()

  if (!survey) {
    return NextResponse.json({ error: 'Survey not found' }, { status: 404 })
  }

  // ── 1b. Busca nomeEscola do survey_communities.theme ──────────────────────
  let nomeEscola = ''
  if (communityId) {
    const { data: comm } = await supabase
      .from('survey_communities')
      .select('theme')
      .eq('survey_id', survey.id)
      .eq('community_id', communityId)
      .single()
    nomeEscola = (comm?.theme as { nomeEscola?: string })?.nomeEscola ?? ''
  }

  // ── 2. Insere response_session (idempotente) ───────────────────────────────
  //
  // upsert com ignoreDuplicates: true envia ON CONFLICT DO NOTHING.
  // Se a session já existe: retorna [] → { duplicate: true }
  // Se é nova: retorna [{ id }] → prossegue para gravar respostas
  const { data: sessionData, error: sessionError } = await supabase
    .from('response_sessions')
    .upsert(
      {
        survey_id:        survey.id,
        community_id:     communityId,
        user_id:          effectiveUserId,
        perfil,
        nome_responsavel: nomeCompleto,
        nome_aluno:       nomeAluno,
        serie,
        school,
        onda,
        email,
        layers_meta:      Object.keys(layersMeta).length > 0 ? layersMeta : null,
      },
      {
        onConflict:       'survey_id,community_id,user_id',
        ignoreDuplicates: true,
      }
    )
    .select('id')

  if (sessionError) {
    console.error('[submit] session insert error:', sessionError)
    return NextResponse.json({ error: 'Failed to create session' }, { status: 500 })
  }

  // Sem linhas retornadas = conflito: sessão já existe
  if (!sessionData?.length) {
    return NextResponse.json({ duplicate: true })
  }

  const sessionId = sessionData[0].id

  // ── 3. Mapeia question.key → question.id ──────────────────────────────────
  const { data: questions } = await supabase
    .from('questions')
    .select('id, key')
    .eq('survey_id', survey.id)

  const questionMap = new Map<string, string>()
  for (const q of questions ?? []) {
    questionMap.set(q.key, q.id)
  }

  // ── 4. Insere responses ───────────────────────────────────────────────────
  //
  // Apenas keys que existem como questions no banco.
  // Chaves ausentes (step condicional pulado) são ignoradas.
  const responseRows = Object.entries(answers)
    .filter(([key]) => questionMap.has(key))
    .map(([key, value]) => ({
      session_id:   sessionId,
      question_id:  questionMap.get(key),
      question_key: key,
      value,
    }))

  if (responseRows.length > 0) {
    const { error: responsesError } = await supabase
      .from('responses')
      .insert(responseRows)

    if (responsesError) {
      console.error('[submit] responses insert error:', responsesError)

      // Compensação: remove a session para que o usuário possa tentar novamente.
      // Sem isso, o upsert idempotente retornaria { duplicate: true } na próxima
      // tentativa, bloqueando o respondente permanentemente.
      await supabase.from('response_sessions').delete().eq('id', sessionId)

      return NextResponse.json({ error: 'Failed to save responses' }, { status: 500 })
    }
  }

  // ── 5. Responder imediatamente ao usuário ────────────────────────────────────
  //
  // Sincronização com Google Sheets é feita pelo cron (a cada 11h UTC).
  // As sessions com synced_to_sheets = false serão processadas quando o cron rodar.
  // Isso permite responder ao usuário em <100ms em vez de ficar esperando até 30s.

  return NextResponse.json({ ok: true, sessionId })
}
