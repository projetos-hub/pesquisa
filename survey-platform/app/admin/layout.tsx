import { createServerSupabaseClient } from '@/lib/supabase-server'

export const metadata = { title: 'Mini App Layers - Pesquisa' }

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return <>{children}</>

  return <>{children}</>
}
