import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase-service'
import { adminAuthErrorResponse, requireAdmin } from '@/lib/admin-auth'
import { resolveCommunityPrimaryName } from '@/lib/community-identity'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const surveyId = searchParams.get('surveyId')
  if (!surveyId) return NextResponse.json({ error: 'surveyId required' }, { status: 400 })

  try {
    await requireAdmin()
  } catch (error) {
    const authResponse = adminAuthErrorResponse(error)
    if (authResponse) return authResponse
    throw error
  }

  const db = createServiceClient()

  // Sessions with their school identifier
  const { data: sessions } = await db
    .from('response_sessions')
    .select('id, school')
    .eq('survey_id', surveyId)

  type SessionRow = { id: string; school: string | null }
  const sessionList: SessionRow[] = sessions ?? []
  const sessionIds = sessionList.map(s => s.id)

  // NPS responses for these sessions
  type NpsRow = { session_id: string; value: unknown }
  const npsResponses: NpsRow[] = sessionIds.length > 0
    ? (await db
        .from('responses')
        .select('session_id, value')
        .eq('question_key', 'nps')
        .in('session_id', sessionIds)).data ?? []
    : []

  // Map session_id → school
  const sessionSchool = new Map<string, string>()
  for (const s of sessionList) {
    if (s.school) sessionSchool.set(s.id, s.school)
  }

  // Aggregate by school
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

  for (const r of npsResponses) {
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

  // Fetch community names
  const schoolIds = [...bySchool.keys()].filter(k => k !== 'sem_escola')
  type CommRow = { community_id: string; nome_escola: string | null; marca: string | null; unidade: string | null }
  const communities: CommRow[] = schoolIds.length > 0
    ? (await db
        .from('communities')
        .select('community_id, nome_escola, marca, unidade')
        .in('community_id', schoolIds)).data ?? []
    : []
  const identityMap = new Map(communities.map(c => [c.community_id, c]))

  const result = [...bySchool.entries()]
    .map(([community_id, stats]) => {
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
    .sort((a, b) => b.total_sessions - a.total_sessions)

  return NextResponse.json(result)
}
