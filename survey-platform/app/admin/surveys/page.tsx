import Link from 'next/link'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import DeleteSurveyButton from './DeleteSurveyButton'
import { PlusIcon } from '@/app/admin/icons'

const STATUS: Record<string, { label: string; cls: string }> = {
  rascunho:  { label: 'Rascunho',  cls: 'bg-slate-100 text-slate-600' },
  ativa:     { label: 'Ativa',     cls: 'bg-emerald-50 text-emerald-700' },
  pausada:   { label: 'Pausada',   cls: 'bg-amber-50 text-amber-700' },
  encerrada: { label: 'Encerrada', cls: 'bg-red-50 text-red-700' },
}

export default async function SurveysPage() {
  const supabase = await createServerSupabaseClient()

  const { data: surveys } = await supabase
    .from('surveys')
    .select('id, slug, title, status, survey_type, open_date, close_date, created_at, response_sessions(id)')
    .order('created_at', { ascending: false })

  return (
    <div className="p-6">
      {/* Page header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-[#1A202C]">Pesquisas</h1>
          <p className="text-sm text-[#718096] mt-0.5">Gerencie as pesquisas de satisfação</p>
        </div>
        <Link
          href="/admin/surveys/new"
          className="inline-flex items-center gap-1.5 text-white text-sm px-4 py-2 rounded-lg transition-colors font-medium min-h-[40px]"
          style={{ backgroundColor: '#F7941D' }}
        >
          <PlusIcon size={16} strokeWidth={2} />
          Nova pesquisa
        </Link>
      </div>

      {/* Table card */}
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
              <th className="text-left text-xs font-medium text-[#718096] uppercase tracking-wider px-4 py-3">
                Abertura
              </th>
              <th className="text-left text-xs font-medium text-[#718096] uppercase tracking-wider px-4 py-3">
                Encerramento
              </th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E2E8F0]">
            {surveys?.map(s => {
              const st = STATUS[s.status] ?? STATUS.rascunho
              const count = Array.isArray(s.response_sessions) ? s.response_sessions.length : 0

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
                    {count}
                  </td>
                  <td className="px-4 py-3.5 text-[#718096] text-sm">
                    {s.open_date
                      ? new Date(s.open_date).toLocaleDateString('pt-BR')
                      : '—'}
                  </td>
                  <td className="px-4 py-3.5 text-[#718096] text-sm">
                    {s.close_date
                      ? new Date(s.close_date).toLocaleDateString('pt-BR')
                      : '—'}
                  </td>
                  <td className="px-4 py-3.5 text-right">
                    <div className="flex items-center justify-end gap-4">
                      <Link
                        href={`/admin/surveys/${s.id}`}
                        className="text-[#F7941D] hover:text-[#D97B10] font-medium text-sm transition-colors"
                      >
                        Editar →
                      </Link>
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
                <td colSpan={6} className="px-4 py-12 text-center">
                  <p className="text-[#718096] text-sm">Nenhuma pesquisa cadastrada.</p>
                  <p className="text-[#718096] text-xs mt-1">Crie sua primeira pesquisa clicando em &quot;Nova pesquisa&quot;.</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
