'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  ClipboardListIcon,
  DownloadIcon,
  BellIcon,
  PaletteIcon,
  BarChart3Icon,
} from '@/app/admin/icons'

const NAV_ITEMS = [
  { href: '/admin/surveys',     label: 'Pesquisas',        icon: ClipboardListIcon },
  { href: '/admin/export',      label: 'Exportar',         icon: DownloadIcon },
  { href: '/admin/dispatch',    label: 'Disparos',         icon: BellIcon },
  { href: '/admin/communities', label: 'Identidade Visual', icon: PaletteIcon },
  { href: '/admin/audit',       label: 'Auditoria',        icon: BarChart3Icon },
]

export default function SidebarNav() {
  const pathname = usePathname()

  return (
    <nav className="flex-1 p-3 space-y-0.5 sidebar-scroll overflow-y-auto">
      {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
        const isActive = pathname === href || pathname.startsWith(href + '/')
        return (
          <Link
            key={href}
            href={href}
            className={[
              'flex items-center gap-2.5 px-3 py-2 text-[13px] rounded-lg transition-all duration-150',
              isActive
                ? 'bg-[#F7941D]/90 text-white shadow-[0_1px_6px_rgba(247,148,29,0.25)] font-medium'
                : 'text-white/60 hover:bg-white/[0.08] hover:text-white/90 hover:translate-x-0.5',
            ].join(' ')}
          >
            <Icon
              className={isActive ? 'text-white' : 'text-white/60'}
              size={16}
              strokeWidth={1.75}
            />
            {label}
          </Link>
        )
      })}
    </nav>
  )
}
