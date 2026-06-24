'use server'

import { revalidatePath, revalidateTag } from 'next/cache'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { createServiceClient } from '@/lib/supabase-service'

const COMMUNITY_IDENTITY_KEYS = [
  'nomeEscola',
  'primaryColor',
  'secondaryColor',
  'logo',
] as const

function removeLegacyCommunityIdentity(theme: Record<string, unknown> | null | undefined) {
  const cleanTheme = { ...(theme ?? {}) }
  for (const key of COMMUNITY_IDENTITY_KEYS) {
    delete cleanTheme[key]
  }
  return cleanTheme
}

async function requireAuth() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Nao autorizado')
}

export async function installCommunity(surveyId: string, formData: FormData) {
  try {
    await requireAuth()

    const communityId = (formData.get('communityId') as string)?.trim().replace('@', '')
    const status = (formData.get('status') as string) || 'ativa'

    if (!communityId) return { error: 'ID da comunidade e obrigatorio' }

    const supabase = createServiceClient()

    const { data: existingRow } = await supabase
      .from('survey_communities')
      .select('theme')
      .eq('survey_id', surveyId)
      .eq('community_id', communityId)
      .maybeSingle()

    const themeToUse = removeLegacyCommunityIdentity(
      existingRow?.theme as Record<string, unknown> | null | undefined
    )

    const { error } = await supabase
      .from('survey_communities')
      .upsert(
        { survey_id: surveyId, community_id: communityId, status, active: true, theme: themeToUse },
        { onConflict: 'survey_id,community_id', ignoreDuplicates: false }
      )

    if (error) return { error: 'Erro ao instalar: ' + error.message }

    revalidatePath(`/admin/surveys/${surveyId}`)
    revalidateTag('survey-config', 'default')
    return {}
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Erro desconhecido' }
  }
}

export async function toggleCommunityActive(surveyId: string, communityId: string, active: boolean): Promise<{ error?: string }> {
  try {
    await requireAuth()
    const supabase = createServiceClient()
    const { error } = await supabase
      .from('survey_communities')
      .update({ active })
      .eq('survey_id', surveyId)
      .eq('community_id', communityId)
    if (error) return { error: error.message }
    revalidatePath(`/admin/surveys/${surveyId}`)
    revalidateTag('survey-config', 'default')
    return {}
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Erro desconhecido' }
  }
}

export async function updateCommunityStatus(surveyId: string, communityId: string, status: string): Promise<{ error?: string }> {
  try {
    await requireAuth()
    const supabase = createServiceClient()
    const { error } = await supabase
      .from('survey_communities')
      .update({ status })
      .eq('survey_id', surveyId)
      .eq('community_id', communityId)
    if (error) return { error: error.message }
    revalidatePath(`/admin/surveys/${surveyId}`)
    revalidateTag('survey-config', 'default')
    return {}
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Erro desconhecido' }
  }
}

export async function removeCommunity(surveyId: string, communityId: string) {
  try {
    await requireAuth()
    const supabase = createServiceClient()
    await supabase
      .from('survey_communities')
      .delete()
      .eq('survey_id', surveyId)
      .eq('community_id', communityId)
    revalidatePath(`/admin/surveys/${surveyId}`)
  } catch {
    // Mantem comportamento anterior: remover comunidade nao deve quebrar a tela.
  }
}
