import Link from 'next/link'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import DeleteSurveyButton from './DeleteSurveyButton'
import DuplicateSurveyButton from './DuplicateSurveyButton'

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
        if (diffDays === 1) return 'Abre amanhã'
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
        if (diffDays === 1) return 'Encerra amanhã'
        return `Encerra em ${diffDays} dias`
      }
    }
  }
  return null
}

const STATUS: Record<string, { label: string; cls: string }> = {
  rascunho:  { label: 'Rascunho',  cls: 'bg-gray-100 text-gray-600' },
  ativa:     { label: 'Ativa',     cls: 'bg-green-100 text-green-700' },
  pausada:   { label: 'Pausada',   cls: 'bg-yellow-100 text-yellow-700' },
  encerrada: { label: 'Encerrada', cls: 'bg-red-100 text-red-700' },
}

export default async function SurveysPage() {
  const supabase = await createServerSupabaseClient()

  const { data: surveys } = await supabase
    .from('surveys')
    .select('id, slug, title, status, survey_type, open_date, close_date, created_at, response_sessions(id)')
    .order('created_at', { ascending: false })

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold text-gray-900">Pesquisas</h2>
        <Link
          href="/admin/surveys/new"
          className="bg-[#F7941D] text-white text-sm px-4 py-2 rounded-lg hover:bg-[#D97B10] transition-colors font-medium"
        >
          + Nova pesquisa
        </Link>
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
              <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">
                Abertura
              </th>
              <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">
                Encerramento
              </th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {surveys?.map(s => {
              const st = STATUS[s.status] ?? STATUS.rascunho
              const count = Array.isArray(s.response_sessions) ? s.response_sessions.length : 0

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
                    {count}
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {s.open_date
                      ? new Date(s.open_date).toLocaleDateString('pt-BR')
                      : '—'}
                    {schedulingHint(s.open_date, s.close_date, s.status) && (
                      <div className="mt-0.5">
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-50 text-blue-600">
                          {schedulingHint(s.open_date, s.close_date, s.status)}
                        </span>
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {s.close_date
                      ? new Date(s.close_date).toLocaleDateString('pt-BR')
                      : '—'}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-4">
                      <Link
                        href={`/admin/surveys/${s.id}`}
                        className="text-[#F7941D] hover:text-[#D97B10] font-medium text-sm"
                      >
                        Editar →
                      </Link>
                      <DuplicateSurveyButton
                        surveyId={s.id}
                        surveyTitle={s.title}
                      />
                      <DeleteSurveyButton
                        surveyId={s.id}
                        surveyTitle={s.title}
                        responseCount={count}
                      />
                    </div>
                  </td>
                </tr>
              )
            })}

            {!surveys?.length && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-gray-400">
                  Nenhuma pesquisa cadastrada.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
