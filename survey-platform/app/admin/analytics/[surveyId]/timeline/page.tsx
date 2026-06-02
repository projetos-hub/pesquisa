import { createServerSupabaseClient } from '@/lib/supabase-server'
import { createServiceClient } from '@/lib/supabase-service'
import { notFound } from 'next/navigation'
import TimelinePageClient from './_client'

interface PageProps {
  params: Promise<{ surveyId: string }>
  searchParams: Promise<{ granularity?: string }>
}

export default async function TimelinePage({ params, searchParams }: PageProps) {
  const { surveyId } = await params
  const { granularity: rawGran } = await searchParams
  const granularity = rawGran === 'week' ? 'week' : 'day'

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

  // Fetch sessions
  const { data: sessions } = await db
    .from('response_sessions')
    .select('submitted_at, perfil')
    .eq('survey_id', surveyId)
    .order('submitted_at', { ascending: true })

  // Group by period in JS (BR timezone)
  const byPeriod: Record<string, { total: number; responsaveis: number; alunos: number }> = {}

  for (const s of sessions ?? []) {
    const dt = new Date(s.submitted_at)
    const brDate = new Date(dt.getTime() - 3 * 60 * 60 * 1000)
    let key: string

    if (granularity === 'week') {
      const day = brDate.getDay()
      const diff = day === 0 ? -6 : 1 - day
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

  return (
    <div className="p-6">
      <TimelinePageClient
        surveyId={surveyId}
        initialData={timeline}
        initialGranularity={granularity as 'day' | 'week'}
      />
    </div>
  )
}
