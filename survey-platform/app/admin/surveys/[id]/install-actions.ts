'use server'

import { revalidatePath, revalidateTag } from 'next/cache'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { createServiceClient } from '@/lib/supabase-service'

async function requireAuth() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Não autorizado')
}

export async function installCommunity(surveyId: string, formData: FormData) {
  try {
    await requireAuth()

    const communityId = (formData.get('communityId') as string)?.trim().replace('@', '')
    const status      = (formData.get('status') as string) || 'ativa'

    if (!communityId) return { error: 'ID da comunidade é obrigatório' }

    const supabase = createServiceClient()

    // Buscar tema da tabela communities (fonte única de verdade)
    const { data: community } = await supabase
      .from('communities')
      .select('nome_escola, primary_color, secondary_color, logo')
      .eq('community_id', communityId)
      .maybeSingle()

    const inheritedTheme = community
      ? {
          nomeEscola:     community.nome_escola,
          primaryColor:   community.primary_color,
          secondaryColor: community.secondary_color,
          logo:           community.logo,
        }
      : {}

    // Preservar override existente (ex: indicacaoLink) se já instalada
    const { data: existingRow } = await supabase
      .from('survey_communities')
      .select('theme')
      .eq('survey_id', surveyId)
      .eq('community_id', communityId)
      .maybeSingle()

    const themeToUse = (existingRow?.theme && Object.keys(existingRow.theme).length > 0)
      ? { ...inheritedTheme, ...existingRow.theme }
      : inheritedTheme

    const { error } = await supabase
      .from('survey_communities')
      .upsert(
        { survey_id: surveyId, community_id: communityId, status, active: true, theme: themeToUse },
        { onConflict: 'survey_id,community_id', ignoreDuplicates: false }
      )

    if (error) return { error: 'Erro ao instalar: ' + error.message }

    revalidatePath(`/admin/surveys/${surveyId}`)
    revalidateTag('survey-config')
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
    revalidateTag('survey-config')
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
    revalidateTag('survey-config')
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
  } catch { /* silencia */ }
}
