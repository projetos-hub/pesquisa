'use server'

import { revalidatePath } from 'next/cache'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { createServiceClient } from '@/lib/supabase-service'

async function requireAuth() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Não autorizado')
  return user
}

export async function updateExpectedResponses(
  surveyId: string,
  communityId: string,
  value: number | null
): Promise<{ error?: string }> {
  try {
    await requireAuth()
  } catch {
    return { error: 'Não autorizado' }
  }

  if (value !== null && (isNaN(value) || value < 0)) {
    return { error: 'Valor inválido' }
  }

  const db = createServiceClient()
  const { error } = await db
    .from('survey_communities')
    .update({ expected_responses: value })
    .eq('survey_id', surveyId)
    .eq('community_id', communityId)

  if (error) {
    return { error: 'Erro ao atualizar: ' + error.message }
  }

  revalidatePath(`/admin/auditoria/${surveyId}`)
  return {}
}
