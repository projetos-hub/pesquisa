import Link from 'next/link'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import {
  ClipboardListIcon,
  DownloadIcon,
  BellIcon,
  PaletteIcon,
  BarChart3Icon,
  PlusIcon,
  UsersIcon,
  MessageSquareIcon,
  ActivityIcon,
} from '@/app/admin/icons'

export default async function AdminHomePage() {
  const supabase = await createServerSupabaseClient()

  // Fetch summary stats
  const [
    { count: totalSurveys },
    { count: activeSurveys },
    { count: totalResponses },
    { count: totalCommunities },
  ] = await Promise.all([
    supabase.from('surveys').select('*', { count: 'exact', head: true }),
    supabase.from('surveys').select('*', { count: 'exact', head: true }).eq('status', 'ativa'),
    supabase.from('response_sessions').select('*', { count: 'exact', head: true }),
    supabase.from('communities').select('*', { count: 'exact', head: true }),
  ])

  const QUICK_LINKS = [
    {
      href:  '/admin/surveys',
      label: 'Pesquisas',
      desc:  'Gerencie e configure pesquisas',
      icon:  ClipboardListIcon,
      accent: '#F7941D',
      iconBg: '#FDE8C8',
    },
    {
      href:  '/admin/dispatch',
      label: 'Disparos',
      desc:  'Envie notificações via Layers',
      icon:  BellIcon,
      accent: '#3B82F6',
      iconBg: '#EFF6FF',
    },
    {
      href:  '/admin/audit',
      label: 'Auditoria',
      desc:  'Visibilidade sobre respostas',
      icon:  BarChart3Icon,
      accent: '#5BB5A2',
      iconBg: '#EAF6F3',
    },
    {
      href:  '/admin/communities',
      label: 'Identidade Visual',
      desc:  'Temas e logos por escola',
      icon:  PaletteIcon,
      accent: '#9333EA',
      iconBg: '#F5F3FF',
    },
    {
      href:  '/admin/export',
      label: 'Exportar',
      desc:  'Baixe respostas em XLSX',
      icon:  DownloadIcon,
      accent: '#2D9E6B',
      iconBg: '#F0FDF4',
    },
  ]

  return (
    <div className="p-6 max-w-4xl">
      {/* Page header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-[#1A202C]">
            Visão Geral
          </h1>
          <p className="text-sm text-[#718096] mt-0.5">
            Plataforma de pesquisas CSAT — Raiz Educação
          </p>
        </div>
        <Link
          href="/admin/surveys/new"
          className="inline-flex items-center gap-1.5 text-white text-sm px-4 py-2 rounded-lg transition-colors font-medium min-h-[40px]"
          style={{ backgroundColor: '#F7941D' }}
        >
          <PlusIcon size={16} strokeWidth={2} />
          Nova pesquisa
        </Link>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        {[
          {
            label: 'Pesquisas ativas',
            value: activeSurveys ?? 0,
            icon: ActivityIcon,
            iconBg: 'bg-emerald-50',
            iconColor: 'text-emerald-600',
            accent: '#2D9E6B',
          },
          {
            label: 'Total de respostas',
            value: totalResponses ?? 0,
            icon: MessageSquareIcon,
            iconBg: 'bg-blue-50',
            iconColor: 'text-blue-600',
            accent: '#3B82F6',
          },
          {
            label: 'Total de pesquisas',
            value: totalSurveys ?? 0,
            icon: ClipboardListIcon,
            iconBg: 'bg-[#FDE8C8]',
            iconColor: 'text-[#F7941D]',
            accent: '#F7941D',
          },
          {
            label: 'Comunidades',
            value: totalCommunities ?? 0,
            icon: UsersIcon,
            iconBg: 'bg-purple-50',
            iconColor: 'text-purple-600',
            accent: '#9333EA',
          },
        ].map(({ label, value, icon: Icon, iconBg, iconColor, accent }) => (
          <div key={label} className="bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="h-0.5 w-full" style={{ backgroundColor: accent }} />
            <div className="p-4">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <p className="text-xs text-[#718096]">{label}</p>
                  <p className="text-xl font-semibold text-[#1A202C] tabular-nums">{value.toLocaleString('pt-BR')}</p>
                </div>
                <div className={`rounded-lg p-2 ${iconBg}`}>
                  <Icon className={iconColor} size={18} strokeWidth={1.75} />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Quick access */}
      <div>
        <h2 className="text-sm font-semibold text-[#1A202C] mb-3">Acesso rápido</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {QUICK_LINKS.map(({ href, label, desc, icon: Icon, accent, iconBg }) => (
            <Link
              key={href}
              href={href}
              className="group bg-white rounded-xl shadow-sm p-4 flex items-center gap-4 hover:shadow-md transition-shadow duration-150"
            >
              <div className="rounded-xl p-3 shrink-0" style={{ backgroundColor: iconBg }}>
                <Icon style={{ color: accent }} size={20} strokeWidth={1.75} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-[#1A202C] group-hover:text-[#F7941D] transition-colors">
                  {label}
                </p>
                <p className="text-xs text-[#718096] mt-0.5">{desc}</p>
              </div>
              <svg
                width={16}
                height={16}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.75}
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-[#E2E8F0] group-hover:text-[#F7941D] transition-colors shrink-0"
              >
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
