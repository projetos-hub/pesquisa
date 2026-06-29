import { createServerSupabaseClient } from '@/lib/supabase-server'
import { createServiceClient } from '@/lib/supabase-service'
import { notFound } from 'next/navigation'
import { CommunityTable } from '@/components/analytics/CommunityTable'
import { resolveCommunityPrimaryName } from '@/lib/community-identity'

interface PageProps {
  params: Promise<{ surveyId: string }>
}

export default async function CommunitiesPage({ params }: PageProps) {
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

  // Sessions grouped by school
  const { data: sessions } = await db
    .from('response_sessions')
    .select('id, school')
    .eq('survey_id', surveyId)

  const sessionList = sessions ?? []
  const sessionIds = sessionList.map(s => s.id)

  // NPS responses
  const { data: npsResponses } = sessionIds.length > 0
    ? await db
        .from('responses')
        .select('session_id, value')
        .eq('question_key', 'nps')
        .in('session_id', sessionIds)
    : { data: [] }

  const sessionSchool = new Map<string, string>()
  for (const s of sessionList) {
    if (s.school) sessionSchool.set(s.id, s.school)
  }

  const bySchool = new Map<string, {
    total_sessions: number
    promotores: number
    neutros: number
    detratores: number
    total_nps: number
  }>()

  for (const s of sessionList) {
    const key = s.school ?? 'sem_escola'
    if (!bySchool.has(key)) {
      bySchool.set(key, { total_sessions: 0, promotores: 0, neutros: 0, detratores: 0, total_nps: 0 })
    }
    bySchool.get(key)!.total_sessions++
  }

  for (const r of npsResponses ?? []) {
    const school = sessionSchool.get(r.session_id) ?? 'sem_escola'
    const val = r.value as Record<string, unknown>
    const score = Number(val?.nps)
    if (isNaN(score)) continue
    const entry = bySchool.get(school)
    if (!entry) continue
    entry.total_nps++
    if (score >= 9) entry.promotores++
    else if (score >= 7) entry.neutros++
    else entry.detratores++
  }

  // Community names
  const schoolIds = [...bySchool.keys()].filter(k => k !== 'sem_escola')
  const { data: communities } = schoolIds.length > 0
    ? await db
        .from('communities')
        .select('community_id, nome_escola, marca, unidade')
        .in('community_id', schoolIds)
    : { data: [] }
  const identityMap = new Map((communities ?? []).map(c => [c.community_id, c]))

  const tableData = [...bySchool.entries()].map(([community_id, stats]) => {
    const nps_score: number | null = stats.total_nps > 0
      ? Math.round(((stats.promotores - stats.detratores) / stats.total_nps) * 1000) / 10
      : null
    return {
      community_id,
      nome_escola: resolveCommunityPrimaryName(identityMap.get(community_id) ?? { community_id }),
      marca: identityMap.get(community_id)?.marca ?? null,
      unidade: identityMap.get(community_id)?.unidade ?? null,
      ...stats,
      nps_score,
    }
  })

  return (
    <div className="p-6">
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-gray-500">
          {tableData.length} comunidade{tableData.length !== 1 ? 's' : ''} com respostas
        </p>
      </div>
      <CommunityTable data={tableData} />
    </div>
  )
}
