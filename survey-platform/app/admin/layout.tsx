import Link from 'next/link'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import LogoutButton from './LogoutButton'

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

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* ── Sidebar ──────────────────────────────────────────── */}
      <aside className="w-56 bg-[#1E2433] border-r border-[#2D3748] flex flex-col shrink-0">
        <div className="p-4 border-b border-[#2D3748]">
          <p className="text-xs font-semibold text-[#F7941D] uppercase tracking-wider mb-0.5">
            Admin
          </p>
          <p className="text-xs text-[#718096] truncate" title={user.email}>
            {user.email}
          </p>
        </div>

        <nav className="flex-1 p-3 space-y-0.5">
          <Link
            href="/admin/surveys"
            className="flex items-center gap-2 px-3 py-2 text-sm text-[#A0AEC0] rounded-lg hover:bg-[#2D3748] transition-colors"
          >
            <span>📋</span>
            Pesquisas
          </Link>
          <Link
            href="/admin/export"
            className="flex items-center gap-2 px-3 py-2 text-sm text-[#A0AEC0] rounded-lg hover:bg-[#2D3748] transition-colors"
          >
            <span>📥</span>
            Exportar
          </Link>
          <Link
            href="/admin/dispatch"
            className="flex items-center gap-2 px-3 py-2 text-sm text-[#A0AEC0] rounded-lg hover:bg-[#2D3748] transition-colors"
          >
            <span>📢</span>
            Disparos
          </Link>
          <Link
            href="/admin/communities"
            className="flex items-center gap-2 px-3 py-2 text-sm text-[#A0AEC0] rounded-lg hover:bg-[#2D3748] transition-colors"
          >
            <span>🎨</span>
            Identidade Visual
          </Link>
          <Link
            href="/admin/reports"
            className="flex items-center gap-2 px-3 py-2 text-sm text-[#A0AEC0] rounded-lg hover:bg-[#2D3748] transition-colors"
          >
            <span>📊</span>
            Relatórios
          </Link>
          <Link
            href="/admin/audit"
            className="flex items-center gap-2 px-3 py-2 text-sm text-[#A0AEC0] rounded-lg hover:bg-[#2D3748] transition-colors"
          >
            <span>🔍</span>
            Auditoria
          </Link>
          <Link
            href="/admin/analytics"
            className="flex items-center gap-2 px-3 py-2 text-sm text-[#A0AEC0] rounded-lg hover:bg-[#2D3748] transition-colors"
          >
            <span>📈</span>
            Analytics
          </Link>
        </nav>

        <div className="p-3 border-t border-[#2D3748]">
          <LogoutButton />
        </div>
      </aside>

      {/* ── Content ──────────────────────────────────────────── */}
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  )
}
