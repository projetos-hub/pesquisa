'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { createServiceClient } from '@/lib/supabase-service'

async function requireAuth() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Não autorizado')
  return user
}

// ── Atualiza metadados de uma pesquisa ────────────────────────────────────────
export async function updateSurvey(
  id: string,
  formData: FormData
): Promise<{ error?: string }> {
  try {
    await requireAuth()
  } catch {
    return { error: 'Não autorizado' }
  }

  const title          = formData.get('title')          as string
  const status         = formData.get('status')         as string
  const access_control = formData.get('access_control') as string
  const survey_type    = (formData.get('survey_type')   as string) || null
  const open_date      = (formData.get('open_date')     as string) || null
  const close_date     = (formData.get('close_date')    as string) || null

  if (!title?.trim())  return { error: 'Título é obrigatório' }
  if (!status?.trim()) return { error: 'Status é obrigatório' }

  const supabase = createServiceClient()
  const { error } = await supabase
    .from('surveys')
    .update({ 
      title: title.trim(), 
      status, 
      access_control,
      ...(survey_type ? { survey_type } : {}), 
      open_date, 
      close_date 
    })
    .eq('id', id)

  if (error) return { error: error.message }

  revalidatePath(`/admin/surveys/${id}`)
  revalidatePath('/admin/surveys')
  return {}
}

// ── Cria nova pesquisa ────────────────────────────────────────────────────────
export async function createSurvey(formData: FormData): Promise<{ error?: string }> {
  try {
    await requireAuth()
  } catch {
    return { error: 'Não autorizado' }
  }

  const title          = formData.get('title')          as string
  const slug           = formData.get('slug')           as string
  const survey_type    = formData.get('survey_type')    as string
  const access_control = formData.get('access_control') as string || 'aberta'
  const roles          = formData.getAll('target_roles') as string[]

  if (!title?.trim())       return { error: 'Título é obrigatório' }
  if (!slug?.trim())        return { error: 'Slug é obrigatório' }
  if (!roles?.length)       return { error: 'Selecione ao menos um público' }

  // Valida slug: apenas letras minúsculas, números e hífens
  if (!/^[a-z0-9-]+$/.test(slug)) {
    return { error: 'Slug deve conter apenas letras minúsculas, números e hífens' }
  }

  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('surveys')
    .insert({
      title: title.trim(),
      slug: slug.trim(),
      survey_type: survey_type || 'quantitativa',
      access_control,
      target_roles: roles,
      status: 'rascunho',
    })
    .select('id')
    .single()

  if (error) {
    if (error.code === '23505') return { error: 'Já existe uma pesquisa com esse slug' }
    return { error: error.message }
  }

  revalidatePath('/admin/surveys')
  redirect(`/admin/surveys/${data.id}`)
}

// ── Cria nova pergunta ────────────────────────────────────────────────────────
export async function createQuestion(
  surveyId: string,
  formData: FormData
): Promise<{ error?: string; id?: string }> {
  try { await requireAuth() } catch { return { error: 'Não autorizado' } }

  const type        = formData.get('type')        as string
  const key         = formData.get('key')         as string
  const title       = formData.get('title')       as string
  const description = (formData.get('description') as string) || null
  const required    = formData.get('required') === 'true'
  const pergunta       = (formData.get('pergunta')       as string) || ''
  const placeholder    = (formData.get('placeholder')    as string) || ''
  const accept         = (formData.get('accept')         as string) || ''
  const correctAnswer  = (formData.get('correctAnswer')  as string) || ''

  if (!type || !key || !title) return { error: 'Tipo, key e título são obrigatórios' }
  if (!/^[a-z0-9_]+$/.test(key)) return { error: 'Key deve conter apenas letras minúsculas, números e underscore' }

  const supabase = createServiceClient()

  // Próximo order_index
  const { data: existing } = await supabase
    .from('questions')
    .select('order_index')
    .eq('survey_id', surveyId)
    .order('order_index', { ascending: false })
    .limit(1)
  const nextOrder = (existing?.[0]?.order_index ?? -1) + 1

  const settings: Record<string, unknown> = {}
  if (pergunta)      settings.pergunta      = pergunta
  if (placeholder)   settings.placeholder   = placeholder
  if (accept)        settings.accept        = accept
  if (correctAnswer) settings.correctAnswer = correctAnswer

  const { data: created, error } = await supabase
    .from('questions')
    .insert({
      survey_id:   surveyId,
      order_index: nextOrder,
      type,
      key,
      title:       title.trim(),
      description: description?.trim() || null,
      required,
      settings: Object.keys(settings).length ? settings : {},
    })
    .select('id')
    .single()

  if (error) {
    if (error.code === '23505') return { error: 'Já existe uma pergunta com essa key nesta pesquisa' }
    return { error: error.message }
  }

  revalidatePath(`/admin/surveys/${surveyId}`)
  return { id: created.id }
}

