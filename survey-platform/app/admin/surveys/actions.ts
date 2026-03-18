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

  const title       = formData.get('title')        as string
  const status      = formData.get('status')       as string
  const survey_type = (formData.get('survey_type') as string) || null
  const open_date   = (formData.get('open_date')   as string) || null
  const close_date  = (formData.get('close_date')  as string) || null

  if (!title?.trim())  return { error: 'Título é obrigatório' }
  if (!status?.trim()) return { error: 'Status é obrigatório' }

  const supabase = createServiceClient()
  const { error } = await supabase
    .from('surveys')
    .update({ title: title.trim(), status, ...(survey_type ? { survey_type } : {}), open_date, close_date })
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

  const title       = formData.get('title')       as string
  const slug        = formData.get('slug')        as string
  const survey_type = formData.get('survey_type') as string
  const roles       = formData.getAll('target_roles') as string[]

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
  const pergunta    = (formData.get('pergunta')    as string) || ''
  const placeholder = (formData.get('placeholder') as string) || ''
  const accept      = (formData.get('accept')      as string) || ''

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
  if (pergunta)    settings.pergunta    = pergunta
  if (placeholder) settings.placeholder = placeholder
  if (accept)      settings.accept      = accept

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
