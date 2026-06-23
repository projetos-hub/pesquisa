'use server'

import { revalidatePath, revalidateTag } from 'next/cache'
import { createServiceClient } from '@/lib/supabase-service'
import { requireAuth } from './actions-helpers'

export async function createQuestion(
  surveyId: string,
  formData: FormData
): Promise<{ error?: string; id?: string }> {
  try { await requireAuth() } catch { return { error: 'NÃ£o autorizado' } }

  const type        = formData.get('type')        as string
  const key         = formData.get('key')         as string
  const title       = formData.get('title')       as string
  const description = (formData.get('description') as string) || null
  const required    = formData.get('required') === 'true'
  const pergunta       = (formData.get('pergunta')       as string) || ''
  const placeholder    = (formData.get('placeholder')    as string) || ''
  const accept         = (formData.get('accept')         as string) || ''
  const correctAnswer  = (formData.get('correctAnswer')  as string) || ''

  if (!type || !key || !title) return { error: 'Tipo, key e tÃ­tulo sÃ£o obrigatÃ³rios' }
  if (!/^[a-z0-9_]+$/.test(key)) return { error: 'Key deve conter apenas letras minÃºsculas, nÃºmeros e underscore' }

  const supabase = createServiceClient()

  // PrÃ³ximo order_index
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
    if (error.code === '23505') return { error: 'JÃ¡ existe uma pergunta com essa key nesta pesquisa' }
    return { error: error.message }
  }

  // Auto-criar question_options para scale/radio/checkbox a partir do textarea
  if (['scale', 'radio', 'checkbox'].includes(type) && accept) {
    const labels = accept.split('\n').map(l => l.trim()).filter(l => l.length > 0)
    if (labels.length > 0) {
      const rows = labels.map((label, i) => ({
        question_id: created.id,
        order_index: i,
        label,
        value: `opt_${i}`,
      }))
      await supabase.from('question_options').insert(rows)
    }
  }

  revalidatePath(`/admin/surveys/${surveyId}`)
  revalidateTag('survey-config', 'default')
  return { id: created.id }
}

// â”€â”€ Atualiza uma pergunta existente â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export async function updateQuestion(
  questionId: string,
  surveyId: string,
  formData: FormData
): Promise<{ error?: string }> {
  try { await requireAuth() } catch { return { error: 'NÃ£o autorizado' } }

  const type        = formData.get('type')        as string
  const key         = formData.get('key')         as string
  const title       = formData.get('title')       as string
  const description = (formData.get('description') as string) || null
  const required    = formData.get('required') === 'true'
  const pergunta       = (formData.get('pergunta')       as string) || ''
  const placeholder    = (formData.get('placeholder')    as string) || ''
  const accept         = (formData.get('accept')         as string) || ''
  const correctAnswer  = (formData.get('correctAnswer')  as string) || ''

  if (!type || !key || !title) return { error: 'Tipo, key e tÃ­tulo sÃ£o obrigatÃ³rios' }
  if (!/^[a-z0-9_]+$/.test(key)) return { error: 'Key deve conter apenas letras minÃºsculas, nÃºmeros e underscore' }

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
    if (error.code === '23505') return { error: 'JÃ¡ existe uma pergunta com essa key nesta pesquisa' }
    return { error: error.message }
  }

  revalidatePath(`/admin/surveys/${surveyId}`)
  revalidateTag('survey-config', 'default')
  return {}
}

// â”€â”€ Salva opÃ§Ãµes de uma pergunta â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export async function saveQuestionOptions(
  questionId: string,
  surveyId: string,
  labels: string[]
): Promise<{ error?: string }> {
  try { await requireAuth() } catch { return { error: 'NÃ£o autorizado' } }

  const supabase = createServiceClient()
  const { error } = await supabase.rpc('admin_replace_question_options', {
    p_question_id: questionId,
    p_labels:      labels,
  })
  if (error) return { error: error.message }

  revalidatePath(`/admin/surveys/${surveyId}`)
  revalidateTag('survey-config', 'default')
  return {}
}

