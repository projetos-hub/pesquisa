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
      <aside className="w-56 bg-white border-r border-gray-200 flex flex-col shrink-0">
        <div className="p-4 border-b border-gray-200">
          <p className="text-xs font-semibold text-indigo-600 uppercase tracking-wider mb-0.5">
            Admin
          </p>
          <p className="text-xs text-gray-500 truncate" title={user.email}>
            {user.email}
          </p>
        </div>

        <nav className="flex-1 p-3 space-y-0.5">
          <Link
            href="/admin/surveys"
            className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <span>📋</span>
            Pesquisas
          </Link>
          <Link
            href="/admin/export"
            className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <span>📥</span>
            Exportar
          </Link>
          <Link
            href="/admin/dispatch"
            className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <span>📢</span>
            Disparos
          </Link>
          <Link
            href="/admin/communities"
            className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <span>🎨</span>
            Identidade Visual
          </Link>
        </nav>

        <div className="p-3 border-t border-gray-200">
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
