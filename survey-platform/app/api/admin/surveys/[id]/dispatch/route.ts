// POST /api/admin/surveys/[id]/dispatch — Criar disparo
// GET  /api/admin/surveys/[id]/dispatch — Listar histórico

import { z } from 'zod'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { createServiceClient } from '@/lib/supabase-service'
import {
  resolveTargetCommunities,
  executeDispatch,
  type Channel,
  type TargetRole,
  type TargetScope,
} from '@/lib/layers-notifications'
import { getCorrelationId, jsonWithCorrelation, logError, logInfo, logWarn } from '@/lib/observability'

// ─── Auth ─────────────────────────────────────────────────────────────────────

async function requireAuth() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Não autorizado')
  return user
}

// ─── Validação do body ────────────────────────────────────────────────────────

const DispatchSchema = z.object({
  // Conteúdo
  title:                z.string().min(1).max(150),
  body:                 z.string().min(1),
  push_title:           z.string().max(150).optional().nullable(),
  push_body:            z.string().optional().nullable(),
  email_title:          z.string().max(150).optional().nullable(),
  email_body:           z.string().optional().nullable(),
  email_action_label:   z.string().max(50).optional().nullable(),
  email_background_url: z.string().url().optional().nullable(),

  // Canais
  channels: z.array(z.enum(['pushNotification', 'email']))
    .min(1, 'Selecione ao menos um canal'),

  // Segmentação
  target_scope:         z.enum(['all', 'communities', 'group', 'sample']),
  target_community_ids: z.array(z.string()).optional().nullable(),
  target_group_alias:   z.string().optional().nullable(),
  target_roles:         z.array(z.enum(['guardian', 'student', 'admin'])).min(1),

  // Modo de disparo
  personalized: z.boolean().optional(),

  // Agendamento
  scheduled_at: z.string().datetime({ offset: true }).optional().nullable(),

  // Template
  save_as_template:  z.boolean().optional(),
  template_name:     z.string().optional().nullable(),
  sequence_steps:    z.array(z.record(z.string(), z.unknown())).optional().nullable(),
})

type DispatchBody = z.infer<typeof DispatchSchema>