// ── Atualiza uma pergunta existente ──────────────────────────────────────────
export async function updateQuestion(
  questionId: string,
  surveyId: string,
  formData: FormData
): Promise<{ error?: string }> {
  try { await requireAuth() } catch { return { error: 'Não autorizado' } }

  const type        = formData.get('type')        as string
  const key         = formData.get('key')         as string
  const title       = formData.get('title')       as string
  const description = (formData.get('description') as string) || null
  const required    = formData.get('required') === 'true'
  const pergunta       = (formData.get('pergunta')       as string) || ''
  const placeholder    = (formData.get('placeholder')    as string) || ''
  const accept         = (formData.get('accept')         as string) || ''
  const correctAnswer  = (formData.get('correctAnswer')  as string) || ''

  if (!type || !key || !title) return { error: 'Tipo, key e título são obrigatórios' }
  if (!/^[a-z0-9_]+$/.test(key)) return { error: 'Key deve conter apenas letras minúsculas, números e underscore' }

  const supabase = createServiceClient()

  const settings: Record<string, unknown> = {}
  if (pergunta)      settings.pergunta      = pergunta
  if (placeholder)   settings.placeholder   = placeholder
  if (accept)        settings.accept        = accept
  if (correctAnswer) settings.correctAnswer = correctAnswer

  const { error } = await supabase
    .from('questions')
    .update({
      type,
      key,
      title:       title.trim(),
      description: description?.trim() || null,
      required,
      settings: Object.keys(settings).length ? settings : {},
    })
    .eq('id', questionId)

  if (error) {
    if (error.code === '23505') return { error: 'Já existe uma pergunta com essa key nesta pesquisa' }
    return { error: error.message }
  }

  revalidatePath(`/admin/surveys/${surveyId}`)
  return {}
}

// ── Salva opções de uma pergunta ─────────────────────────────────────────────
export async function saveQuestionOptions(
  questionId: string,
  surveyId: string,
  labels: string[]
): Promise<{ error?: string }> {
  try { await requireAuth() } catch { return { error: 'Não autorizado' } }

  const supabase = createServiceClient()
  await supabase.from('question_options').delete().eq('question_id', questionId)

  const rows = labels
    .map((l) => l.trim())
    .filter(l => l.length > 0)
    .map((label, i) => ({ question_id: questionId, order_index: i, label, value: `opt_${i}` }))

  if (rows.length > 0) {
    const { error } = await supabase.from('question_options').insert(rows)
    if (error) return { error: error.message }
  }

  revalidatePath(`/admin/surveys/${surveyId}`)
  return {}
}

// ── Deleta pergunta ───────────────────────────────────────────────────────────
export async function deleteQuestion(
  questionId: string,
  surveyId: string
): Promise<{ error?: string }> {
  try { await requireAuth() } catch { return { error: 'Não autorizado' } }

  const supabase = createServiceClient()
  const { error } = await supabase.from('questions').delete().eq('id', questionId)
  if (error) return { error: error.message }

  revalidatePath(`/admin/surveys/${surveyId}`)
  return {}
}

// ── Move pergunta (reordena) ──────────────────────────────────────────────────
export async function moveQuestion(
  questionId: string,
  surveyId: string,
  direction: 'up' | 'down'
): Promise<{ error?: string }> {
  try { await requireAuth() } catch { return { error: 'Não autorizado' } }

  const supabase = createServiceClient()
  const { data: questions } = await supabase
    .from('questions')
    .select('id, order_index')
    .eq('survey_id', surveyId)
    .order('order_index', { ascending: true })

  if (!questions) return { error: 'Perguntas não encontradas' }

  const idx = questions.findIndex(q => q.id === questionId)
  if (idx < 0) return { error: 'Pergunta não encontrada' }

  const swapIdx = direction === 'up' ? idx - 1 : idx + 1
  if (swapIdx < 0 || swapIdx >= questions.length) return {}

  const a = questions[idx]
  const b = questions[swapIdx]

  await supabase.from('questions').update({ order_index: b.order_index }).eq('id', a.id)
  await supabase.from('questions').update({ order_index: a.order_index }).eq('id', b.id)

  revalidatePath(`/admin/surveys/${surveyId}`)
  return {}
}

