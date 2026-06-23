'use server'

import { revalidatePath, revalidateTag } from 'next/cache'
import { createServiceClient } from '@/lib/supabase-service'
import { requireAuth } from './actions-helpers'

// â”€â”€ Duplica template de pesquisa â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export async function duplicateSurvey(
  surveyId: string
): Promise<{ error?: string; surveyId?: string }> {
  try { await requireAuth() } catch { return { error: 'NÃ£o autorizado' } }

  const supabase = createServiceClient()
  const { data: createdId, error } = await supabase.rpc('admin_duplicate_survey_template', {
    p_survey_id: surveyId,
  })

  if (error || !createdId) return { error: error?.message || 'Erro ao criar cÃ³pia' }

  revalidatePath('/admin/surveys')
  revalidatePath(`/admin/surveys/${createdId}`)
  revalidateTag('survey-config', 'default')

  return { surveyId: createdId }
}

// â”€â”€ Deleta pesquisa (e todos os dados relacionados) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export async function deleteSurvey(surveyId: string): Promise<{ error?: string }> {
  try { await requireAuth() } catch { return { error: 'NÃ£o autorizado' } }

  const supabase = createServiceClient()
  const { error } = await supabase.rpc('admin_delete_survey_cascade', {
    p_survey_id: surveyId,
  })
  if (error) return { error: error.message }

  revalidatePath('/admin/surveys')
  revalidateTag('survey-config', 'default')
  return {}
}
