import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import SurveyEditForm from './SurveyEditForm'
import QuestionEditor from './QuestionEditor'
import CommunityInstallManager from './CommunityInstallManager'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function SurveyDetailPage({ params }: PageProps) {
  const { id } = await params
  const supabase = await createServerSupabaseClient()

  // Busca survey
  const { data: survey } = await supabase
    .from('surveys')
    .select('id, slug, title, status, survey_type, target_roles, open_date, close_date, description')
    .eq('id', id)
    .single()

  if (!survey) notFound()

  // Busca perguntas com opções
  const { data: questionsRaw } = await supabase
    .from('questions')
    .select('id, order_index, type, key, title, description, required, settings')
    .eq('survey_id', id)
    .order('order_index', { ascending: true })

  const { data: optionsRaw } = await supabase
    .from('question_options')
    .select('id, question_id, order_index, label')
    .in('question_id', (questionsRaw ?? []).map(q => q.id))
    .order('order_index', { ascending: true })

  const questions = (questionsRaw ?? []).map(q => ({
    ...q,
    settings: (q.settings ?? {}) as Record<string, unknown>,
    description: q.description as string | null,
    options: (optionsRaw ?? []).filter(o => o.question_id === q.id),
  }))

  // Comunidades instaladas
  const { data: installs } = await supabase
    .from('survey_communities')
    .select('community_id, status, active')
    .eq('survey_id', id)
    .order('community_id', { ascending: true })

  // Stats de respostas
  const { data: sessions } = await supabase
    .from('response_sessions')
    .select('id, perfil, school, onda')
    .eq('survey_id', id)

  const total       = sessions?.length ?? 0
  const responsaveis = sessions?.filter(s => s.perfil === 'responsavel').length ?? 0
  const alunos      = sessions?.filter(s => s.perfil === 'aluno').length ?? 0

  // Escolas com mais respostas (top 5)
  const schoolCount: Record<string, number> = {}
  for (const s of sessions ?? []) {
    if (s.school) schoolCount[s.school] = (schoolCount[s.school] ?? 0) + 1
  }
  const topSchools = Object.entries(schoolCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)

  return (
    <div className="p-6 max-w-3xl">
      {/* Breadcrumb */}
      <div className="flex items-center gap-3 mb-6">
        <Link href="/admin/surveys" className="text-gray-400 hover:text-gray-600 text-sm">
          ← Pesquisas
        </Link>
        <span className="text-gray-300">/</span>
        <h2 className="text-lg font-semibold text-gray-900 truncate">{survey.title}</h2>
      </div>

      <div className="grid gap-6">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Total de respostas', value: total,       color: 'text-indigo-600' },
            { label: 'Responsáveis',       value: responsaveis, color: 'text-blue-600' },
            { label: 'Alunos',            value: alunos,       color: 'text-purple-600' },
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-white rounded-xl border border-gray-200 p-4">
              <div className={`text-2xl font-bold ${color}`}>{value}</div>
              <div className="text-xs text-gray-500 mt-0.5">{label}</div>
            </div>
          ))}
        </div>

        {/* Top escolas */}
        {topSchools.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <h3 className="text-sm font-medium text-gray-700 mb-3">Respostas por escola</h3>
            <div className="space-y-2">
              {topSchools.map(([school, count]) => (
                <div key={school} className="flex items-center justify-between text-sm">
                  <span className="text-gray-600 font-mono text-xs">{school}</span>
                  <div className="flex items-center gap-2">
                    <div
                      className="h-1.5 bg-indigo-200 rounded-full"
                      style={{ width: `${Math.round((count / total) * 80 + 20)}px` }}
                    />
                    <span className="text-gray-900 font-medium w-6 text-right">{count}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Comunidades instaladas */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Comunidades</h3>
          <p className="text-xs text-gray-400 mb-4">
            Define em quais comunidades esta pesquisa aparece no portal Layers.
          </p>
          <CommunityInstallManager
            surveyId={id}
            installs={installs ?? []}
          />
        </div>

        {/* Links para respostas e identidade visual */}
        <div className="flex justify-end gap-4">
          <Link
            href={`/admin/surveys/${id}/communities`}
            className="text-sm text-indigo-600 hover:text-indigo-800 font-medium"
          >
            Identidade Visual →
          </Link>
          {total > 0 && (
            <Link
              href={`/admin/surveys/${id}/responses`}
              className="text-sm text-indigo-600 hover:text-indigo-800 font-medium"
            >
              Ver todas as respostas →
            </Link>
          )}
        </div>

        {/* Formulário de edição */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Metadados</h3>
          <SurveyEditForm survey={survey} />
        </div>

        {/* Editor de perguntas */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Perguntas</h3>
          <QuestionEditor surveyId={id} questions={questions} />
        </div>
      </div>
    </div>
  )
}
