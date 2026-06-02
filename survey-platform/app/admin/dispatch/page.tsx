import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { createServiceClient } from '@/lib/supabase-service'
import { BellIcon, SmartphoneIcon, MailIcon } from '@/app/admin/icons'

const STATUS_LABELS: Record<string, { label: string; cls: string }> = {
  pending:         { label: 'Pendente',   cls: 'bg-slate-100 text-slate-600' },
  scheduled:       { label: 'Agendado',   cls: 'bg-blue-50 text-blue-700' },
  sending:         { label: 'Enviando',   cls: 'bg-amber-50 text-amber-700' },
  sent:            { label: 'Enviado',    cls: 'bg-emerald-50 text-emerald-700' },
  partial_failure: { label: 'Parcial',    cls: 'bg-orange-50 text-orange-700' },
  failed:          { label: 'Falhou',     cls: 'bg-red-50 text-red-700' },
  cancelled:       { label: 'Cancelado',  cls: 'bg-slate-100 text-slate-500' },
}

function StatusBadge({ status }: { status: string }) {
  const s = STATUS_LABELS[status] ?? { label: status, cls: 'bg-slate-100 text-slate-600' }
  return (
    <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full ${s.cls}`}>
      {s.label}
    </span>
  )
}

function formatDate(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: '2-digit',
    hour: '2-digit', minute: '2-digit',
  })
}

export default async function DispatchCenterPage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) notFound()

  const service = createServiceClient()

  // Surveys com comunidades instaladas (candidatas a disparo)
  const { data: surveys } = await service
    .from('surveys')
    .select('id, title, slug, status')
    .order('created_at', { ascending: false })

  // Últimos 50 disparos de todas as surveys
  const { data: dispatches } = await service
    .from('survey_dispatches')
    .select(`
      id, title, status, channels, target_scope, total_jobs,
      completed_jobs, failed_jobs, personalized, scheduled_at,
      created_at, completed_at,
      survey:surveys!inner ( id, title, slug )
    `)
    .eq('is_template', false)
    .order('created_at', { ascending: false })
    .limit(50)

  type DispatchRow = {
    id: string; title: string; status: string; channels: string[];
    target_scope: string; total_jobs: number; completed_jobs: number;
    failed_jobs: number; personalized: boolean; scheduled_at: string | null;
    created_at: string; completed_at: string | null;
    survey: { id: string; title: string; slug: string };
  }

  const typedDispatches = (dispatches ?? []) as unknown as DispatchRow[]

  // Agrupa dispatches por survey para os cards de acesso rápido
  const dispatchCountBySurvey: Record<string, number> = {}
  for (const d of typedDispatches) {
    dispatchCountBySurvey[d.survey.id] = (dispatchCountBySurvey[d.survey.id] ?? 0) + 1
  }

  return (
    <div className="p-6 max-w-4xl">
      {/* Page header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-[#1A202C]">Central de Disparos</h1>
          <p className="text-sm text-[#718096] mt-0.5">Notificações push e email via Layers</p>
        </div>
      </div>

      <div className="grid gap-6">

        {/* ── Acesso rápido por pesquisa ────────────────────────────────── */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="text-sm font-semibold text-[#1A202C] mb-4">Disparar por pesquisa</h3>
          {(surveys ?? []).length === 0 ? (
            <p className="text-sm text-[#718096]">Nenhuma pesquisa encontrada.</p>
          ) : (
            <div className="divide-y divide-[#E2E8F0]">
              {(surveys ?? []).map((s: { id: string; title: string; slug: string; status: string }) => (
                <div key={s.id} className="flex items-center justify-between py-3">
                  <div>
                    <p className="text-sm font-medium text-[#1A202C]">{s.title}</p>
                    <p className="text-xs text-[#718096] font-mono mt-0.5">
                      /p/{s.slug}
                      {dispatchCountBySurvey[s.id]
                        ? ` · ${dispatchCountBySurvey[s.id]} disparo(s)`
                        : ' · sem disparos'}
                    </p>
                  </div>
                  <Link
                    href={`/admin/surveys/${s.id}/dispatch`}
                    className="inline-flex items-center gap-1.5 text-white text-xs px-3 py-1.5 rounded-lg transition-colors font-medium shrink-0 min-h-[32px]"
                    style={{ backgroundColor: '#F7941D' }}
                  >
                    <BellIcon size={13} strokeWidth={1.75} />
                    Disparar
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Histórico geral ───────────────────────────────────────────── */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-[#1A202C]">Histórico geral</h3>
            <span className="text-xs text-[#718096]">{dispatches?.length ?? 0} disparos</span>
          </div>

          {(dispatches ?? []).length === 0 ? (
            <p className="text-sm text-[#718096] py-4 text-center">
              Nenhum disparo realizado ainda.
            </p>
          ) : (
            <div className="divide-y divide-[#E2E8F0]">
              {typedDispatches.map((d) => (
                <div key={d.id} className="py-3 flex items-center gap-3">
                  {/* Data */}
                  <span className="text-xs text-[#718096] shrink-0 w-28">
                    {formatDate(d.created_at)}
                  </span>

                  {/* Conteúdo */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-[#1A202C] font-medium truncate">{d.title}</p>
                    <p className="text-xs text-[#718096] truncate">
                      {d.survey.title}
                      {d.personalized ? ' · personalizado' : ''}
                      {d.scheduled_at && d.status === 'scheduled'
                        ? ` · agendado para ${formatDate(d.scheduled_at)}`
                        : ''}
                    </p>
                  </div>

                  {/* Canais */}
                  <span className="flex items-center gap-1 text-[#718096] shrink-0">
                    {d.channels.includes('pushNotification') && (
                      <SmartphoneIcon size={13} strokeWidth={1.75} aria-label="Push notification" />
                    )}
                    {d.channels.includes('email') && (
                      <MailIcon size={13} strokeWidth={1.75} aria-label="Email" />
                    )}
                  </span>

                  {/* Resultado */}
                  <span className="text-xs text-[#718096] shrink-0 hidden sm:block tabular-nums">
                    {d.status === 'sent' || d.status === 'partial_failure'
                      ? `${d.completed_jobs}/${d.total_jobs}`
                      : ''}
                  </span>

                  {/* Status */}
                  <div className="shrink-0 flex items-center gap-2">
                    <StatusBadge status={d.status} />
                    <Link
                      href={`/admin/surveys/${d.survey.id}/dispatch`}
                      className="text-xs text-[#F7941D]/70 hover:text-[#D97B10] transition-colors"
                      title="Ver detalhes"
                    >
                      →
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
