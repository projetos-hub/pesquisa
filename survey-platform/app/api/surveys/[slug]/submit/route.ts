import { createServiceClient } from '@/lib/supabase-service'
import { checkRateLimit, getClientIp } from '@/lib/rate-limit'
import { buildQuestionMap, buildResponseRows, hasOnlyUnknownAnswerKeys } from '@/lib/submit-responses'
import { parseSubmitBody } from '@/lib/submit-validation'
import { classifyExistingSubmission } from '@/lib/submit-idempotency'
import {
  isPerfilAllowedForSubmit,
  isSampleAccessControl,
  sampleRowMatchesIdentity,
  surveyAllowsAllRoles,
} from '@/lib/submit-access'
import { fetchLayersUser, fetchLayersUserAnyRole } from '@/lib/layers-hub'
import { getCorrelationId, jsonWithCorrelation, logError, logInfo, logWarn } from '@/lib/observability'
import { isEffectivelyOpen } from '@/lib/survey-status'

interface RouteContext {
  params: Promise<{ slug: string }>
}

export async function POST(req: Request, { params }: RouteContext) {
  const { slug } = await params
  const correlationId = getCorrelationId(req)
  const logContext = { route: 'POST /api/surveys/[slug]/submit', correlationId }
  const json = (body: unknown, init?: ResponseInit) => jsonWithCorrelation(body, init, correlationId)

  // ── Rate limiting: máx 100 submissões por IP a cada 1 hora ──────────────────
  const clientIp = getClientIp(req)
  const { allowed, retryAfter } = checkRateLimit(clientIp, {
    maxRequests: 100,
    windowMs: 3_600_000, // 1 hora
  })

  if (!allowed) {
    logWarn('submit.rate_limited', logContext, { slug, retryAfter })
    return json(
      { error: `Rate limit exceeded. Retry after ${retryAfter}s` },
      {
        status: 429,
        headers: { 'Retry-After': String(retryAfter) },
      }
    )
  }

  let rawBody: unknown
  try {
    rawBody = await req.json()
  } catch {
    logWarn('submit.invalid_json', logContext, { slug })
    return json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const parsedBody = parseSubmitBody(rawBody)
  if (!parsedBody.ok) {
    logWarn('submit.invalid_body', logContext, { slug, status: parsedBody.status, reason: parsedBody.error })
    return json({ error: parsedBody.error }, { status: parsedBody.status })
  }

  const {
    communityId,
    userId,
    accountId,
    onda,
    school,
    tipo: _tipo, // eslint-disable-line @typescript-eslint/no-unused-vars
    perfil,
    nomeCompleto,
    nomeAluno,
    serie,
    email,
    layersMeta,
    answers,
  } = parsedBody.body

  // Garante unicidade mesmo se userId vier vazio no embed Layers
  const effectiveUserId = userId || accountId || `anon-${crypto.randomUUID()}`
  const identityUserId = userId || accountId

  const supabase = createServiceClient()

  // ── 1. Busca survey ativa ──────────────────────────────────────────────────
  const { data: survey } = await supabase
    .from('surveys')
    .select('id, access_control, target_roles, settings, status, open_date, close_date')
    .eq('slug', slug)
    .eq('status', 'ativa')
    .single()

  if (!survey || !isEffectivelyOpen(survey)) {
    logWarn('submit.survey_not_found', logContext, { slug })
    return json({ error: 'Survey not found' }, { status: 404 })
  }

  const surveyLogContext = { ...logContext, surveyId: survey.id }

  const allowAllRoles = surveyAllowsAllRoles(survey)
  const trustedProfile = identityUserId && communityId
    ? allowAllRoles
      ? await fetchLayersUserAnyRole(identityUserId, communityId)
      : await fetchLayersUser(identityUserId, communityId)
    : null

  const trustedPerfil = trustedProfile?.perfil ?? perfil
  const trustedEmail = (trustedProfile?.email || email).toLowerCase()
  const trustedNomeCompleto = trustedProfile?.nome || nomeCompleto
  const trustedNomeAluno = trustedProfile?.nomeAluno || nomeAluno
  const trustedSerie = trustedProfile?.serie || serie
  const trustedLayersMeta = trustedProfile?.meta ?? layersMeta

  if (!isPerfilAllowedForSubmit(survey, trustedPerfil)) {
    logWarn('submit.perfil_not_allowed', surveyLogContext, { slug, perfil: trustedPerfil })
    return json(
      { error: 'perfil_not_allowed', message: 'Perfil nao autorizado para esta pesquisa' },
      { status: 403 }
    )
  }

  if (communityId) {
    const { data: installation } = await supabase
      .from('survey_communities')
      .select('id, status, open_date, close_date')
      .eq('survey_id', survey.id)
      .eq('community_id', communityId)
      .eq('active', true)
      .eq('status', 'ativa')
      .maybeSingle()

    if (!installation || !isEffectivelyOpen(installation)) {
      logWarn('submit.community_not_authorized', surveyLogContext, { slug, communityId })
      return json(
        { error: 'community_not_authorized', message: 'Comunidade nao autorizada para esta pesquisa' },
        { status: 403 }
      )
    }
  }

  // ── 1b. Valida email na amostra (se survey possui segmentação amostral) ──────
  // Agora respeita o campo access_control
  if (isSampleAccessControl(survey)) {
    if (!communityId) {
      logWarn('submit.sample_community_required', surveyLogContext, { slug })
      return json(
        { error: 'community_required', message: 'Comunidade obrigatoria para pesquisa segmentada' },
        { status: 403 }
      )
    }

    if (!identityUserId) {
      logWarn('submit.sample_identity_required', surveyLogContext, { slug, communityId })
      return json(
        { error: 'identity_required', message: 'Identidade Layers obrigatoria para pesquisa segmentada' },
        { status: 403 }
      )
    }

    if (!trustedProfile || !trustedEmail) {
      logWarn('submit.sample_missing_email', surveyLogContext, { slug, communityId })
      return json(
        { error: 'not_in_sample', message: 'Email não fornecido para pesquisa segmentada' },
        { status: 403 }
      )
    }

    const { data: userInSample } = await supabase
      .from('survey_sample_lists')
      .select('id, layers_user_id')
      .eq('survey_id', survey.id)
      .eq('community_id', communityId)
      .eq('email', trustedEmail)
      .limit(1)

    if (!userInSample || userInSample.length === 0) {
      logWarn('submit.sample_not_found', surveyLogContext, { slug, communityId })
      return json(
        { error: 'not_in_sample', message: 'Você não está na amostra desta pesquisa' },
        { status: 403 }
      )
    }

    if (!sampleRowMatchesIdentity(userInSample[0], identityUserId)) {
      logWarn('submit.sample_identity_mismatch', surveyLogContext, { slug, communityId })
      return json(
        { error: 'not_in_sample', message: 'Identidade nao corresponde a amostra desta pesquisa' },
        { status: 403 }
      )
    }
  }

  // ── 2. Insere response_session (idempotente) ───────────────────────────────
  //
  // upsert com ignoreDuplicates: true envia ON CONFLICT DO NOTHING.
  // Se a session já existe: retorna [] → { duplicate: true }
  // Se é nova: retorna [{ id }] → prossegue para gravar respostas
  const sessionPayload = {
    survey_id:        survey.id,
    community_id:     communityId,
    user_id:          effectiveUserId,
    perfil:           trustedPerfil,
    nome_responsavel: trustedNomeCompleto,
    nome_aluno:       trustedNomeAluno,
    serie:            trustedSerie,
    school,
    onda,
    email:            trustedEmail,
    layers_meta:      Object.keys(trustedLayersMeta).length > 0 ? trustedLayersMeta : null,
  }

  async function createSessionOnce() {
    return supabase
      .from('response_sessions')
      .upsert(
        sessionPayload,
        {
          onConflict:       'survey_id,community_id,user_id',
          ignoreDuplicates: true,
        }
      )
      .select('id')
  }

  let { data: sessionData, error: sessionError } = await createSessionOnce()

  if (sessionError) {
    logError('submit.session_insert_failed', surveyLogContext, sessionError, { slug, communityId })
    return json({ error: 'Failed to create session' }, { status: 500 })
  }

  // Sem linhas retornadas = conflito: sessão já existe
  if (!sessionData?.length) {
    const { data: existingSession } = await supabase
      .from('response_sessions')
      .select('id')
      .eq('survey_id', survey.id)
      .eq('community_id', communityId)
      .eq('user_id', effectiveUserId)
      .maybeSingle()

    if (!existingSession?.id) {
      logInfo('submit.duplicate_without_session_lookup', surveyLogContext, { slug, communityId })
      return json({ duplicate: true })
    }

    const { count: responseCount, error: countError } = await supabase
      .from('responses')
      .select('id', { count: 'exact', head: true })
      .eq('session_id', existingSession.id)

    if (countError || classifyExistingSubmission(responseCount) !== 'incomplete_retry') {
      logInfo('submit.duplicate_complete', surveyLogContext, { slug, communityId })
      return json({ duplicate: true })
    }

    await supabase.from('response_sessions').delete().eq('id', existingSession.id)

    const retry = await createSessionOnce()
    sessionData = retry.data
    sessionError = retry.error

    if (sessionError) {
      logError('submit.session_retry_insert_failed', surveyLogContext, sessionError, { slug, communityId })
      return json({ error: 'Failed to create session' }, { status: 500 })
    }

    if (!sessionData?.length) {
      logInfo('submit.duplicate_after_retry_conflict', surveyLogContext, { slug, communityId })
      return json({ duplicate: true })
    }
  }

  const sessionId = sessionData[0].id

  // ── 3. Mapeia question.key → question.id ──────────────────────────────────
  const { data: questions } = await supabase
    .from('questions')
    .select('id, key')
    .eq('survey_id', survey.id)

  const questionMap = buildQuestionMap(questions)

  // ── 4. Insere responses ───────────────────────────────────────────────────
  //
  // Apenas keys que existem como questions no banco.
  // Chaves ausentes (step condicional pulado) são ignoradas.
  const responseRows = buildResponseRows(sessionId, answers, questionMap)

  if (hasOnlyUnknownAnswerKeys(answers, responseRows)) {
    await supabase.from('response_sessions').delete().eq('id', sessionId)
    logWarn('submit.no_valid_answers', surveyLogContext, { slug, communityId, sessionId })
    return json({ error: 'No valid answers matched survey questions' }, { status: 422 })
  }

  if (responseRows.length > 0) {
    const { error: responsesError } = await supabase
      .from('responses')
      .insert(responseRows)

    if (responsesError) {
      logError('submit.responses_insert_failed', surveyLogContext, responsesError, { slug, communityId, sessionId })

      // Compensação: remove a session para que o usuário possa tentar novamente.
      // Sem isso, o upsert idempotente retornaria { duplicate: true } na próxima
      // tentativa, bloqueando o respondente permanentemente.
      await supabase.from('response_sessions').delete().eq('id', sessionId)

      return json({ error: 'Failed to save responses' }, { status: 500 })
    }
  }

  // ── 5. Responder imediatamente ao usuário ────────────────────────────────────
  //
  // Sincronização com Google Sheets é feita pelo cron (a cada 11h UTC).
  // As sessions com synced_to_sheets = false serão processadas quando o cron rodar.
  // Isso permite responder ao usuário em <100ms em vez de ficar esperando até 30s.

  logInfo('submit.completed', surveyLogContext, {
    slug,
    communityId,
    sessionId,
    responseCount: responseRows.length,
  })
  return json({ ok: true, sessionId })
}
