import Link from 'next/link'
import { Nunito_Sans } from 'next/font/google'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import LogoutButton from './LogoutButton'

const nunitoSans = Nunito_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800', '900'],
})

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

interface SectionCard {
  href: string
  icon: React.ReactNode
  title: string
  description: string
  accent: string
}

const sections: SectionCard[] = [
  {
    href: '/admin/surveys',
    icon: <IconSurveys />,
    title: 'Pesquisas',
    description: 'Criar, editar e acompanhar surveys CSAT.',
    accent: 'from-[#ff8a00] to-[#f15a24]',
  },
  {
    href: '/admin/dispatch',
    icon: <IconDispatch />,
    title: 'Disparos',
    description: 'Enviar comunicados por push e email via Layers.',
    accent: 'from-[#2f6df6] to-[#214bbf]',
  },
  {
    href: '/admin/export',
    icon: <IconExport />,
    title: 'Exportar',
    description: 'Baixar respostas, relatórios e bases operacionais.',
    accent: 'from-[#132a72] to-[#081530]',
  },
  {
    href: '/admin/communities',
    icon: <IconBrand />,
    title: 'Identidade Visual',
    description: 'Ajustar temas, logos e mensagens por escola.',
    accent: 'from-[#5cc9bd] to-[#1d8b8a]',
  },
  {
    href: '/admin/auditoria',
    icon: <IconAudit />,
    title: 'Auditoria',
    description: 'Conferir cobertura, disparos e timeline.',
    accent: 'from-[#6747e8] to-[#233481]',
  },
]

