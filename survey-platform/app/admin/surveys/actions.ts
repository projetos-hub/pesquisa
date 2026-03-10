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

  const title      = formData.get('title')      as string
  const status     = formData.get('status')     as string
  const open_date  = (formData.get('open_date')  as string) || null
  const close_date = (formData.get('close_date') as string) || null

  if (!title?.trim())  return { error: 'Título é obrigatório' }
  if (!status?.trim()) return { error: 'Status é obrigatório' }

  const supabase = createServiceClient()
  const { error } = await supabase
    .from('surveys')
    .update({ title: title.trim(), status, open_date, close_date })
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