// ─── POST — Criar disparo ─────────────────────────────────────────────────────

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const correlationId = getCorrelationId(request)
  const logContext = { route: 'POST /api/admin/surveys/[id]/dispatch', correlationId }
  const json = (body: unknown, init?: ResponseInit) => jsonWithCorrelation(body, init, correlationId)

  try {
    const user = await requireAuth()
    const { id: surveyId } = await params
    const surveyLogContext = { ...logContext, surveyId }

    const raw = await request.json() as unknown
    const parsed = DispatchSchema.safeParse(raw)
    if (!parsed.success) {
      logWarn('dispatch.invalid_body', surveyLogContext, { issues: parsed.error.issues.length })
      return json(
        { error: 'Dados inválidos', details: parsed.error.flatten() },
        { status: 400 },
      )
    }

    const body: DispatchBody = parsed.data
    const supabase = createServiceClient()

    // Valida que a survey existe
    const { data: survey } = await supabase
      .from('surveys')
      .select('id, slug')
      .eq('id', surveyId)
      .single()

    if (!survey) {
      logWarn('dispatch.survey_not_found', surveyLogContext)
      return json({ error: 'Survey não encontrada' }, { status: 404 })
    }

    // Validação específica para scope 'sample'
    if (body.target_scope === 'sample') {
      if (!body.personalized) {
        logWarn('dispatch.sample_requires_personalized', surveyLogContext)
        return json(
          { error: 'Disparos para amostra requerem modo Personalizado ativado' },
          { status: 422 },
        )
      }
      const { count } = await supabase
        .from('survey_sample_lists')
        .select('*', { count: 'exact', head: true })
        .eq('survey_id', surveyId)
        .not('layers_user_id', 'is', null)

      if (!count || count === 0) {
        logWarn('dispatch.sample_without_resolved_users', surveyLogContext)
        return json(
          { error: 'Nenhum email resolvido na amostra. Faça upload da lista antes de disparar.' },
          { status: 422 },
        )
      }
    }

    // Resolve comunidades-alvo
    const targetCommunities = await resolveTargetCommunities(
      surveyId,
      body.target_scope as TargetScope,
      body.target_community_ids,
    )

    if (targetCommunities.length === 0) {
      logWarn('dispatch.no_target_communities', surveyLogContext, { targetScope: body.target_scope })
      return json(
        { error: 'Nenhuma comunidade encontrada para os critérios selecionados' },
        { status: 422 },
      )
    }

    const isScheduled = !!body.scheduled_at
    const initialStatus = isScheduled ? 'scheduled' : 'sending'

    // Cria o registro de dispatch
    const insertPayload: Record<string, unknown> = {
      survey_id:            surveyId,
      title:                body.title,
      body:                 body.body,
      push_title:           body.push_title   ?? null,
      push_body:            body.push_body    ?? null,
      email_title:          body.email_title  ?? null,
      email_body:           body.email_body   ?? null,
      email_action_label:   body.email_action_label ?? 'Responder Pesquisa',
      email_background_url: body.email_background_url ?? null,
      channels:             body.channels as Channel[],
      target_scope:         body.target_scope,
      target_community_ids: body.target_community_ids ?? null,
      target_group_alias:   body.target_group_alias ?? null,
      target_roles:         body.target_roles as TargetRole[],
      personalized:         body.personalized ?? false,
      scheduled_at:         body.scheduled_at ?? null,
      status:               initialStatus,
      total_jobs:           targetCommunities.length,
      is_template:          body.save_as_template ?? false,
      template_name:        body.template_name ?? null,
      created_by:           user.id,
    }
    // sequence_steps só inclui se existir (evita erro se migration 017 não foi aplicada)
    if (body.sequence_steps != null) {
      insertPayload.sequence_steps = body.sequence_steps
    }

    const { data: dispatch, error: dispatchErr } = await supabase
      .from('survey_dispatches')
      .insert(insertPayload)
      .select('*')
      .single()

    if (dispatchErr || !dispatch) {
      logError('dispatch.insert_failed', surveyLogContext, dispatchErr ?? new Error('Dispatch insert returned no row'))
      return json(
        { error: 'Erro ao criar dispatch', detail: dispatchErr?.message ?? 'unknown' },
        { status: 500 },
      )
    }

    // Cria os jobs (um por comunidade)
    const { error: jobsErr } = await supabase
      .from('survey_dispatch_jobs')
      .insert(
        targetCommunities.map(communityId => ({
          dispatch_id:  dispatch.id,
          community_id: communityId,
          status:       'pending',
        }))
      )

    if (jobsErr) {
      logError('dispatch.jobs_insert_failed', { ...surveyLogContext, dispatchId: dispatch.id }, jobsErr, {
        targetCommunities: targetCommunities.length,
      })
      await supabase.from('survey_dispatches').delete().eq('id', dispatch.id)
      return json(
        { error: 'Erro ao criar jobs de dispatch', detail: jobsErr.message },
        { status: 500 },
      )
    }

    // Disparo agendado: retorna imediatamente
    if (isScheduled) {
      logInfo('dispatch.scheduled_created', { ...surveyLogContext, dispatchId: dispatch.id }, {
        totalJobs: targetCommunities.length,
      })
      return json({
        ok:         true,
        dispatch,
        scheduled:  true,
        total_jobs: targetCommunities.length,
      })
    }

    // Disparo imediato: executa agora
    const result = await executeDispatch(dispatch.id)
    logInfo('dispatch.immediate_completed', { ...surveyLogContext, dispatchId: dispatch.id }, {
      sent: result.sent,
      failed: result.failed,
      totalJobs: targetCommunities.length,
    })

    return json({
      ok:         true,
      dispatch_id: dispatch.id,
      sent:        result.sent,
      failed:      result.failed,
      total:       targetCommunities.length,
    })
  } catch (err) {
    if (err instanceof Error && err.message === 'Não autorizado') {
      logWarn('dispatch.unauthorized', logContext)
      return json({ error: 'Não autorizado' }, { status: 401 })
    }
    logError('dispatch.unhandled_error', logContext, err)
    return json({ error: 'Erro interno' }, { status: 500 })
  }
}

// ─── GET — Listar histórico de disparos ───────────────────────────────────────

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const correlationId = getCorrelationId(request)
  const logContext = { route: 'GET /api/admin/surveys/[id]/dispatch', correlationId }
  const json = (body: unknown, init?: ResponseInit) => jsonWithCorrelation(body, init, correlationId)

  try {
    await requireAuth()
    const { id: surveyId } = await params
    const surveyLogContext = { ...logContext, surveyId }
    const supabase = createServiceClient()

    const { data: dispatches, error } = await supabase
      .from('survey_dispatches')
      .select(`
        *,
        jobs:survey_dispatch_jobs (
          id, community_id, status, error, retry_count, sent_at, created_at, processed_users, failed_users, total_users
        )
      `)
      .eq('survey_id', surveyId)
      .eq('is_template', false)
      .order('created_at', { ascending: false })

    if (error) {
      logError('dispatch.history_failed', surveyLogContext, error)
      return json({ error: 'Erro ao buscar histórico' }, { status: 500 })
    }

    logInfo('dispatch.history_loaded', surveyLogContext, { count: dispatches?.length ?? 0 })
    return json({ dispatches: dispatches ?? [] })
  } catch (err) {
    if (err instanceof Error && err.message === 'Não autorizado') {
      logWarn('dispatch.history_unauthorized', logContext)
      return json({ error: 'Não autorizado' }, { status: 401 })
    }
    logError('dispatch.history_unhandled_error', logContext, err)
    return json({ error: 'Erro interno' }, { status: 500 })
  }
}
