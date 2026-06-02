import { createServiceClient } from '@/lib/supabase-service'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { notFound } from 'next/navigation'
import { KpiCard } from '@/components/analytics/KpiCard'
import { NpsGauge } from '@/components/analytics/NpsGauge'

interface PageProps {
  params: Promise<{ surveyId: string }>
}

export default async function OverviewPage({ params }: PageProps) {
  const { surveyId } = await params

  const authClient = await createServerSupabaseClient()
  const { data: { user } } = await authClient.auth.getUser()
  if (!user) return null

  const db = createServiceClient()

  // Survey info
  const { data: survey } = await db
    .from('surveys')
    .select('id, title, status, open_date, close_date')
    .eq('id', surveyId)
    .single()

  if (!survey) notFound()

  // Sessions
  const { data: sessions } = await db
    .from('response_sessions')
    .select('id, perfil, community_id')
    .eq('survey_id', surveyId)

  const sessionList = sessions ?? []
  const sessionIds = sessionList.map(s => s.id)

  // NPS
  const { data: npsResponses } = sessionIds.length > 0
    ? await db
        .from('responses')
        .select('value, session_id')
        .eq('question_key', 'nps')
        .in('session_id', sessionIds)
    : { data: [] }

  let promotores = 0
  let neutros = 0
  let detratores = 0

  for (const r of npsResponses ?? []) {
    const val = r.value as Record<string, unknown>
    const score = Number(val?.nps)
    if (isNaN(score)) continue
    if (score >= 9) promotores++
    else if (score >= 7) neutros++
    else detratores++
  }

  const totalNps = promotores + neutros + detratores
  const nps_score: number | null = totalNps > 0
    ? Math.round(((promotores - detratores) / totalNps) * 1000) / 10
    : null

  const total_sessions = sessionList.length
  const total_responsaveis = sessionList.filter(s => s.perfil === 'responsavel').length
  const total_alunos = sessionList.filter(s => s.perfil === 'aluno').length

  // Communities
  const { data: commData } = await db
    .from('survey_communities')
    .select('community_id')
    .eq('survey_id', surveyId)
    .eq('status', 'ativa')

  const comunidades_ativas = commData?.length ?? 0
  const communityIdsWithResponses = new Set(sessionList.map(s => s.community_id).filter(Boolean))
  const comunidades_com_resposta = communityIdsWithResponses.size

  const coverageRate = comunidades_ativas > 0
    ? Math.round((comunidades_com_resposta / comunidades_ativas) * 100)
    : 0

  return (
    <div className="p-6">
      {/* KPI grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <KpiCard
          label="Total de Respostas"
          value={total_sessions.toLocaleString('pt-BR')}
          color="blue"
        />
        <KpiCard
          label="Responsáveis"
          value={total_responsaveis.toLocaleString('pt-BR')}
          subtext={total_sessions > 0 ? `${Math.round((total_responsaveis / total_sessions) * 100)}% do total` : undefined}
          color="purple"
        />
        <KpiCard
          label="Alunos"
          value={total_alunos.toLocaleString('pt-BR')}
          subtext={total_sessions > 0 ? `${Math.round((total_alunos / total_sessions) * 100)}% do total` : undefined}
          color="green"
        />
        <KpiCard
          label="Cobertura"
          value={`${comunidades_com_resposta}/${comunidades_ativas}`}
          subtext={`${coverageRate}% das comunidades`}
          color={coverageRate >= 80 ? 'green' : coverageRate >= 50 ? 'yellow' : 'red'}
        />
      </div>

      {/* NPS Gauge */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <NpsGauge
          nps_score={nps_score}
          promotores={promotores}
          neutros={neutros}
          detratores={detratores}
        />

        {/* Survey info card */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-3">Pesquisa</p>
          <p className="text-lg font-semibold text-gray-900 mb-2">{survey.title}</p>
          <div className="space-y-1 text-sm text-gray-600">
            <p>Status: <span className="font-medium">{survey.status}</span></p>
            {survey.open_date && (
              <p>Abertura: <span className="font-medium">
                {new Date(survey.open_date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
              </span></p>
            )}
            {survey.close_date && (
              <p>Encerramento: <span className="font-medium">
                {new Date(survey.close_date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
              </span></p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
