// GET  /api/admin/surveys/[id]/dispatch/templates — Listar templates
// POST /api/admin/surveys/[id]/dispatch/templates — Salvar dispatch como template

import { z } from 'zod'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { createServiceClient } from '@/lib/supabase-service'

async function requireAuth() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Não autorizado')
  return user
}

// ─── GET — Listar templates ───────────────────────────────────────────────────

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireAuth()
    const { id: surveyId } = await params
    const supabase = createServiceClient()

    const { data: templates, error } = await supabase
      .from('survey_dispatches')
      .select(
        'id, template_name, title, body, channels, target_scope, target_roles,' +
        'push_title, push_body, email_title, email_body, email_action_label,' +
        'email_background_url, target_community_ids, target_group_alias, created_at'
      )
      .eq('survey_id', surveyId)
      .eq('is_template', true)
      .order('created_at', { ascending: false })

    if (error) {
      return Response.json({ error: 'Erro ao buscar templates' }, { status: 500 })
    }

    return Response.json({ templates: templates ?? [] })
  } catch (err) {
    if (err instanceof Error && err.message === 'Não autorizado') {
      return Response.json({ error: 'Não autorizado' }, { status: 401 })
    }
    return Response.json({ error: 'Erro interno' }, { status: 500 })
  }
}

// ─── POST — Salvar template a partir de dispatch existente ────────────────────

const SaveTemplateSchema = z.object({
  dispatch_id:   z.string().uuid(),
  template_name: z.string().min(1).max(100),
})

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireAuth()
    const { id: surveyId } = await params
    const supabase = createServiceClient()

    const raw = await request.json() as unknown
    const parsed = SaveTemplateSchema.safeParse(raw)
    if (!parsed.success) {
      return Response.json(
        { error: 'Dados inválidos', details: parsed.error.flatten() },
        { status: 400 },
      )
    }

    // Busca o dispatch original para clonar como template
    const { data: source } = await supabase
      .from('survey_dispatches')
      .select('*')
      .eq('id', parsed.data.dispatch_id)
      .eq('survey_id', surveyId)
      .single()

    if (!source) {
      return Response.json({ error: 'Dispatch não encontrado' }, { status: 404 })
    }

    // Cria cópia como template
    const { data: template, error } = await supabase
      .from('survey_dispatches')
      .insert({
        survey_id:            surveyId,
        title:                source.title,
        body:                 source.body,
        push_title:           source.push_title,
        push_body:            source.push_body,
        email_title:          source.email_title,
        email_body:           source.email_body,
        email_action_label:   source.email_action_label,
        email_background_url: source.email_background_url,
        channels:             source.channels,
        target_scope:         source.target_scope,
        target_community_ids: source.target_community_ids,
        target_group_alias:   source.target_group_alias,
        target_roles:         source.target_roles,
        status:               'draft',
        is_template:          true,
        template_name:        parsed.data.template_name,
        created_by:           source.created_by,
      })
      .select('id, template_name, title')
      .single()

    if (error) {
      return Response.json({ error: 'Erro ao salvar template' }, { status: 500 })
    }

    return Response.json({ ok: true, template })
  } catch (err) {
    if (err instanceof Error && err.message === 'Não autorizado') {
      return Response.json({ error: 'Não autorizado' }, { status: 401 })
    }
    return Response.json({ error: 'Erro interno' }, { status: 500 })
  }
}
