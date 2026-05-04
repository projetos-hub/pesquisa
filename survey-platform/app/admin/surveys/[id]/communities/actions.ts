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

export async function saveCommunityTheme(
  surveyId: string,
  communityId: string,
  theme: {
    nomeEscola?: string
    primaryColor?: string
    secondaryColor?: string
    logo?: string
    indicacaoLink?: string
  }
) {
  try {
    await requireAuth()

    if (!surveyId || !communityId) {
      return { error: 'Parâmetros inválidos' }
    }

    // Valida cores (hex format básico)
    if (theme.primaryColor && !/^#[0-9A-F]{6}$/i.test(theme.primaryColor)) {
      return { error: 'Cor primária inválida' }
    }
    if (theme.secondaryColor && !/^#[0-9A-F]{6}$/i.test(theme.secondaryColor)) {
      return { error: 'Cor secundária inválida' }
    }

    const supabase = createServiceClient()

    // Monta o objeto theme (remove campos undefined)
    const themeData: Record<string, unknown> = {}
    if (theme.nomeEscola)    themeData.nomeEscola    = theme.nomeEscola
    if (theme.primaryColor)  themeData.primaryColor  = theme.primaryColor
    if (theme.secondaryColor)themeData.secondaryColor = theme.secondaryColor
    if (theme.logo)          themeData.logo          = theme.logo
    if (theme.indicacaoLink) themeData.indicacaoLink = theme.indicacaoLink
    // Permitir limpar indicacaoLink (string vazia = remover)
    if (theme.indicacaoLink === '') delete themeData.indicacaoLink

    const { error } = await supabase
      .from('survey_communities')
      .update({ theme: themeData })
      .eq('survey_id', surveyId)
      .eq('community_id', communityId)

    if (error) {
      console.error('[saveCommunityTheme] update error:', error)
      return { error: 'Erro ao salvar tema' }
    }

    revalidatePath(`/admin/surveys/${surveyId}/communities`)
    return {}
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erro desconhecido'
    console.error('[saveCommunityTheme]', msg)
    return { error: msg }
  }
}

export async function inheritThemesFromPreviousSurvey(surveyId: string) {
  try {
    await requireAuth()
    if (!surveyId) return { error: 'Parâmetros inválidos' }

    const supabase = createServiceClient()

    const { data: communities } = await supabase
      .from('survey_communities')
      .select('community_id')
      .eq('survey_id', surveyId)

    if (!communities?.length) return { error: 'Nenhuma comunidade nesta pesquisa' }

    let updated = 0
    for (const { community_id } of communities) {
      const { data: recent } = await supabase
        .from('survey_communities')
        .select('theme')
        .eq('community_id', community_id)
        .neq('survey_id', surveyId)
        .not('theme', 'is', null)
        .order('id', { ascending: false })
        .limit(1)
        .single()

      if (recent?.theme && Object.keys(recent.theme as object).length > 0) {
        await supabase
          .from('survey_communities')
          .update({ theme: recent.theme })
          .eq('survey_id', surveyId)
          .eq('community_id', community_id)
        updated++
      }
    }

    revalidatePath(`/admin/surveys/${surveyId}/communities`)
    return { updated }
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erro desconhecido'
    console.error('[inheritThemesFromPreviousSurvey]', msg)
    return { error: msg }
  }
}
