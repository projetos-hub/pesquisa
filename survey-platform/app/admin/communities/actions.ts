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
  communityId: string,
  theme: { nomeEscola?: string; primaryColor?: string; secondaryColor?: string; logo?: string }
) {
  try {
    await requireAuth()
    const supabase = createServiceClient()

    const { error } = await supabase
      .from('communities')
      .upsert({
        community_id:    communityId,
        nome_escola:     theme.nomeEscola     ?? '',
        primary_color:   theme.primaryColor   ?? '#667eea',
        secondary_color: theme.secondaryColor ?? '#764ba2',
        logo:            theme.logo           ?? '',
        updated_at:      new Date().toISOString(),
      }, { onConflict: 'community_id' })

    if (error) return { error: 'Erro ao salvar tema: ' + error.message }

    revalidatePath('/admin/communities')
    return { error: null }
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Erro interno' }
  }
}