// ── Adiciona/remove tela de boas-vindas ───────────────────────────────────────
export async function toggleWelcomeStep(
  surveyId: string,
  add: boolean
): Promise<{ error?: string }> {
  try { await requireAuth() } catch { return { error: 'Não autorizado' } }

  const supabase = createServiceClient()

  if (!add) {
    await supabase.from('questions').delete().eq('survey_id', surveyId).eq('type', 'welcome')
    revalidatePath(`/admin/surveys/${surveyId}`)
    return {}
  }

  // Desloca todas as perguntas existentes +1 para abrir o índice 0
  const { data: existing } = await supabase
    .from('questions')
    .select('id, order_index')
    .eq('survey_id', surveyId)
    .order('order_index', { ascending: false })

  for (const q of (existing ?? [])) {
    await supabase.from('questions').update({ order_index: q.order_index + 1 }).eq('id', q.id)
  }

  await supabase.from('questions').insert({
    survey_id:   surveyId,
    order_index: 0,
    type:        'welcome',
    key:         'welcome',
    title:       'Boas-vindas',
    required:    false,
    settings:    {},
  })

  revalidatePath(`/admin/surveys/${surveyId}`)
  return {}
}

// ── Adiciona/remove tela de agradecimento ────────────────────────────────────
export async function toggleThankYouStep(
  surveyId: string,
  add: boolean
): Promise<{ error?: string }> {
  try { await requireAuth() } catch { return { error: 'Não autorizado' } }

  const supabase = createServiceClient()

  if (!add) {
    await supabase.from('questions').delete().eq('survey_id', surveyId).eq('type', 'thankyou')
    revalidatePath(`/admin/surveys/${surveyId}`)
    return {}
  }

  // Busca o último order_index para colocar no final
  const { data: existing } = await supabase
    .from('questions')
    .select('order_index')
    .eq('survey_id', surveyId)
    .order('order_index', { ascending: false })
    .limit(1)

  const nextOrder = (existing?.[0]?.order_index ?? -1) + 1

  await supabase.from('questions').insert({
    survey_id:   surveyId,
    order_index: nextOrder,
    type:        'thankyou',
    key:         'thankyou',
    title:       'Agradecimento',
    required:    false,
    settings:    {},
  })

  revalidatePath(`/admin/surveys/${surveyId}`)
  return {}
}

// ── Deleta pesquisa (e todos os dados relacionados) ───────────────────────────
export async function deleteSurvey(surveyId: string): Promise<{ error?: string }> {
  try { await requireAuth() } catch { return { error: 'Não autorizado' } }

  const supabase = createServiceClient()

  // Deleta na ordem correta para evitar FK violations
  // 1. Audit logs → dispatch jobs → dispatches
  const { data: dispatches } = await supabase
    .from('survey_dispatches').select('id').eq('survey_id', surveyId)
  for (const d of dispatches ?? []) {
    await supabase.from('notification_audit_logs').delete().eq('dispatch_id', d.id)
    await supabase.from('survey_dispatch_jobs').delete().eq('dispatch_id', d.id)
  }
  await supabase.from('survey_dispatches').delete().eq('survey_id', surveyId)

  // 2. Respostas → sessões
  const { data: sessions } = await supabase
    .from('response_sessions').select('id').eq('survey_id', surveyId)
  for (const s of sessions ?? []) {
    await supabase.from('responses').delete().eq('session_id', s.id)
  }
  await supabase.from('response_sessions').delete().eq('survey_id', surveyId)

  // 3. Amostra, comunidades, perguntas
  await supabase.from('survey_sample_lists').delete().eq('survey_id', surveyId)
  await supabase.from('survey_communities').delete().eq('survey_id', surveyId)

  const { data: questions } = await supabase
    .from('questions').select('id').eq('survey_id', surveyId)
  for (const q of questions ?? []) {
    await supabase.from('question_options').delete().eq('question_id', q.id)
  }
  await supabase.from('questions').delete().eq('survey_id', surveyId)

  // 4. Survey
  const { error } = await supabase.from('surveys').delete().eq('id', surveyId)
  if (error) return { error: error.message }

  revalidatePath('/admin/surveys')
  return {}
}
