import { createServerSupabaseClient } from '@/lib/supabase-server'
import { createServiceClient } from '@/lib/supabase-service'
import { notFound } from 'next/navigation'
import { PerfilBreakdown } from '@/components/analytics/PerfilBreakdown'
import { avgFromJsonbScore } from '@/lib/analytics-utils'

interface PageProps {
  params: Promise<{ surveyId: string }>
}

export default async function BreakdownPage({ params }: PageProps) {
  const { surveyId } = await params

  const authClient = await createServerSupabaseClient()
  const { data: { user } } = await authClient.auth.getUser()
  if (!user) return null

  const db = createServiceClient()

  const { data: survey } = await db
    .from('surveys')
    .select('id')
    .eq('id', surveyId)
    .single()

  if (!survey) notFound()

  const { data: sessions } = await db
    .from('response_sessions')
    .select('id, perfil')
    .eq('survey_id', surveyId)

  const sessionList = sessions ?? []
  const sessionIds = sessionList.map(s => s.id)

  const sessionPerfil = new Map<string, string>()
  for (const s of sessionList) {
    sessionPerfil.set(s.id, s.perfil ?? 'desconhecido')
  }

  const { data: allResponses } = sessionIds.length > 0
    ? await db
        .from('responses')
        .select('session_id, question_key, value')
        .in('session_id', sessionIds)
    : { data: [] }

  type PerfilStats = {
    total: number
    total_com_nps: number
    nps_scores: number[]
    pedagogico_scores: number[]
    administrativo_scores: number[]
    infraestrutura_scores: number[]
    bilingue_scores: number[]
  }

  const byPerfil: Record<string, PerfilStats> = {}

  for (const s of sessionList) {
    const p = s.perfil ?? 'desconhecido'
    if (!byPerfil[p]) {
      byPerfil[p] = {
        total: 0,
        total_com_nps: 0,
        nps_scores: [],
        pedagogico_scores: [],
        administrativo_scores: [],
        infraestrutura_scores: [],
        bilingue_scores: [],
      }
    }
    byPerfil[p].total++
  }

  for (const r of allResponses ?? []) {
    const perfil = sessionPerfil.get(r.session_id) ?? 'desconhecido'
    const entry = byPerfil[perfil]
    if (!entry) continue
    const val = r.value as Record<string, unknown>

    if (r.question_key === 'nps') {
      const score = Number(val?.nps)
      if (!isNaN(score)) {
        entry.total_com_nps++
        entry.nps_scores.push(score)
      }
    } else if (r.question_key === 'pedagogico') {
      const avg = avgFromJsonbScore(val)
      if (avg !== null) entry.pedagogico_scores.push(avg)
    } else if (r.question_key === 'administrativo') {
      const avg = avgFromJsonbScore(val)
      if (avg !== null) entry.administrativo_scores.push(avg)
    } else if (r.question_key === 'infraestrutura') {
      const avg = avgFromJsonbScore(val)
      if (avg !== null) entry.infraestrutura_scores.push(avg)
    } else if (r.question_key === 'bilingue') {
      const avg = avgFromJsonbScore(val)
      if (avg !== null) entry.bilingue_scores.push(avg)
    }
  }

  function mean(arr: number[]): number | null {
    if (!arr.length) return null
    return Math.round((arr.reduce((a, b) => a + b, 0) / arr.length) * 10) / 10
  }

  function npsFromScores(scores: number[]): number | null {
    if (!scores.length) return null
    const p = scores.filter(s => s >= 9).length
    const d = scores.filter(s => s <= 6).length
    return Math.round(((p - d) / scores.length) * 1000) / 10
  }

  const breakdownData = Object.entries(byPerfil).map(([perfil, stats]) => ({
    perfil,
    total: stats.total,
    total_com_nps: stats.total_com_nps,
    nps_score: npsFromScores(stats.nps_scores),
    avg_pedagogico: mean(stats.pedagogico_scores),
    avg_administrativo: mean(stats.administrativo_scores),
    avg_infraestrutura: mean(stats.infraestrutura_scores),
    avg_bilingue: mean(stats.bilingue_scores),
  }))

  return (
    <div className="p-6">
      <PerfilBreakdown data={breakdownData} />
    </div>
  )
}
