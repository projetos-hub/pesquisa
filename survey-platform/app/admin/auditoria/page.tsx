import Link from 'next/link'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { createServiceClient } from '@/lib/supabase-service'
import { redirect } from 'next/navigation'

interface SurveyAuditRow {
  id: string
  title: string
  slug: string
  status: 'rascunho' | 'ativa' | 'pausada' | 'encerrada'
  open_date: string | null
  close_date: string | null
  total_respostas: number
  total_disparos: number
  ultima_resposta: string | null
  total_esperado: number
}

const STATUS: Record<string, { label: string; cls: string }> = {
  rascunho:  { label: 'Rascunho',  cls: 'bg-gray-100 text-gray-600' },
  ativa:     { label: 'Ativa',     cls: 'bg-green-100 text-green-700' },
  pausada:   { label: 'Pausada',   cls: 'bg-yellow-100 text-yellow-700' },
  encerrada: { label: 'Encerrada', cls: 'bg-red-100 text-red-700' },
}

function TaxaBadge({ respostas, esperado }: { respostas: number; esperado: number }) {
  if (esperado === 0) {
    return <span className="text-xs text-gray-400">sem meta</span>
  }
  const pct = Math.round((respostas / esperado) * 100)
  const barColor = pct >= 80 ? 'bg-green-500' : pct >= 50 ? 'bg-yellow-400' : 'bg-red-400'
  return (
    <div className="flex items-center gap-2">
      <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={`h-full ${barColor} rounded-full`}
          style={{ width: `${Math.min(pct, 100)}%` }}
        />
      </div>
      <span className={`text-xs font-medium ${pct >= 80 ? 'text-green-700' : pct >= 50 ? 'text-yellow-700' : 'text-red-600'}`}>
        {pct}%
      </span>
    </div>
  )
}

export default async function AuditoriaOverviewPage() {
  const authClient = await createServerSupabaseClient()
  const { data: { user } } = await authClient.auth.getUser()
  if (!user) redirect('/admin/login')

  const db = createServiceClient()

  // Busca surveys
  const { data: surveys } = await db
    .from('surveys')
    .select('id, title, slug, status, open_date, close_date')
    .order('created_at', { ascending: false })

  const surveyList = surveys ?? []
  const surveyIds = surveyList.map(s => s.id)

  // Busca response_sessions
  const { data: sessions } = surveyIds.length > 0
    ? await db
        .from('response_sessions')
        .select('survey_id, submitted_at')
        .in('survey_id', surveyIds)
    : { data: [] }

  // Busca audit_broadcasts
  const { data: broadcasts } = surveyIds.length > 0
    ? await db
        .from('audit_broadcasts')
        .select('survey_id')
        .in('survey_id', surveyIds)
    : { data: [] }

  // Busca expected_responses de survey_communities
  const { data: communities } = surveyIds.length > 0
    ? await db
        .from('survey_communities')
        .select('survey_id, expected_responses')
        .in('survey_id', surveyIds)
        .eq('active', true)
    : { data: [] }

  // Agrega em JS
  const sessionsList = sessions ?? []
  const broadcastsList = broadcasts ?? []
  const commList = (communities ?? []) as { survey_id: string; expected_responses: number | null }[]

  const rows: SurveyAuditRow[] = surveyList.map(s => {
    const mySessions = sessionsList.filter(r => r.survey_id === s.id)
    const myBroadcasts = broadcastsList.filter(b => b.survey_id === s.id)
    const myComms = commList.filter(c => c.survey_id === s.id)

    const total_respostas = mySessions.length
    const total_disparos = myBroadcasts.length

    const ultima_resposta = mySessions.length > 0
      ? mySessions
          .map(r => r.submitted_at as string)
          .sort()
          .at(-1) ?? null
      : null

    const total_esperado = myComms.reduce(
      (sum, c) => sum + (c.expected_responses ?? 0),
      0
    )

    return {
      id: s.id,
      title: s.title,
      slug: s.slug,
      status: s.status as SurveyAuditRow['status'],
      open_date: s.open_date as string | null,
      close_date: s.close_date as string | null,
      total_respostas,
      total_disparos,
      ultima_resposta,
      total_esperado,
    }
  })

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Auditoria de Disparos</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            Taxa de resposta e correlação com disparos por pesquisa
          </p>
        </div>
      </div>

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
                Esperado
              </th>
              <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">
                Taxa
              </th>
              <th className="text-right text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">
                Disparos
              </th>
              <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">
                Última resposta
              </th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {rows.map(r => {
              const st = STATUS[r.status] ?? STATUS.rascunho
              return (
                <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900">{r.title}</div>
                    <div className="text-xs text-gray-400 mt-0.5">/p/{r.slug}</div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${st.cls}`}>
                      {st.label}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-gray-900">
                    {r.total_respostas.toLocaleString('pt-BR')}
                  </td>
                  <td className="px-4 py-3 text-right text-gray-500">
                    {r.total_esperado > 0 ? r.total_esperado.toLocaleString('pt-BR') : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <TaxaBadge respostas={r.total_respostas} esperado={r.total_esperado} />
                  </td>
                  <td className="px-4 py-3 text-right text-gray-700">
                    {r.total_disparos}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">
                    {r.ultima_resposta
                      ? new Date(r.ultima_resposta).toLocaleDateString('pt-BR', {
                          day: '2-digit', month: '2-digit', year: '2-digit',
                          hour: '2-digit', minute: '2-digit',
                        })
                      : '—'}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/admin/auditoria/${r.id}`}
                      className="text-[#F7941D] hover:text-[#D97B10] font-medium text-sm whitespace-nowrap"
                    >
                      Auditar →
                    </Link>
                  </td>
                </tr>
              )
            })}

            {rows.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-10 text-center text-gray-400">
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
