import Link from 'next/link'
import { createServerSupabaseClient } from '@/lib/supabase-server'

interface Survey {
  id: string
  slug: string
  title: string
  status: string
  response_sessions: { id: string }[]
}

export default async function ExportPage() {
  const supabase = await createServerSupabaseClient()

  // Fetch all surveys with response count
  const { data: surveys } = await supabase
    .from('surveys')
    .select('id, slug, title, status, response_sessions(id)')
    .order('created_at', { ascending: false }) as { data: Survey[] | null }

  const surveyData = (surveys ?? []).map(s => ({
    ...s,
    responseCount: s.response_sessions?.length ?? 0,
  }))

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Exportar Respostas</h1>
        <p className="text-gray-600">Selecione uma pesquisa e exporte todas as respostas em XLSX</p>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">Pesquisa</th>
              <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">Status</th>
              <th className="text-center text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">Respostas</th>
              <th className="text-right text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3 w-40">Ação</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {surveyData.map(survey => (
              <tr key={survey.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3">
                  <div className="font-medium text-gray-900">{survey.title}</div>
                  <div className="text-xs text-gray-500 font-mono mt-0.5">{survey.slug}</div>
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-flex text-xs px-2.5 py-1 rounded-full font-medium ${
                    survey.status === 'ativa'
                      ? 'bg-green-100 text-green-700'
                      : survey.status === 'nao_aberta'
                      ? 'bg-yellow-100 text-yellow-700'
                      : 'bg-gray-100 text-gray-700'
                  }`}>
                    {survey.status === 'ativa' ? 'Ativa' : survey.status === 'nao_aberta' ? 'Não aberta' : 'Encerrada'}
                  </span>
                </td>
                <td className="px-4 py-3 text-center">
                  <span className="font-semibold text-gray-900">{survey.responseCount}</span>
                </td>
                <td className="px-4 py-3 text-right">
                  <a
                    href={`/api/admin/export?surveyId=${survey.id}`}
                    download
                    className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors"
                  >
                    ⬇ XLSX
                  </a>
                </td>
              </tr>
            ))}

            {surveyData.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-10 text-center text-gray-400">
                  Nenhuma pesquisa disponível.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
