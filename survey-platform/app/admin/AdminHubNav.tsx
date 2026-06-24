import Link from 'next/link'
import type { CSSProperties } from 'react'

function IconSurveys() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M9 5h6" />
      <path d="M9 12h6" />
      <path d="M9 17h3" />
      <path d="M5 5h.01" />
      <path d="M5 12h.01" />
      <path d="M5 17h.01" />
      <rect x="3" y="3" width="18" height="18" rx="3" />
    </svg>
  )
}

function IconDispatch() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M18 8a6 6 0 0 0-12 0c0 7-3 8-3 8h18s-3-1-3-8" />
      <path d="M13.7 21a2 2 0 0 1-3.4 0" />
    </svg>
  )
}

function IconExport() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 3v12" />
      <path d="m7 10 5 5 5-5" />
      <path d="M4 19h16" />
    </svg>
  )
}

function IconBrand() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 22a10 10 0 1 1 7.1-2.95" />
      <path d="M8.5 8.5h.01" />
      <path d="M13.5 6.5h.01" />
      <path d="M17 10.5h.01" />
      <path d="M7 13.5h.01" />
      <path d="M13 17.5a2.5 2.5 0 0 1 2.5-2.5H18a4 4 0 0 0 4-4" />
    </svg>
  )
}

function IconAudit() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 19V9" />
      <path d="M10 19V5" />
      <path d="M16 19v-7" />
      <path d="M22 19H2" />
    </svg>
  )
}

const items = [
  {
    href: '/admin/surveys',
    key: 'surveys',
    title: 'Pesquisas',
    icon: <IconSurveys />,
    accentFrom: '#ff8a00',
    accentTo: '#f15a24',
  },
  {
    href: '/admin/dispatch',
    key: 'dispatch',
    title: 'Disparos',
    icon: <IconDispatch />,
    accentFrom: '#3f7cff',
    accentTo: '#214bbf',
  },
  {
    href: '/admin/export',
    key: 'export',
    title: 'Exportar',
    icon: <IconExport />,
    accentFrom: '#3858b8',
    accentTo: '#081530',
  },
  {
    href: '/admin/communities',
    key: 'communities',
    title: 'Identidade Visual',
    icon: <IconBrand />,
    accentFrom: '#66d4ca',
    accentTo: '#1d8b8a',
  },
  {
    href: '/admin/auditoria',
    key: 'auditoria',
    title: 'Auditoria',
    icon: <IconAudit />,
    accentFrom: '#7658f0',
    accentTo: '#233481',
  },
]

export function AdminHubNav({ active }: { active: string }) {
  return (
    <nav className="flex min-w-0 flex-1 items-center gap-2 overflow-visible py-1" aria-label="Atalhos do Mini App Layers">
      {items.map((item) => {
        const isActive = item.key === active

        return (
          <Link
            key={item.key}
            href={item.href}
            aria-current={isActive ? 'page' : undefined}
            className={`hub-nav-card group relative flex h-11 min-w-[112px] items-center justify-center gap-2 overflow-hidden rounded-[18px] border px-2.5 text-white outline-none backdrop-blur-md transition-[background,border-color,filter,transform,box-shadow] duration-150 hover:-translate-y-0.5 focus-visible:ring-2 focus-visible:ring-[#5cc9bd] ${
              isActive
                ? 'border-white/24 bg-white/[0.105] shadow-[0_14px_32px_rgba(0,0,0,0.28),inset_0_1px_0_rgba(255,255,255,0.16)]'
                : 'border-white/12 bg-white/[0.055] shadow-[0_10px_24px_rgba(0,0,0,0.20),inset_0_1px_0_rgba(255,255,255,0.08)] hover:border-white/20 hover:bg-white/[0.085]'
            }`}
            style={{
              flex: item.key === 'communities' ? '1.35 1 0' : '1 1 0',
              '--accent-from': item.accentFrom,
              '--accent-to': item.accentTo,
            } as CSSProperties}
          >
            <span className="absolute inset-0 bg-[linear-gradient(135deg,var(--accent-from),var(--accent-to))] opacity-55 transition-opacity group-hover:opacity-70" />
            <span className="absolute inset-0 bg-[radial-gradient(circle_at_28%_18%,rgba(255,255,255,0.22),transparent_32%),linear-gradient(180deg,rgba(255,255,255,0.08),rgba(0,0,0,0.20))]" />
            <span className="absolute inset-x-3 top-0 h-px bg-white/18" />
            <span className="relative grid h-8 w-8 shrink-0 place-items-center rounded-xl border border-white/[0.07] bg-black/10 text-white/92 shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_6px_14px_rgba(0,0,0,0.16)]">
              {item.icon}
            </span>
            <span className="relative min-w-0 whitespace-nowrap text-xs font-black leading-none drop-shadow-[0_1px_2px_rgba(0,0,0,0.42)]">
              {item.title}
            </span>
          </Link>
        )
      })}
    </nav>
  )
}
