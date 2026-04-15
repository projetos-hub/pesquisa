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

interface ThemeData {
  nomeEscola?: string
  primaryColor?: string
  secondaryColor?: string
  logo?: string
}

export async function saveCommunityTheme(communityId: string, theme: ThemeData) {
  try {
    // Valida autenticação de admin
    const user = await requireAuth()
    if (!user) {
      return { error: 'Não autorizado' }
    }

    const supabase = createServiceClient()

    // Valida que a comunidade existe em ao menos uma pesquisa
    const { data: existing, error: checkError } = await supabase
      .from('survey_communities')
      .select('id', { count: 'exact' })
      .eq('community_id', communityId)
      .limit(1)

    if (checkError || !existing || existing.length === 0) {
      return { error: 'Comunidade não encontrada' }
    }

    // Atualiza o theme em TODAS as pesquisas desta comunidade
    // (porque o tema é da escola, não da pesquisa)
    const { error: updateError } = await supabase
      .from('survey_communities')
      .update({ theme })
      .eq('community_id', communityId)

    if (updateError) {
      console.error('[saveCommunityTheme] update error:', updateError)
      return { error: 'Erro ao salvar tema' }
    }

    revalidatePath('/admin/communities')
    return { error: null }
  } catch (error) {
    console.error('[saveCommunityTheme] error:', error)
    return { error: 'Erro interno do servidor' }
  }
}
