import Link from 'next/link'
import { Nunito_Sans } from 'next/font/google'
import type { ReactNode } from 'react'

import { AdminHubNav } from './AdminHubNav'
import LogoutButton from './LogoutButton'

const nunitoSans = Nunito_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800', '900'],
})

interface AdminPageShellProps {
  active: string
  title: string
  eyebrow?: string
  action?: ReactNode
  children: ReactNode
  maxWidth?: string
}

export function AdminPageShell({
  active,
  title,
  eyebrow = 'Mini App Layers',
  action,
  children,
  maxWidth = 'max-w-[1440px]',
}: AdminPageShellProps) {
  return (
    <main className={`${nunitoSans.className} relative min-h-screen overflow-hidden bg-[#070b14] text-white`}>
      <div className="admin-page-ambient" aria-hidden="true" />

      <section className={`relative z-10 mx-auto ${maxWidth} px-5 pb-8 pt-5 sm:px-8`}>
        <div className="mb-4 flex flex-col gap-4 min-[1180px]:flex-row min-[1180px]:items-start">
          <div className="flex shrink-0 items-center gap-4">
            <Link href="/admin" className="flex h-14 w-14 items-center justify-center">
              <img
                src="/logo-raiz.png"
                alt="Raiz Educacao"
                className="h-11 w-auto object-contain opacity-90"
              />
            </Link>
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.34em] text-[#f7941d]">{eyebrow}</p>
              <h1 className="mt-1 text-4xl font-black tracking-tight text-white">{title}</h1>
            </div>
          </div>

          <AdminHubNav active={active} />

          <div className="flex shrink-0 items-center gap-2 min-[1180px]:pt-1">
            {action}
            <LogoutButton className="inline-flex h-11 items-center justify-center rounded-2xl border border-white/10 bg-white/8 px-4 text-sm font-black text-slate-200 transition hover:bg-white/14 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5cc9bd]" />
          </div>
        </div>

        {children}
      </section>

      <style>{`
        .admin-page-ambient {
          position: absolute;
          inset: 0;
          overflow: hidden;
          background:
            linear-gradient(115deg, rgba(8, 13, 25, 0.96) 0%, rgba(10, 13, 20, 0.9) 48%, rgba(35, 27, 10, 0.8) 100%),
            radial-gradient(900px 480px at 18% 12%, rgba(92, 201, 189, 0.18), transparent 58%),
            radial-gradient(760px 420px at 82% 4%, rgba(247, 148, 29, 0.20), transparent 56%),
            conic-gradient(from 150deg at 48% 34%, rgba(92, 201, 189, 0.16), rgba(247, 148, 29, 0.22), rgba(47, 109, 246, 0.16), rgba(92, 201, 189, 0.16));
          background-size: 100% 100%, 120% 120%, 125% 125%, 140% 140%;
          animation: admin-page-backdrop 18s ease-in-out infinite alternate;
        }

        .admin-page-ambient::before {
          content: "";
          position: absolute;
          inset: -42%;
          background:
            linear-gradient(90deg, transparent 0 46%, rgba(255,255,255,0.07) 50%, transparent 54%),
            linear-gradient(0deg, transparent 0 47%, rgba(247,148,29,0.08) 50%, transparent 53%);
          background-size: 280px 280px;
          filter: blur(18px);
          opacity: 0.55;
          transform: rotate(-9deg);
          animation: admin-page-field 12s ease-in-out infinite alternate;
        }

        .admin-page-ambient::after {
          content: "";
          position: absolute;
          inset: 0;
          background:
            radial-gradient(ellipse at 50% 0%, rgba(247, 148, 29, 0.18), transparent 42%),
            linear-gradient(180deg, transparent 0%, rgba(0,0,0,0.28) 100%);
          mix-blend-mode: screen;
          opacity: 0.62;
          animation: admin-page-glow 9s ease-in-out infinite alternate;
        }

        @keyframes admin-page-backdrop {
          from {
            background-position: 0% 50%, 16% 12%, 82% 4%, 42% 34%;
            filter: saturate(1);
          }
          to {
            background-position: 100% 50%, 26% 20%, 72% 12%, 58% 44%;
            filter: saturate(1.12);
          }
        }

        @keyframes admin-page-field {
          from {
            transform: translate3d(-4%, -2%, 0) rotate(-10deg) scale(1);
          }
          to {
            transform: translate3d(5%, 3%, 0) rotate(-5deg) scale(1.08);
          }
        }

        @keyframes admin-page-glow {
          from {
            opacity: 0.52;
          }
          to {
            opacity: 0.82;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .admin-page-ambient,
          .admin-page-ambient::before,
          .admin-page-ambient::after {
            animation: none;
          }
        }
      `}</style>
    </main>
  )
}
