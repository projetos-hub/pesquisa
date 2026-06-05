import Link from 'next/link'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import LogoutButton from './LogoutButton'

// Inline SVG icons — lucide-compatible paths, 48×48, raiz-orange
function IconClipboardList() {
  return (
    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#F7941D" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
      <path d="M12 11h4M12 16h4M8 11h.01M8 16h.01" />
    </svg>
  )
}

function IconBell() {
  return (
    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#F7941D" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  )
}

function IconDownload() {
  return (
    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#F7941D" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  )
}

function IconPalette() {
  return (
    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#F7941D" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="13.5" cy="6.5" r=".5" fill="#F7941D" />
      <circle cx="17.5" cy="10.5" r=".5" fill="#F7941D" />
      <circle cx="8.5" cy="7.5" r=".5" fill="#F7941D" />
      <circle cx="6.5" cy="12.5" r=".5" fill="#F7941D" />
      <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z" />
    </svg>
  )
}

function IconBarChart2() {
  return (
    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#F7941D" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="18" y1="20" x2="18" y2="10" />
      <line x1="12" y1="20" x2="12" y2="4" />
      <line x1="6" y1="20" x2="6" y2="14" />
    </svg>
  )
}

interface SectionCard {
  href: string
  icon: React.ReactNode
  title: string
  description: string
}

const sections: SectionCard[] = [
  {
    href: '/admin/surveys',
    icon: <IconClipboardList />,
    title: 'Pesquisas',
    description: 'Criar e gerenciar surveys de CSAT',
  },
  {
    href: '/admin/dispatch',
    icon: <IconBell />,
    title: 'Disparos',
    description: 'Enviar notificações push e email via Layers',
  },
  {
    href: '/admin/export',
    icon: <IconDownload />,
    title: 'Exportar',
    description: 'Baixar respostas em CSV',
  },
  {
    href: '/admin/communities',
    icon: <IconPalette />,
    title: 'Identidade Visual',
    description: 'Temas e logos por comunidade/escola',
  },
  {
    href: '/admin/auditoria',
    icon: <IconBarChart2 />,
    title: 'Auditoria',
    description: 'Métricas, disparos e timeline',
  },
]

export default async function AdminHomePage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  return (
    <div className="min-h-screen bg-[#F9FAFB] flex flex-col items-center justify-center px-6 py-16">
      {/* Header */}
      <div className="text-center mb-14">
        <h1 className="text-2xl font-bold text-[#1E2433] mb-2">
          Layers Pesquisas
        </h1>
        <p className="text-sm text-gray-400">
          Plataforma de gestão de surveys CSAT
        </p>
      </div>

      {/* Section cards grid */}
      <div className="w-full max-w-4xl">
        {/* Row 1 — 3 cards */}
        <div className="flex flex-wrap justify-center gap-6 mb-6">
          {sections.slice(0, 3).map((section) => (
            <Link
              key={section.href}
              href={section.href}
              className="rounded-xl border border-gray-200 bg-white p-8 min-h-[180px] w-[280px] flex flex-col gap-4 cursor-pointer transition-all duration-150 hover:border-[#F7941D] hover:shadow-md hover:scale-[1.02]"
            >
              <div>{section.icon}</div>
              <div>
                <p className="text-xl font-semibold text-gray-900 mb-1">
                  {section.title}
                </p>
                <p className="text-sm text-gray-500 leading-snug">
                  {section.description}
                </p>
              </div>
            </Link>
          ))}
        </div>

        {/* Row 2 — 2 cards */}
        <div className="flex flex-wrap justify-center gap-6">
          {sections.slice(3).map((section) => (
            <Link
              key={section.href}
              href={section.href}
              className="rounded-xl border border-gray-200 bg-white p-8 min-h-[180px] w-[280px] flex flex-col gap-4 cursor-pointer transition-all duration-150 hover:border-[#F7941D] hover:shadow-md hover:scale-[1.02]"
            >
              <div>{section.icon}</div>
              <div>
                <p className="text-xl font-semibold text-gray-900 mb-1">
                  {section.title}
                </p>
                <p className="text-sm text-gray-500 leading-snug">
                  {section.description}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Footer */}
      <footer className="mt-14 flex items-center gap-4 text-xs text-gray-400">
        {user?.email && (
          <span>{user.email}</span>
        )}
        <LogoutButton />
      </footer>
    </div>
  )
}
