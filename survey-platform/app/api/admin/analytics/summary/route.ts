import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase-service'
import { adminAuthErrorResponse, requireAdmin } from '@/lib/admin-auth'

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

  // All sessions for this survey
  const { data: sessions } = await db
    .from('response_sessions')
    .select('id, perfil, community_id')
    .eq('survey_id', surveyId)

  type SessionRow = { id: string; perfil: string | null; community_id: string | null }
  const sessionList: SessionRow[] = sessions ?? []
  const sessionIds = sessionList.map(s => s.id)

  // NPS responses for these sessions
  type NpsRow = { value: unknown; session_id: string }
  const npsResponses: NpsRow[] = sessionIds.length > 0
    ? (await db
        .from('responses')
        .select('value, session_id')
        .eq('question_key', 'nps')
        .in('session_id', sessionIds)).data ?? []
    : []

  let promotores = 0
  let neutros = 0
  let detratores = 0

  for (const r of npsResponses) {
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

  return NextResponse.json({
    total_sessions,
    total_responsaveis,
    total_alunos,
    nps_score,
    promotores,
    neutros,
    detratores,
    comunidades_ativas,
    comunidades_com_resposta,
  })
}
