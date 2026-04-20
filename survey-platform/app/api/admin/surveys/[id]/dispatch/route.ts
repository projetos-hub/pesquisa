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
  target_scope:         z.enum(['all', 'communities', 'group']),
  target_community_ids: z.array(z.string()).optional().nullable(),
  target_group_alias:   z.string().optional().nullable(),
  target_roles:         z.array(z.enum(['guardian', 'student', 'admin'])).min(1),

  // Modo de disparo
  personalized: z.boolean().optional(),

  // Agendamento
  scheduled_at: z.string().datetime({ offset: true }).optional().nullable(),

  // Template
  save_as_template: z.boolean().optional(),
  template_name:    z.string().optional().nullable(),
})

type DispatchBody = z.infer<typeof DispatchSchema>

// ─── POST — Criar disparo ─────────────────────────────────────────────────────

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireAuth()
    const { id: surveyId } = await params

    const raw = await request.json() as unknown
    const parsed = DispatchSchema.safeParse(raw)
    if (!parsed.success) {
      return Response.json(
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
      return Response.json({ error: 'Survey não encontrada' }, { status: 404 })
    }

    // Resolve comunidades-alvo
    const targetCommunities = await resolveTargetCommunities(
      surveyId,
      body.target_scope as TargetScope,
      body.target_community_ids,
    )

    if (targetCommunities.length === 0) {
      return Response.json(
        { error: 'Nenhuma comunidade encontrada para os critérios selecionados' },
        { status: 422 },
      )
    }

    // Detectar se é disparo amostral
    const { data: hasSample } = await supabase
      .from('survey_sample_lists')
      .select('id')
      .eq('survey_id', surveyId)
      .limit(1)

    const isAmostral = hasSample && hasSample.length > 0

    // Se é amostral, requer modo personalizado
    if (isAmostral && !body.personalized) {
      return Response.json(
        { error: 'Pesquisas amostrais só funcionam em modo Personalizado' },
        { status: 422 },
      )
    }

    const isScheduled = !!body.scheduled_at
    const initialStatus = isScheduled ? 'scheduled' : 'sending'

    // Cria o registro de dispatch
    const { data: dispatch, error: dispatchErr } = await supabase
      .from('survey_dispatches')
      .insert({
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
      })
      .select('*')
      .single()

    if (dispatchErr || !dispatch) {
      return Response.json({ error: 'Erro ao criar dispatch' }, { status: 500 })
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
      // Rollback do dispatch
      await supabase.from('survey_dispatches').delete().eq('id', dispatch.id)
      return Response.json({ error: 'Erro ao criar jobs de dispatch' }, { status: 500 })
    }

    // Disparo agendado: retorna imediatamente
    if (isScheduled) {
      return Response.json({
        ok:         true,
        dispatch,
        scheduled:  true,
        total_jobs: targetCommunities.length,
      })
    }

    // Disparo imediato: executa agora
    const result = await executeDispatch(dispatch.id)

    return Response.json({
      ok:         true,
      dispatch_id: dispatch.id,
      sent:        result.sent,
      failed:      result.failed,
      total:       targetCommunities.length,
    })
  } catch (err) {
    if (err instanceof Error && err.message === 'Não autorizado') {
      return Response.json({ error: 'Não autorizado' }, { status: 401 })
    }
    console.error('[dispatch] POST error:', err)
    return Response.json({ error: 'Erro interno' }, { status: 500 })
  }
}

// ─── GET — Listar histórico de disparos ───────────────────────────────────────

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireAuth()
    const { id: surveyId } = await params
    const supabase = createServiceClient()

    const { data: dispatches, error } = await supabase
      .from('survey_dispatches')
      .select(`
        *,
        jobs:survey_dispatch_jobs (
          id, community_id, status, error, retry_count, sent_at, created_at
        )
      `)
      .eq('survey_id', surveyId)
      .eq('is_template', false)
      .order('created_at', { ascending: false })

    if (error) {
      return Response.json({ error: 'Erro ao buscar histórico' }, { status: 500 })
    }

    return Response.json({ dispatches: dispatches ?? [] })
  } catch (err) {
    if (err instanceof Error && err.message === 'Não autorizado') {
      return Response.json({ error: 'Não autorizado' }, { status: 401 })
    }
    return Response.json({ error: 'Erro interno' }, { status: 500 })
  }
}