// â”€â”€ Deleta pergunta â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export async function deleteQuestion(
  questionId: string,
  surveyId: string
): Promise<{ error?: string }> {
  try { await requireAuth() } catch { return { error: 'NÃ£o autorizado' } }

  const supabase = createServiceClient()
  const { error } = await supabase.from('questions').delete().eq('id', questionId)
  if (error) return { error: error.message }

  revalidatePath(`/admin/surveys/${surveyId}`)
  revalidateTag('survey-config', 'default')
  return {}
}

// â”€â”€ Move pergunta (reordena) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export async function moveQuestion(
  questionId: string,
  surveyId: string,
  direction: 'up' | 'down'
): Promise<{ error?: string }> {
  try { await requireAuth() } catch { return { error: 'NÃ£o autorizado' } }

  const supabase = createServiceClient()
  const { data: questions } = await supabase
    .from('questions')
    .select('id, order_index')
    .eq('survey_id', surveyId)
    .order('order_index', { ascending: true })

  if (!questions) return { error: 'Perguntas nÃ£o encontradas' }

  const idx = questions.findIndex(q => q.id === questionId)
  if (idx < 0) return { error: 'Pergunta nÃ£o encontrada' }

  const swapIdx = direction === 'up' ? idx - 1 : idx + 1
  if (swapIdx < 0 || swapIdx >= questions.length) return {}

  const a = questions[idx]
  const b = questions[swapIdx]

  await supabase.from('questions').update({ order_index: b.order_index }).eq('id', a.id)
  await supabase.from('questions').update({ order_index: a.order_index }).eq('id', b.id)

  revalidatePath(`/admin/surveys/${surveyId}`)
  return {}
}

// â”€â”€ Adiciona/remove tela de boas-vindas â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export async function toggleWelcomeStep(
  surveyId: string,
  add: boolean
): Promise<{ error?: string; id?: string }> {
  try { await requireAuth() } catch { return { error: 'NÃ£o autorizado' } }

  const supabase = createServiceClient()

  if (!add) {
    await supabase.from('questions').delete().eq('survey_id', surveyId).eq('type', 'welcome')
    revalidatePath(`/admin/surveys/${surveyId}`)
    revalidateTag('survey-config', 'default')
    return {}
  }

  // Desloca todas as perguntas existentes +1 para abrir o Ã­ndice 0
  const { data: existing } = await supabase
    .from('questions')
    .select('id, order_index')
    .eq('survey_id', surveyId)
    .order('order_index', { ascending: false })

  for (const q of (existing ?? [])) {
    await supabase.from('questions').update({ order_index: q.order_index + 1 }).eq('id', q.id)
  }

  const { data: inserted } = await supabase.from('questions').insert({
    survey_id:   surveyId,
    order_index: 0,
    type:        'welcome',
    key:         'welcome',
    title:       'Boas-vindas',
    required:    false,
    settings:    {},
  }).select('id').single()

  revalidatePath(`/admin/surveys/${surveyId}`)
  revalidateTag('survey-config', 'default')
  return { id: inserted?.id }
}

// â”€â”€ Adiciona/remove tela de agradecimento â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export async function toggleThankYouStep(
  surveyId: string,
  add: boolean
): Promise<{ error?: string; id?: string }> {
  try { await requireAuth() } catch { return { error: 'NÃ£o autorizado' } }

  const supabase = createServiceClient()

  if (!add) {
    await supabase.from('questions').delete().eq('survey_id', surveyId).eq('type', 'thankyou')
    revalidatePath(`/admin/surveys/${surveyId}`)
    revalidateTag('survey-config', 'default')
    return {}
  }

  // Busca o Ãºltimo order_index para colocar no final
  const { data: existing } = await supabase
    .from('questions')
    .select('order_index')
    .eq('survey_id', surveyId)
    .order('order_index', { ascending: false })
    .limit(1)

  const nextOrder = (existing?.[0]?.order_index ?? -1) + 1

  const { data: inserted } = await supabase.from('questions').insert({
    survey_id:   surveyId,
    order_index: nextOrder,
    type:        'thankyou',
    key:         'thankyou',
    title:       'Agradecimento',
    required:    false,
    settings:    {},
  }).select('id').single()

  revalidatePath(`/admin/surveys/${surveyId}`)
  revalidateTag('survey-config', 'default')
  return { id: inserted?.id }
}

