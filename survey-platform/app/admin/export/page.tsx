import { createServerSupabaseClient } from '@/lib/supabase-server'
import { DownloadIcon } from '@/app/admin/icons'

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
      {/* Page header */}
      <div className="mb-6">
        <h1 className="text-xl font-semibold tracking-tight text-[#1A202C]">Exportar Respostas</h1>
        <p className="text-sm text-[#718096] mt-0.5">Selecione uma pesquisa e exporte todas as respostas em XLSX</p>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#E2E8F0] bg-[#F8F9FA]">
              <th className="text-left text-xs font-medium text-[#718096] uppercase tracking-wider px-4 py-3">Pesquisa</th>
              <th className="text-left text-xs font-medium text-[#718096] uppercase tracking-wider px-4 py-3">Status</th>
              <th className="text-center text-xs font-medium text-[#718096] uppercase tracking-wider px-4 py-3">Respostas</th>
              <th className="text-right text-xs font-medium text-[#718096] uppercase tracking-wider px-4 py-3 w-40">Ação</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E2E8F0]">
            {surveyData.map(survey => (
              <tr key={survey.id} className="hover:bg-[#F8F9FA] transition-colors">
                <td className="px-4 py-3.5">
                  <div className="font-medium text-[#1A202C]">{survey.title}</div>
                  <div className="text-xs text-[#718096] font-mono mt-0.5">{survey.slug}</div>
                </td>
                <td className="px-4 py-3.5">
                  <span className={`inline-flex text-xs px-2.5 py-0.5 rounded-full font-medium ${
                    survey.status === 'ativa'
                      ? 'bg-emerald-50 text-emerald-700'
                      : survey.status === 'nao_aberta'
                      ? 'bg-amber-50 text-amber-700'
                      : 'bg-slate-100 text-slate-600'
                  }`}>
                    {survey.status === 'ativa' ? 'Ativa' : survey.status === 'nao_aberta' ? 'Não aberta' : 'Encerrada'}
                  </span>
                </td>
                <td className="px-4 py-3.5 text-center">
                  <span className="font-semibold text-[#1A202C] tabular-nums">{survey.responseCount}</span>
                </td>
                <td className="px-4 py-3.5 text-right">
                  <a
                    href={`/api/admin/export?surveyId=${survey.id}`}
                    download
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white rounded-lg transition-colors min-h-[32px]"
                    style={{ backgroundColor: '#F7941D' }}
                  >
                    <DownloadIcon size={12} strokeWidth={2} />
                    XLSX
                  </a>
                </td>
              </tr>
            ))}

            {surveyData.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-12 text-center text-[#718096] text-sm">
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
