import Link from 'next/link'
import { AdminPageShell } from '../AdminPageShell'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { createServiceClient } from '@/lib/supabase-service'

export const metadata = { title: 'Analytics — Admin' }

export default async function AnalyticsIndexPage() {
  const authClient = await createServerSupabaseClient()
  const { data: { user } } = await authClient.auth.getUser()
  if (!user) return null

  const db = createServiceClient()

  const { data: surveys } = await db
    .from('surveys')
    .select('id, title, slug, status, open_date, close_date')
    .order('created_at', { ascending: false })

  // Response counts per survey
  const { data: sessionCounts } = await db
    .from('response_sessions')
    .select('survey_id')

  const countBySurvey: Record<string, number> = {}
  for (const s of sessionCounts ?? []) {
    countBySurvey[s.survey_id] = (countBySurvey[s.survey_id] ?? 0) + 1
  }

  const statusColor: Record<string, string> = {
    active: 'bg-green-100 text-green-700',
    draft: 'bg-gray-100 text-gray-600',
    closed: 'bg-red-100 text-red-700',
  }

  const statusLabel: Record<string, string> = {
    active: 'Ativa',
    draft: 'Rascunho',
    closed: 'Encerrada',
  }

  return (
    <AdminPageShell active="auditoria" title="Analytics">
      <div className="rounded-3xl border border-white/12 bg-[#12151d]/88 p-5 text-gray-900 shadow-[0_30px_90px_rgba(0,0,0,0.45)] backdrop-blur-xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
        <p className="text-sm text-gray-500 mt-1">
          Selecione uma pesquisa para ver os dados analíticos.
        </p>
      </div>

      <div className="space-y-3">
        {(surveys ?? []).map(survey => {
          const count = countBySurvey[survey.id] ?? 0
          const status = survey.status ?? 'draft'
          return (
            <Link
              key={survey.id}
              href={`/admin/analytics/${survey.id}/overview`}
              className="block bg-white rounded-xl border border-gray-200 p-4 hover:border-blue-300 hover:shadow-sm transition-all group"
            >
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColor[status] ?? statusColor.draft}`}>
                      {statusLabel[status] ?? status}
                    </span>
                    {survey.open_date && (
                      <span className="text-xs text-gray-400">
                        {new Date(survey.open_date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}
                        {survey.close_date && ` → ${new Date(survey.close_date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}`}
                      </span>
                    )}
                  </div>
                  <p className="text-base font-medium text-gray-900 truncate group-hover:text-blue-700">
                    {survey.title}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">/{survey.slug}</p>
                </div>
                <div className="text-right shrink-0 ml-4">
                  <p className="text-2xl font-bold text-gray-700">{count.toLocaleString('pt-BR')}</p>
                  <p className="text-xs text-gray-400">respostas</p>
                </div>
              </div>
            </Link>
          )
        })}

        {!surveys?.length && (
          <div className="text-center py-12 text-gray-400">
            Nenhuma pesquisa criada ainda.
          </div>
        )}
      </div>
      </div>
    </AdminPageShell>
  )
}
