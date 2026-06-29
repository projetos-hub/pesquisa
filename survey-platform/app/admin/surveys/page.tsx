import Link from 'next/link'
import { Nunito_Sans } from 'next/font/google'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { AdminHubNav } from '../AdminHubNav'
import LogoutButton from '../LogoutButton'
import DeleteSurveyButton from './DeleteSurveyButton'
import DuplicateSurveyButton from './DuplicateSurveyButton'
import { getEffectiveSurveyStatus } from '@/lib/survey-status'

const nunitoSans = Nunito_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800', '900'],
})

function schedulingHint(
  openDate: string | null,
  closeDate: string | null,
  status: string
): string | null {
  const now = new Date()
  if (status === 'rascunho' || status === 'pausada') {
    if (openDate) {
      const open = new Date(openDate)
      if (open > now) {
        const diffDays = Math.ceil((open.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
        if (diffDays === 0) return 'Abre hoje'
        if (diffDays === 1) return 'Abre amanha'
        return `Abre em ${diffDays} dias`
      }
    }
  }
  if (status === 'ativa') {
    if (closeDate) {
      const close = new Date(closeDate)
      if (close > now) {
        const diffDays = Math.ceil((close.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
        if (diffDays === 0) return 'Encerra hoje'
        if (diffDays === 1) return 'Encerra amanha'
        return `Encerra em ${diffDays} dias`
      }
    }
  }
  return null
}

const STATUS: Record<string, { label: string; cls: string }> = {
  rascunho:  { label: 'Rascunho',  cls: 'bg-slate-400/12 text-slate-200 ring-slate-300/20' },
  ativa:     { label: 'Ativa',     cls: 'bg-[#5cc9bd]/14 text-[#8ff1e7] ring-[#5cc9bd]/28' },
  pausada:   { label: 'Pausada',   cls: 'bg-[#f7941d]/14 text-[#ffc06b] ring-[#f7941d]/28' },
  encerrada: { label: 'Encerrada', cls: 'bg-red-500/14 text-red-200 ring-red-400/28' },
}

export default async function SurveysPage() {
  const supabase = await createServerSupabaseClient()

  const { data: surveys } = await supabase
    .from('surveys')
    .select('id, slug, title, status, survey_type, open_date, close_date, created_at, response_sessions(id)')
    .order('created_at', { ascending: false })

  const surveyList = surveys ?? []

  return (
    <main className={`${nunitoSans.className} relative min-h-screen overflow-hidden bg-[#070b14] text-white`}>
      <div className="surveys-ambient" aria-hidden="true" />

      <section className="relative z-10 mx-auto max-w-[1440px] px-5 pb-6 pt-5 sm:px-8 lg:pb-8">
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
              <p className="text-[11px] font-black uppercase tracking-[0.34em] text-[#f7941d]">Mini App Layers</p>
              <h2 className="mt-1 text-4xl font-black tracking-tight text-white">Pesquisas</h2>
            </div>
          </div>

          <AdminHubNav active="surveys" />

          <div className="flex shrink-0 items-center gap-2 min-[1180px]:pt-1">
            <Link
              href="/admin/surveys/new"
              className="inline-flex h-11 shrink-0 items-center justify-center rounded-2xl bg-[#f7941d] px-5 text-sm font-black text-white shadow-[0_14px_28px_rgba(247,148,29,0.24)] transition hover:bg-[#ff9f2f] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5cc9bd] focus-visible:ring-offset-2 focus-visible:ring-offset-[#111827]"
            >
              Nova pesquisa
            </Link>
            <LogoutButton className="inline-flex h-11 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/8 px-4 text-sm font-black text-slate-200 transition hover:bg-white/14 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5cc9bd]" />
          </div>
        </div>

        <div className="overflow-hidden rounded-3xl border border-white/12 bg-[#12151d]/88 shadow-[0_30px_90px_rgba(0,0,0,0.45)] backdrop-blur-xl">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[920px] text-sm">
              <thead>
                <tr className="border-b border-white/10 bg-white/[0.04]">
                  <th className="px-5 py-4 text-left text-[11px] font-black uppercase tracking-[0.24em] text-slate-500">
                    Pesquisa
                  </th>
                  <th className="px-5 py-4 text-left text-[11px] font-black uppercase tracking-[0.24em] text-slate-500">
                    Status
                  </th>
                  <th className="px-5 py-4 text-right text-[11px] font-black uppercase tracking-[0.24em] text-slate-500">
                    Respostas
                  </th>
                  <th className="px-5 py-4 text-left text-[11px] font-black uppercase tracking-[0.24em] text-slate-500">
                    Abertura
                  </th>
                  <th className="px-5 py-4 text-left text-[11px] font-black uppercase tracking-[0.24em] text-slate-500">
                    Encerramento
                  </th>
                  <th className="px-5 py-4" />
                </tr>
              </thead>
              <tbody className="divide-y divide-white/8">
                {surveyList.map(s => {
                  const effectiveStatus = getEffectiveSurveyStatus(s)
                  const st = STATUS[effectiveStatus] ?? STATUS.rascunho
                  const count = Array.isArray(s.response_sessions) ? s.response_sessions.length : 0
                  const hint = schedulingHint(s.open_date, s.close_date, effectiveStatus)

                  return (
                    <tr key={s.id} className="transition-colors hover:bg-white/[0.04]">
                      <td className="px-5 py-4">
                        <div className="font-black text-white">{s.title}</div>
                        <div className="mt-1 text-xs font-semibold text-slate-500">/p/{s.slug}</div>
                      </td>
                      <td className="px-5 py-4">
                        <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-black ring-1 ${st.cls}`}>
                          {st.label}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-right text-lg font-black text-white">
                        {count}
                      </td>
                      <td className="px-5 py-4 text-slate-300">
                        {s.open_date
                          ? new Date(s.open_date).toLocaleDateString('pt-BR')
                          : '-'}
                        {hint && (
                          <div className="mt-1">
                            <span className="inline-flex items-center rounded-md bg-[#2f6df6]/14 px-2 py-0.5 text-[10px] font-black text-[#9bb8ff] ring-1 ring-[#2f6df6]/24">
                              {hint}
                            </span>
                          </div>
                        )}
                      </td>
                      <td className="px-5 py-4 text-slate-300">
                        {s.close_date
                          ? new Date(s.close_date).toLocaleDateString('pt-BR')
                          : '-'}
                      </td>
                      <td className="px-5 py-4 text-right">
                        <div className="flex items-center justify-end gap-4">
                          <Link
                            href={`/admin/surveys/${s.id}`}
                            className="text-sm font-black text-[#f7941d] transition hover:text-[#ffc06b]"
                          >
                            Editar
                          </Link>
                          <DuplicateSurveyButton
                            surveyId={s.id}
                            surveyTitle={s.title}
                            tone="dark"
                          />
                          <DeleteSurveyButton
                            surveyId={s.id}
                            surveyTitle={s.title}
                            responseCount={count}
                            tone="dark"
                          />
                        </div>
                      </td>
                    </tr>
                  )
                })}

                {!surveyList.length && (
                  <tr>
                    <td colSpan={6} className="px-5 py-14 text-center text-slate-500">
                      Nenhuma pesquisa cadastrada.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <style>{`
        .surveys-ambient {
          position: absolute;
          inset: 0;
          overflow: hidden;
          background:
            linear-gradient(115deg, rgba(8, 13, 25, 0.96) 0%, rgba(10, 13, 20, 0.9) 48%, rgba(35, 27, 10, 0.8) 100%),
            radial-gradient(900px 480px at 18% 12%, rgba(92, 201, 189, 0.18), transparent 58%),
            radial-gradient(760px 420px at 82% 4%, rgba(247, 148, 29, 0.20), transparent 56%),
            conic-gradient(from 150deg at 48% 34%, rgba(92, 201, 189, 0.16), rgba(247, 148, 29, 0.22), rgba(47, 109, 246, 0.16), rgba(92, 201, 189, 0.16));
          background-size: 100% 100%, 120% 120%, 125% 125%, 140% 140%;
          animation: surveys-backdrop 18s ease-in-out infinite alternate;
        }

        .surveys-ambient::before {
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
          animation: surveys-field 12s ease-in-out infinite alternate;
        }

        .surveys-ambient::after {
          content: "";
          position: absolute;
          inset: 0;
          background:
            radial-gradient(ellipse at 50% 0%, rgba(247, 148, 29, 0.18), transparent 42%),
            linear-gradient(180deg, transparent 0%, rgba(0,0,0,0.28) 100%);
          mix-blend-mode: screen;
          opacity: 0.62;
          animation: surveys-glow 9s ease-in-out infinite alternate;
        }

        @keyframes surveys-backdrop {
          from {
            background-position: 0% 50%, 16% 12%, 82% 4%, 42% 34%;
            filter: saturate(1);
          }
          to {
            background-position: 100% 50%, 26% 20%, 72% 12%, 58% 44%;
            filter: saturate(1.12);
          }
        }

        @keyframes surveys-field {
          from {
            transform: translate3d(-4%, -2%, 0) rotate(-10deg) scale(1);
          }
          to {
            transform: translate3d(5%, 3%, 0) rotate(-5deg) scale(1.08);
          }
        }

        @keyframes surveys-glow {
          from {
            opacity: 0.52;
          }
          to {
            opacity: 0.82;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .surveys-ambient,
          .surveys-ambient::before,
          .surveys-ambient::after {
            animation: none;
          }
        }
      `}</style>
    </main>
  )
}
