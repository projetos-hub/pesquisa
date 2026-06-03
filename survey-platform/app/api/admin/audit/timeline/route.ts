import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const surveyId = searchParams.get('surveyId')
  if (!surveyId) return NextResponse.json({ error: 'surveyId required' }, { status: 400 })

  const supabase = await createServerSupabaseClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Respostas por hora (fuso BR)
  const { data: sessions } = await supabase
    .from('response_sessions')
    .select('submitted_at, school, community_id')
    .eq('survey_id', surveyId)
    .order('submitted_at', { ascending: true })

  // Agrupa por hora
  const byHour: Record<string, number> = {}
  for (const s of sessions ?? []) {
    const dt = new Date(s.submitted_at)
    // Fuso BR: UTC-3
    const brHour = new Date(dt.getTime() - 3 * 60 * 60 * 1000)
    const key = brHour.toISOString().slice(0, 13) + ':00'
    byHour[key] = (byHour[key] ?? 0) + 1
  }

  const timeline = Object.entries(byHour)
    .map(([hour, count]) => ({ hour, count }))
    .sort((a, b) => a.hour.localeCompare(b.hour))

  // Por escola (top 15)
  const bySchool: Record<string, number> = {}
  for (const s of sessions ?? []) {
    const key = (s as { school?: string }).school || 'sem escola'
    bySchool[key] = (bySchool[key] ?? 0) + 1
  }
  const bySchoolArr = Object.entries(bySchool)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15)
    .map(([school, count]) => ({ school, count }))

  return NextResponse.json({ timeline, by_school: bySchoolArr, total: sessions?.length ?? 0 })
}
