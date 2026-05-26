import Link from 'next/link'
import { createServerSupabaseClient } from '@/lib/supabase-server'

interface Theme {
  nomeEscola?: string
  [key: string]: unknown
}

interface SurveyRef {
  id: string
  title: string
  slug: string
}

interface ResponseSession {
  id: string
  submitted_at: string
}

interface CommunityRow {
  community_id: string
  status: string
  theme: Theme | null
  surveys: SurveyRef | SurveyRef[] | null
  response_sessions: ResponseSession[]
}

export default async function BySchoolPage() {
  const supabase = await createServerSupabaseClient()

  const { data } = await supabase
    .from('survey_communities')
    .select(`
      community_id, status, theme,
      surveys(id, title, slug),
      response_sessions(id, submitted_at)
    `)
    .eq('active', true)
    .order('community_id', { ascending: true })

  const rows = (data ?? []) as unknown as CommunityRow[]

  // Normaliza surveys (pode vir como objeto ou array por causa do join)
  function getSurvey(row: CommunityRow): SurveyRef | null {
    if (!row.surveys) return null
    if (Array.isArray(row.surveys)) return row.surveys[0] ?? null
    return row.surveys
  }

  // Ordena por numero de respostas decrescente
  const sorted = [...rows].sort((a, b) => {
    const aCount = Array.isArray(a.response_sessions) ? a.response_sessions.length : 0
    const bCount = Array.isArray(b.response_sessions) ? b.response_sessions.length : 0
    return bCount - aCount
  })

  const STATUS: Record<string, { label: string; cls: string }> = {
    ativa:      { label: 'Ativa',     cls: 'bg-green-100 text-green-700' },
    pausada:    { label: 'Pausada',   cls: 'bg-yellow-100 text-yellow-700' },
    encerrada:  { label: 'Encerrada', cls: 'bg-red-100 text-red-700' },
    nao_aberta: { label: 'Nao aberta', cls: 'bg-gray-100 text-gray-500' },
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link href="/admin/audit" className="text-gray-400 hover:text-gray-600 text-sm">
          ← Auditoria
        </Link>
        <span className="text-gray-300">/</span>
        <h2 className="text-lg font-semibold text-gray-900">Por escola</h2>
        <span className="ml-auto text-sm text-gray-400">{sorted.length} instalacoes</span>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">
                Escola
              </th>
              <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">
                Survey
              </th>
              <th className="text-right text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">
                Respostas
              </th>
              <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">
                Ultimo respondente
              </th>
              <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">
                Status instalacao
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {sorted.map((row, idx) => {
              const survey = getSurvey(row)
              const sessions = Array.isArray(row.response_sessions) ? row.response_sessions : []
              const count = sessions.length
              const nomeEscola = row.theme?.nomeEscola ?? row.community_id
              const st = STATUS[row.status] ?? STATUS.nao_aberta

              const lastSession = count > 0
                ? sessions.sort((a, b) =>
                    new Date(b.submitted_at).getTime() - new Date(a.submitted_at).getTime()
                  )[0]
                : null

              return (
                <tr key={`${row.community_id}-${idx}`} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900">{nomeEscola}</div>
                    <div className="text-xs text-gray-400 font-mono mt-0.5">{row.community_id}</div>
                  </td>
                  <td className="px-4 py-3 text-gray-700">
                    {survey ? (
                      <Link
                        href={`/admin/surveys/${survey.id}`}
                        className="hover:text-[#F7941D] transition-colors"
                      >
                        {survey.title}
                      </Link>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-gray-900">
                    {count.toLocaleString('pt-BR')}
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">
                    {lastSession
                      ? new Date(lastSession.submitted_at).toLocaleDateString('pt-BR', {
                          day: '2-digit', month: '2-digit', year: '2-digit',
                          hour: '2-digit', minute: '2-digit',
                        })
                      : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${st.cls}`}>
                      {st.label}
                    </span>
                  </td>
                </tr>
              )
            })}

            {sorted.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-gray-400">
                  Nenhuma instalacao ativa encontrada.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