export default async function AdminHomePage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  const firstName = user?.email?.split('@')[0]?.split('.')[0] ?? 'Admin'

  return (
    <main className={`${nunitoSans.className} relative min-h-screen overflow-hidden bg-[#070b14] text-white`}>
      <div className="admin-home-ambient" aria-hidden="true" />

      <header className="relative z-10 border-b border-white/10 bg-[#111827]/92 shadow-[0_12px_38px_rgba(0,0,0,0.28)] backdrop-blur">
        <div className="mx-auto flex h-20 max-w-[1880px] items-center justify-between px-6">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-20 items-center border-r border-white/15 pr-4">
              <img
                src="/logo-raiz.png"
                alt="Raiz Educacao"
                className="h-12 w-auto object-contain"
              />
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#5cc9bd]">Layers</p>
              <h1 className="text-base font-bold leading-tight text-white">Mini App Layers</h1>
              <p className="text-xs text-slate-300">Pesquisa</p>
            </div>
          </div>

          <div className="flex min-w-0 items-center gap-4">
            <div className="hidden items-center rounded-full bg-white/8 px-4 py-2 text-xs font-medium text-slate-200 ring-1 ring-white/10 sm:flex">
              Plataforma Raiz
            </div>
            <div className="hidden h-8 w-px bg-white/15 md:block" />
            <div className="hidden max-w-[240px] truncate text-sm text-slate-200 md:block" title={user?.email}>
              {firstName}
            </div>
            <LogoutButton className="inline-flex h-10 items-center justify-center rounded-2xl border border-white/10 bg-white/8 px-4 text-sm font-black text-slate-200 transition hover:bg-white/14 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5cc9bd]" />
          </div>
        </div>
      </header>

      <section className="relative z-10 mx-auto flex min-h-[calc(100vh-80px)] max-w-[1360px] flex-col px-5 pb-10 pt-8 sm:px-8 lg:pt-10">
        <div className="mb-6 text-center">
          <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.36em] text-slate-500">Plataforma Raiz</p>
          <h2 className="text-3xl font-black tracking-tight text-white sm:text-4xl">Mini App Layers</h2>
          <p className="mt-3 text-sm font-semibold uppercase tracking-[0.28em] text-[#f7941d]">Pesquisa</p>
        </div>

        <div className="rounded-3xl border border-white/12 bg-[#12151d]/88 p-4 shadow-[0_30px_90px_rgba(0,0,0,0.45)] backdrop-blur-xl sm:p-6">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            {sections.map((section) => (
              <Link
                key={section.href}
                href={section.href}
                className={`group relative flex min-h-[230px] overflow-hidden rounded-2xl bg-gradient-to-br ${section.accent} p-5 text-white shadow-[0_18px_40px_rgba(0,0,0,0.24)] outline-none transition duration-200 hover:-translate-y-1 hover:shadow-[0_28px_52px_rgba(0,0,0,0.34)] focus-visible:ring-2 focus-visible:ring-[#5cc9bd] focus-visible:ring-offset-2 focus-visible:ring-offset-[#12151d]`}
              >
                <span className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.18),transparent_34%),linear-gradient(135deg,rgba(255,255,255,0.08),transparent_45%)] opacity-75 transition-opacity group-hover:opacity-95" />
                <span className="absolute inset-0 bg-gradient-to-b from-black/8 via-black/20 to-black/36" />
                <span className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-black/34 to-transparent" />
                <span className="relative flex h-full w-full flex-col items-center justify-center gap-4 text-center">
                  <span className="grid h-14 w-14 place-items-center rounded-2xl bg-white/16 text-white shadow-inner ring-1 ring-white/18">
                    {section.icon}
                  </span>
                  <span>
                    <span className="block text-base font-black tracking-tight drop-shadow-[0_1px_2px_rgba(0,0,0,0.45)]">{section.title}</span>
                    <span className="mt-2 block text-xs font-semibold leading-relaxed text-white/90 drop-shadow-[0_1px_2px_rgba(0,0,0,0.35)]">{section.description}</span>
                  </span>
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <style>{`
        .admin-home-ambient {
          position: absolute;
          inset: 0;
          overflow: hidden;
          background:
            linear-gradient(115deg, rgba(8, 13, 25, 0.96) 0%, rgba(10, 13, 20, 0.9) 48%, rgba(35, 27, 10, 0.8) 100%),
            conic-gradient(from 150deg at 48% 34%, rgba(92, 201, 189, 0.18), rgba(247, 148, 29, 0.22), rgba(47, 109, 246, 0.16), rgba(92, 201, 189, 0.18));
          animation: raiz-backdrop 16s ease-in-out infinite alternate;
        }

        .admin-home-ambient::before {
          content: "";
          position: absolute;
          inset: -42%;
          background:
            linear-gradient(90deg, transparent 0 46%, rgba(255,255,255,0.07) 50%, transparent 54%),
            linear-gradient(0deg, transparent 0 47%, rgba(247,148,29,0.08) 50%, transparent 53%);
          background-size: 280px 280px;
          filter: blur(18px);
          opacity: 0.42;
          transform: rotate(-9deg);
          animation: raiz-field 14s ease-in-out infinite alternate;
        }

        .admin-home-ambient::after {
          content: "";
          position: absolute;
          inset: 0;
          background:
            radial-gradient(ellipse at 50% 0%, rgba(247, 148, 29, 0.18), transparent 42%),
            linear-gradient(180deg, transparent 0%, rgba(0,0,0,0.28) 100%);
          mix-blend-mode: screen;
          opacity: 0.72;
          animation: raiz-glow 12s ease-in-out infinite alternate;
        }

        @keyframes raiz-backdrop {
          from {
            background-position: 0% 50%, 42% 34%;
            filter: saturate(1);
          }
          to {
            background-position: 100% 50%, 56% 42%;
            filter: saturate(1.12);
          }
        }

        @keyframes raiz-field {
          from {
            transform: translate3d(-4%, -2%, 0) rotate(-10deg) scale(1);
          }
          to {
            transform: translate3d(5%, 3%, 0) rotate(-5deg) scale(1.08);
          }
        }

        @keyframes raiz-glow {
          from {
            opacity: 0.52;
          }
          to {
            opacity: 0.82;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .admin-home-ambient,
          .admin-home-ambient::before,
          .admin-home-ambient::after {
            animation: none;
          }
        }
      `}</style>
    </main>
  )
}
