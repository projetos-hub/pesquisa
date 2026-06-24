'use server'

import { revalidatePath, revalidateTag } from 'next/cache'
import { redirect } from 'next/navigation'
import { createServiceClient } from '@/lib/supabase-service'
import { requireAuth, toUTCIso } from './actions-helpers'

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
  const open_date      = toUTCIso((formData.get('open_date')  as string) || null)
  const close_date     = toUTCIso((formData.get('close_date') as string) || null)

  if (!title?.trim())  return { error: 'Título é obrigatório' }
  if (!status?.trim()) return { error: 'Status é obrigatório' }

  if (open_date && close_date && new Date(open_date) >= new Date(close_date)) {
    return { error: 'Data de abertura deve ser anterior ao encerramento' }
  }

  const thankyouMessage = (formData.get('thankyouMessage') as string) || ''
  const thankyouTextAlign = (formData.get('thankyouTextAlign') as string) || ''

  const supabase = createServiceClient()

  const { data: existingSurvey } = await supabase
    .from('surveys')
    .select('settings')
    .eq('id', id)
    .single()

  const existingSettings = (existingSurvey?.settings ?? {}) as Record<string, unknown>
  const existingTheme = (existingSettings.theme ?? {}) as Record<string, unknown>

  const newTheme = { ...existingTheme }
  if (thankyouMessage) {
    newTheme.thankyouMessage = thankyouMessage
  } else {
    delete newTheme.thankyouMessage
  }
  if (['left', 'center', 'right', 'justify'].includes(thankyouTextAlign)) {
    newTheme.thankyouTextAlign = thankyouTextAlign
  } else {
    delete newTheme.thankyouTextAlign
  }

  const newSettings = {
    ...existingSettings,
    theme: Object.keys(newTheme).length > 0 ? newTheme : undefined,
  }

  const { error } = await supabase
    .from('surveys')
    .update({
      title: title.trim(),
      status,
      access_control,
      ...(survey_type ? { survey_type } : {}),
      open_date,
      close_date,
      settings: newSettings,
    })
    .eq('id', id)

  if (error) return { error: error.message }

  revalidatePath(`/admin/surveys/${id}`)
  revalidatePath('/admin/surveys')
  revalidateTag('survey-config', 'default')
  return {}
}

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

  if (!title?.trim()) return { error: 'Título é obrigatório' }
  if (!slug?.trim())  return { error: 'Slug é obrigatório' }
  if (!roles?.length) return { error: 'Selecione ao menos um público' }

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
