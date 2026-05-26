import Link from 'next/link'

const STATUS: Record<string, { label: string; cls: string }> = {
  rascunho:  { label: 'Rascunho',  cls: 'bg-gray-100 text-gray-600' },
  ativa:     { label: 'Ativa',     cls: 'bg-green-100 text-green-700' },
  pausada:   { label: 'Pausada',   cls: 'bg-yellow-100 text-yellow-700' },
  encerrada: { label: 'Encerrada', cls: 'bg-red-100 text-red-700' },
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
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Auditoria</h2>
          <p className="text-sm text-gray-500 mt-0.5">Visibilidade sobre respostas, disparos e taxa de resposta</p>
        </div>
        <Link
          href="/admin/audit/by-school"
          className="bg-white border border-gray-200 text-gray-700 text-sm px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors font-medium"
        >
          Ver por escola →
        </Link>
      </div>

      {/* Cards de resumo */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Total de respostas</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">{totalResponses.toLocaleString('pt-BR')}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Pesquisas ativas</p>
          <p className="text-3xl font-bold text-green-600 mt-1">{activeSurveys}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Taxa de sync (media)</p>
          <p className="text-3xl font-bold text-indigo-600 mt-1">{avgSync}%</p>
        </div>
      </div>

      {/* Tabela de surveys */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">
                Pesquisa
              </th>
              <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">
                Status
              </th>
              <th className="text-right text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">
                Respostas
              </th>
              <th className="text-right text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">
                Comunidades ativas
              </th>
              <th className="text-right text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">
                Sync %
              </th>
              <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">
                Ultima resposta
              </th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {surveys.map(s => {
              const st = STATUS[s.status] ?? STATUS.rascunho

              return (
                <tr key={s.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900">{s.title}</div>
                    <div className="text-xs text-gray-400 mt-0.5">/p/{s.slug}</div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${st.cls}`}>
                      {st.label}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-gray-900">
                    {s.total_responses.toLocaleString('pt-BR')}
                  </td>
                  <td className="px-4 py-3 text-right text-gray-700">
                    {s.active_communities}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className={`font-medium ${s.sync_rate >= 90 ? 'text-green-600' : s.sync_rate >= 50 ? 'text-yellow-600' : 'text-red-600'}`}>
                      {s.sync_rate}%
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">
                    {s.last_response_at
                      ? new Date(s.last_response_at).toLocaleDateString('pt-BR', {
                          day: '2-digit', month: '2-digit', year: '2-digit',
                          hour: '2-digit', minute: '2-digit',
                        })
                      : '—'}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/admin/audit/timeline?surveyId=${s.id}`}
                      className="text-[#F7941D] hover:text-[#D97B10] font-medium text-sm whitespace-nowrap"
                    >
                      Ver timeline →
                    </Link>
                  </td>
                </tr>
              )
            })}

            {surveys.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-gray-400">
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
