import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase-service'
import { adminAuthErrorResponse, requireAdmin } from '@/lib/admin-auth'

type Granularity = 'day' | 'week'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const surveyId = searchParams.get('surveyId')
  if (!surveyId) return NextResponse.json({ error: 'surveyId required' }, { status: 400 })

  const rawGranularity = searchParams.get('granularity') ?? 'day'
  const granularity: Granularity = rawGranularity === 'week' ? 'week' : 'day'

  try {
    await requireAdmin()
  } catch (error) {
    const authResponse = adminAuthErrorResponse(error)
    if (authResponse) return authResponse
    throw error
  }

  const db = createServiceClient()

  const { data: sessions } = await db
    .from('response_sessions')
    .select('submitted_at, perfil')
    .eq('survey_id', surveyId)
    .order('submitted_at', { ascending: true })

  // Group by period with BR timezone offset (UTC-3)
  const byPeriod: Record<string, { total: number; responsaveis: number; alunos: number }> = {}

  for (const s of sessions ?? []) {
    const dt = new Date(s.submitted_at)
    // Adjust to BR time (UTC-3)
    const brDate = new Date(dt.getTime() - 3 * 60 * 60 * 1000)
    let key: string

    if (granularity === 'week') {
      // Get Monday of the week
      const day = brDate.getDay() // 0=Sun, 1=Mon...
      const diff = (day === 0 ? -6 : 1 - day) // shift to Monday
      const monday = new Date(brDate)
      monday.setDate(brDate.getDate() + diff)
      key = monday.toISOString().slice(0, 10)
    } else {
      key = brDate.toISOString().slice(0, 10)
    }

    if (!byPeriod[key]) byPeriod[key] = { total: 0, responsaveis: 0, alunos: 0 }
    byPeriod[key].total++
    if (s.perfil === 'responsavel') byPeriod[key].responsaveis++
    else if (s.perfil === 'aluno') byPeriod[key].alunos++
  }

  const timeline = Object.entries(byPeriod)
    .map(([period, counts]) => ({ period, ...counts }))
    .sort((a, b) => a.period.localeCompare(b.period))

  return NextResponse.json({ timeline, granularity, total: sessions?.length ?? 0 })
}
