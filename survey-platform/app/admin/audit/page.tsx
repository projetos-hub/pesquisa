import Link from 'next/link'
import { MessageSquareIcon, ActivityIcon, TrendingUpIcon } from '@/app/admin/icons'

const STATUS: Record<string, { label: string; cls: string }> = {
  rascunho:  { label: 'Rascunho',  cls: 'bg-slate-100 text-slate-600' },
  ativa:     { label: 'Ativa',     cls: 'bg-emerald-50 text-emerald-700' },
  pausada:   { label: 'Pausada',   cls: 'bg-amber-50 text-amber-700' },
  encerrada: { label: 'Encerrada', cls: 'bg-red-50 text-red-700' },
}

interface SurveyAudit {
  id: string
  slug: string
  title: string
  status: string
  open_date: string | null
  close_date: string | null
  total_responses: number
  active_communities: number
  sync_rate: number
  last_response_at: string | null
  school_breakdown: { school: string; count: number }[]
}

export default async function AuditPage() {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'
  const res = await fetch(`${baseUrl}/api/admin/audit/overview`, {
    cache: 'no-store',
  })
  const surveys: SurveyAudit[] = res.ok ? await res.json() : []

  const totalResponses = surveys.reduce((sum, s) => sum + s.total_responses, 0)
  const activeSurveys = surveys.filter(s => s.status === 'ativa').length
  const avgSync = surveys.length > 0
    ? Math.round(surveys.reduce((sum, s) => sum + s.sync_rate, 0) / surveys.length)
    : 0

  return (
    <div className="p-6">
      {/* Page header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-[#1A202C]">Auditoria</h1>
          <p className="text-sm text-[#718096] mt-0.5">Visibilidade sobre respostas, disparos e taxa de resposta</p>
        </div>
        <Link
          href="/admin/audit/by-school"
          className="bg-white border border-[#E2E8F0] text-[#4A5568] text-sm px-4 py-2 rounded-lg hover:bg-[#F8F9FA] hover:border-[#5BB5A2] hover:text-[#5BB5A2] transition-colors font-medium min-h-[40px] inline-flex items-center"
        >
          Ver por escola →
        </Link>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="h-0.5 w-full bg-blue-500" />
          <div className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-[#718096]">Total de respostas</p>
                <p className="text-[30px] font-bold leading-none text-[#1A202C] mt-1 tabular-nums">{totalResponses.toLocaleString('pt-BR')}</p>
              </div>
              <div className="rounded-lg p-2 bg-blue-50">
                <MessageSquareIcon className="text-blue-600" size={20} strokeWidth={1.75} />
              </div>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="h-0.5 w-full" style={{ backgroundColor: '#2D9E6B' }} />
          <div className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-[#718096]">Pesquisas ativas</p>
                <p className="text-[30px] font-bold leading-none text-[#1A202C] mt-1 tabular-nums">{activeSurveys}</p>
              </div>
              <div className="rounded-lg p-2 bg-emerald-50">
                <ActivityIcon className="text-emerald-600" size={20} strokeWidth={1.75} />
              </div>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="h-0.5 w-full" style={{ backgroundColor: '#F7941D' }} />
          <div className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-[#718096]">Taxa de sync (média)</p>
                <p className="text-[30px] font-bold leading-none text-[#1A202C] mt-1 tabular-nums">{avgSync}%</p>
              </div>
              <div className="rounded-lg p-2" style={{ backgroundColor: '#FDE8C8' }}>
                <TrendingUpIcon style={{ color: '#F7941D' }} size={20} strokeWidth={1.75} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabela de surveys */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#E2E8F0] bg-[#F8F9FA]">
              <th className="text-left text-xs font-medium text-[#718096] uppercase tracking-wider px-4 py-3">
                Pesquisa
              </th>
              <th className="text-left text-xs font-medium text-[#718096] uppercase tracking-wider px-4 py-3">
                Status
              </th>
              <th className="text-right text-xs font-medium text-[#718096] uppercase tracking-wider px-4 py-3">
                Respostas
              </th>
              <th className="text-right text-xs font-medium text-[#718096] uppercase tracking-wider px-4 py-3">
                Comunidades ativas
              </th>
              <th className="text-right text-xs font-medium text-[#718096] uppercase tracking-wider px-4 py-3">
                Sync %
              </th>
              <th className="text-left text-xs font-medium text-[#718096] uppercase tracking-wider px-4 py-3">
                Última resposta
              </th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E2E8F0]">
            {surveys.map(s => {
              const st = STATUS[s.status] ?? STATUS.rascunho

              return (
                <tr key={s.id} className="hover:bg-[#F8F9FA] transition-colors">
                  <td className="px-4 py-3.5">
                    <div className="font-medium text-[#1A202C]">{s.title}</div>
                    <div className="text-xs text-[#718096] mt-0.5 font-mono">/p/{s.slug}</div>
                  </td>
                  <td className="px-4 py-3.5">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${st.cls}`}>
                      {st.label}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-right font-semibold text-[#1A202C] tabular-nums">
                    {s.total_responses.toLocaleString('pt-BR')}
                  </td>
                  <td className="px-4 py-3.5 text-right text-[#4A5568] tabular-nums">
                    {s.active_communities}
                  </td>
                  <td className="px-4 py-3.5 text-right">
                    <span className={`font-medium tabular-nums ${s.sync_rate >= 90 ? 'text-emerald-600' : s.sync_rate >= 50 ? 'text-amber-600' : 'text-red-600'}`}>
                      {s.sync_rate}%
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-[#718096] text-xs">
                    {s.last_response_at
                      ? new Date(s.last_response_at).toLocaleDateString('pt-BR', {
                          day: '2-digit', month: '2-digit', year: '2-digit',
                          hour: '2-digit', minute: '2-digit',
                        })
                      : '—'}
                  </td>
                  <td className="px-4 py-3.5 text-right">
                    <Link
                      href={`/admin/audit/timeline?surveyId=${s.id}`}
                      className="text-[#F7941D] hover:text-[#D97B10] font-medium text-sm whitespace-nowrap transition-colors"
                    >
                      Ver timeline →
                    </Link>
                  </td>
                </tr>
              )
            })}

            {surveys.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center text-[#718096] text-sm">
                  Nenhuma pesquisa encontrada.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
