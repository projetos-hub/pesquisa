import { createServerSupabaseClient } from '@/lib/supabase-server'

export function toUTCIso(localStr: string | null): string | null {
  if (!localStr) return null
  return new Date(localStr + ':00-03:00').toISOString()
}

export async function requireAuth() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Não autorizado')
  return user
}
