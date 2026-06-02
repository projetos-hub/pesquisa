import { createServerSupabaseClient } from '@/lib/supabase-server'
import LogoutButton from './LogoutButton'
import SidebarNav from './SidebarNav'

export const metadata = { title: 'Admin — Layers Pesquisas' }

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  // proxy.ts é a única fonte de redirects — o layout apenas estrutura visualmente
  if (!user) return <>{children}</>

  const emailInitial = (user.email ?? 'A').charAt(0).toUpperCase()

  return (
    <div className="min-h-screen bg-[#F8F9FA] flex">
      {/* ── Sidebar ──────────────────────────────────────────── */}
      <aside className="w-56 bg-[#1E2433] flex flex-col shrink-0 fixed inset-y-0 left-0 z-40">
        {/* Logo area */}
        <div className="px-4 py-4 border-b border-white/10">
          <div className="flex items-center gap-2 mb-3">
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center text-white font-black text-sm shrink-0"
              style={{ backgroundColor: '#F7941D' }}
            >
              R
            </div>
            <div>
              <p className="text-white font-bold text-[13px] leading-none tracking-tight">
                RAIZ
              </p>
              <p className="text-white/50 text-[10px] leading-none tracking-widest mt-0.5">
                educação
              </p>
            </div>
          </div>
          <p className="text-[10px] font-semibold text-white/30 uppercase tracking-[0.12em]">
            Admin
          </p>
        </div>

        {/* Navigation */}
        <SidebarNav />

        {/* User / logout */}
        <div className="p-3 border-t border-white/10">
          <div className="flex items-center gap-2.5 px-2 py-1.5 mb-1">
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
              style={{ backgroundColor: '#F7941D' }}
            >
              {emailInitial}
            </div>
            <p
              className="text-white/50 text-[11px] truncate flex-1"
              title={user.email ?? ''}
            >
              {user.email}
            </p>
          </div>
          <LogoutButton />
        </div>
      </aside>

      {/* ── Content ──────────────────────────────────────────── */}
      <main className="flex-1 overflow-auto ml-56 min-h-screen">
        {children}
      </main>
    </div>
  )
}
