import { notFound } from 'next/navigation'
import Link from 'next/link'
import { AdminPageShell } from '../../AdminPageShell'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import SurveyEditForm from './SurveyEditForm'
import QuestionEditor from './QuestionEditor'
import CommunityInstallManager from './CommunityInstallManager'
import { resolveCommunityPrimaryName } from '@/lib/community-identity'
import DuplicateSurveyButton from '../DuplicateSurveyButton'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function SurveyDetailPage({ params }: PageProps) {
  const { id } = await params
  const supabase = await createServerSupabaseClient()

  // Busca survey
  const { data: survey } = await supabase
    .from('surveys')
    .select('id, slug, title, status, survey_type, target_roles, open_date, close_date, description, access_control, settings')
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

  // Comunidades instaladas. Identidade visual vem da tabela global communities.
  const { data: installs } = await supabase
    .from('survey_communities')
    .select('community_id, status, active, open_date, close_date')
    .eq('survey_id', id)
    .order('community_id', { ascending: true })

  const installedCommunityIds = (installs ?? []).map(i => i.community_id)
  const { data: communityRows } = installedCommunityIds.length > 0
    ? await supabase
        .from('communities')
        .select('community_id, nome_escola, marca, unidade')
        .in('community_id', installedCommunityIds)
    : { data: [] }
  const identityByCommunity = new Map((communityRows ?? []).map(c => [c.community_id, c]))
  const { data: allCommunityRows } = await supabase
    .from('communities')
    .select('community_id, nome_escola, marca, unidade')
    .order('marca', { ascending: true })
    .order('unidade', { ascending: true })

  const availableCommunities = (allCommunityRows ?? []).map(c => ({
    community_id: c.community_id,
    nomeEscola: c.nome_escola ?? null,
    marca: c.marca ?? null,
    unidade: c.unidade ?? null,
  }))

  // Stats de respostas
  const { data: sessions } = await supabase
    .from('response_sessions')
    .select('id, perfil, school, onda')
    .eq('survey_id', id)

  const total       = sessions?.length ?? 0
  const responsaveis = sessions?.filter(s => s.perfil === 'responsavel').length ?? 0
  const alunos      = sessions?.filter(s => s.perfil === 'aluno').length ?? 0
  const { count: sampleResolvedCount } = await supabase
    .from('survey_sample_lists')
    .select('id', { count: 'exact', head: true })
    .eq('survey_id', id)
    .not('layers_user_id', 'is', null)
    .neq('layers_user_id', 'NOT_FOUND')
  const sampleSize = sampleResolvedCount ?? 0
  const isSampleSurvey = survey.access_control === 'amostra' || sampleSize > 0
  const sampleResponseRate = isSampleSurvey && sampleSize > 0
    ? Math.round((total / sampleSize) * 1000) / 10
    : null

  // Escolas com mais respostas (top 5)
  const schoolCount: Record<string, number> = {}
  for (const s of sessions ?? []) {
    if (s.school) schoolCount[s.school] = (schoolCount[s.school] ?? 0) + 1
  }
  const topSchools = Object.entries(schoolCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)

  return (
    <AdminPageShell
      active="surveys"
      title={survey.title}
      action={<DuplicateSurveyButton surveyId={id} surveyTitle={survey.title} tone="dark" />}
    >
      <div className="rounded-3xl border border-white/12 bg-[#12151d]/88 p-5 text-gray-900 shadow-[0_30px_90px_rgba(0,0,0,0.45)] backdrop-blur-xl">
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Total de respostas', value: total,       color: 'text-[#F7941D]', hint: null },
            { label: 'Responsáveis',       value: responsaveis, color: 'text-blue-600', hint: null },
            { label: 'Alunos',            value: alunos,       color: 'text-purple-600', hint: null },
            ...(isSampleSurvey
              ? [{
                  label: 'Taxa da amostra',
                  value: sampleResponseRate !== null ? `${sampleResponseRate}%` : '-',
                  color: 'text-emerald-600',
                  hint: `${total}/${sampleSize} responderam`,
                }]
              : []),
          ].map(({ label, value, color, hint }) => (
            <div key={label} className="bg-white rounded-xl border border-gray-200 p-4">
              <div className={`text-2xl font-bold ${color}`}>{value}</div>
              <div className="text-xs text-gray-500 mt-0.5">{label}</div>
              {hint && <div className="text-[11px] text-gray-400 mt-1">{hint}</div>}
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
                  <span className="text-gray-600 text-xs">{resolveCommunityPrimaryName(identityByCommunity.get(school) ?? { community_id: school })}</span>
                  <div className="flex items-center gap-2">
                    <div
                      className="h-1.5 bg-[#F7941D]/30 rounded-full"
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
            availableCommunities={availableCommunities}
            installs={(installs ?? []).map(i => ({
              community_id: i.community_id,
              status:       i.status,
              active:       i.active,
              nomeEscola:   identityByCommunity.get(i.community_id)?.nome_escola ?? null,
              marca:        identityByCommunity.get(i.community_id)?.marca ?? null,
              unidade:      identityByCommunity.get(i.community_id)?.unidade ?? null,
              open_date:    i.open_date as string | null ?? null,
              close_date:   i.close_date as string | null ?? null,
            }))}
          />
        </div>

        {/* Adaptações por comunidade */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h3 className="text-sm font-semibold text-gray-700">Adaptações por comunidade</h3>
              <p className="text-xs text-gray-400 mt-0.5">
                Personalize textos por comunidade sem duplicar perguntas, respostas ou relatórios.
              </p>
            </div>
            <Link
              href={`/admin/surveys/${id}/textos`}
              className="bg-[#F7941D] text-white text-sm px-4 py-2 rounded-lg hover:bg-[#D97B10] transition-colors font-medium"
            >
              Editar textos
            </Link>
          </div>
        </div>

        {/* Card de amostra */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-gray-700">Amostra Segmentada</h3>
              <p className="text-xs text-gray-400 mt-0.5">
                Faça upload de uma lista de usuários para segmentar esta pesquisa.
              </p>
            </div>
            <Link
              href={`/admin/surveys/${id}/sample`}
              className="bg-[#F7941D] text-white text-sm px-4 py-2 rounded-lg hover:bg-[#D97B10] transition-colors font-medium"
            >
              Gerenciar
            </Link>
          </div>
        </div>

        {/* Card de disparos */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-gray-700">Disparos</h3>
              <p className="text-xs text-gray-400 mt-0.5">
                Envie notificações push e email para as famílias via Layers.
              </p>
            </div>
            <Link
              href={`/admin/surveys/${id}/dispatch`}
              className="bg-[#F7941D] text-white text-sm px-4 py-2 rounded-lg hover:bg-[#D97B10] transition-colors font-medium"
            >
              📢 Disparar
            </Link>
          </div>
        </div>

        {/* Links para respostas e identidade visual */}
        <div className="flex justify-end gap-4">
          <Link
            href={`/admin/surveys/${id}/communities`}
            className="text-sm text-[#F7941D] hover:text-[#D97B10] font-medium"
          >
            Identidade Visual →
          </Link>
          {total > 0 && (
            <Link
              href={`/admin/surveys/${id}/responses`}
              className="text-sm text-[#F7941D] hover:text-[#D97B10] font-medium"
            >
              Ver todas as respostas →
            </Link>
          )}
          <Link
            href={`/admin/surveys/${id}/disparos`}
            className="text-sm text-[#F7941D] hover:text-[#D97B10] font-medium"
          >
            Disparos →
          </Link>
        </div>

        {/* Formulário de edição */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Metadados</h3>
          <SurveyEditForm survey={survey} settings={survey.settings as Record<string, unknown> | null} />
        </div>

        {/* Editor de perguntas */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Perguntas</h3>
          <QuestionEditor surveyId={id} questions={questions} />
        </div>
      </div>
      </div>
    </AdminPageShell>
  )
}
