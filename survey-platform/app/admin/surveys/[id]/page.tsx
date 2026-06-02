import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import SurveyEditForm from './SurveyEditForm'
import QuestionEditor from './QuestionEditor'
import CommunityInstallManager from './CommunityInstallManager'
import { formatCommunityId } from '@/lib/community-name'
import { ChevronLeftIcon, ClipboardListIcon, BellIcon, UsersIcon, GraduationCapIcon } from '@/app/admin/icons'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function SurveyDetailPage({ params }: PageProps) {
  const { id } = await params
  const supabase = await createServerSupabaseClient()

  // Busca survey
  const { data: survey } = await supabase
    .from('surveys')
    .select('id, slug, title, status, survey_type, target_roles, open_date, close_date, description, access_control')
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

  // Comunidades instaladas (inclui theme para exibir nomeEscola e datas por comunidade)
  const { data: installs } = await supabase
    .from('survey_communities')
    .select('community_id, status, active, theme, open_date, close_date')
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
      <div className="flex items-center gap-2 mb-6 text-sm">
        <Link
          href="/admin/surveys"
          className="flex items-center gap-1 text-[#718096] hover:text-[#1A202C] transition-colors"
        >
          <ChevronLeftIcon size={15} strokeWidth={1.75} />
          Pesquisas
        </Link>
        <span className="text-[#E2E8F0]">/</span>
        <span className="font-medium text-[#1A202C] truncate">{survey.title}</span>
      </div>

      <div className="grid gap-6">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Total de respostas', value: total,        icon: ClipboardListIcon, iconBg: 'bg-[#FDE8C8]', iconColor: 'text-[#F7941D]', accentColor: '#F7941D' },
            { label: 'Responsáveis',       value: responsaveis, icon: UsersIcon,         iconBg: 'bg-blue-50',   iconColor: 'text-blue-600',  accentColor: '#3B82F6' },
            { label: 'Alunos',             value: alunos,       icon: GraduationCapIcon, iconBg: 'bg-purple-50', iconColor: 'text-purple-600', accentColor: '#9333EA' },
          ].map(({ label, value, icon: Icon, iconBg, iconColor, accentColor }) => (
            <div key={label} className="bg-white rounded-xl shadow-sm overflow-hidden">
              <div className="h-0.5 w-full" style={{ backgroundColor: accentColor }} />
              <div className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs text-[#718096]">{label}</p>
                    <p className="text-xl font-semibold text-[#1A202C] mt-1 tabular-nums">{value}</p>
                  </div>
                  <div className={`rounded-lg p-2 ${iconBg}`}>
                    <Icon className={iconColor} size={18} strokeWidth={1.75} />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Top escolas */}
        {topSchools.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm p-4">
            <h3 className="text-sm font-semibold text-[#1A202C] mb-3">Respostas por escola</h3>
            <div className="flex flex-col gap-2">
              {topSchools.map(([school, count]) => (
                <div key={school} className="flex items-center gap-3">
                  <span className="w-36 shrink-0 text-xs text-[#718096] truncate">
                    {formatCommunityId(school)}
                  </span>
                  <div className="flex-1 h-[14px] bg-[#F8F9FA] rounded-sm overflow-hidden">
                    <div
                      className="h-full rounded-sm transition-all duration-300"
                      style={{
                        width: `${Math.round((count / total) * 100)}%`,
                        backgroundColor: '#F7941D',
                        opacity: 0.6,
                      }}
                    />
                  </div>
                  <span className="w-8 shrink-0 text-xs font-semibold text-[#1A202C] text-right tabular-nums">
                    {count}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Comunidades instaladas */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="text-sm font-semibold text-[#1A202C] mb-2">Comunidades</h3>
          <p className="text-xs text-[#718096] mb-4">
            Define em quais comunidades esta pesquisa aparece no portal Layers.
          </p>
          <CommunityInstallManager
            surveyId={id}
            installs={(installs ?? []).map(i => ({
              community_id: i.community_id,
              status:       i.status,
              active:       i.active,
              nomeEscola:   (i.theme as { nomeEscola?: string } | null)?.nomeEscola ?? null,
              open_date:    i.open_date as string | null ?? null,
              close_date:   i.close_date as string | null ?? null,
            }))}
          />
        </div>

        {/* Card de amostra */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-[#1A202C]">Amostra Segmentada</h3>
              <p className="text-xs text-[#718096] mt-0.5">
                Faça upload de uma lista de usuários para segmentar esta pesquisa.
              </p>
            </div>
            <Link
              href={`/admin/surveys/${id}/sample`}
              className="inline-flex items-center gap-1.5 text-white text-sm px-4 py-2 rounded-lg transition-colors font-medium min-h-[40px]"
              style={{ backgroundColor: '#F7941D' }}
            >
              <ClipboardListIcon size={15} strokeWidth={1.75} />
              Gerenciar
            </Link>
          </div>
        </div>

        {/* Card de disparos */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-[#1A202C]">Disparos</h3>
              <p className="text-xs text-[#718096] mt-0.5">
                Envie notificações push e email para as famílias via Layers.
              </p>
            </div>
            <Link
              href={`/admin/surveys/${id}/dispatch`}
              className="inline-flex items-center gap-1.5 text-white text-sm px-4 py-2 rounded-lg transition-colors font-medium min-h-[40px]"
              style={{ backgroundColor: '#F7941D' }}
            >
              <BellIcon size={15} strokeWidth={1.75} />
              Disparar
            </Link>
          </div>
        </div>

        {/* Links para respostas e identidade visual */}
        <div className="flex justify-end gap-4">
          <Link
            href={`/admin/surveys/${id}/communities`}
            className="text-sm text-[#F7941D] hover:text-[#D97B10] font-medium transition-colors"
          >
            Identidade Visual →
          </Link>
          {total > 0 && (
            <Link
              href={`/admin/surveys/${id}/responses`}
              className="text-sm text-[#F7941D] hover:text-[#D97B10] font-medium transition-colors"
            >
              Ver todas as respostas →
            </Link>
          )}
          <Link
            href={`/admin/surveys/${id}/disparos`}
            className="text-sm text-[#F7941D] hover:text-[#D97B10] font-medium transition-colors"
          >
            Disparos →
          </Link>
        </div>

        {/* Formulário de edição */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="text-sm font-semibold text-[#1A202C] mb-4">Metadados</h3>
          <SurveyEditForm survey={survey} />
        </div>

        {/* Editor de perguntas */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="text-sm font-semibold text-[#1A202C] mb-4">Perguntas</h3>
          <QuestionEditor surveyId={id} questions={questions} />
        </div>
      </div>
    </div>
  )
}
