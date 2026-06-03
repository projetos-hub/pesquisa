import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

export async function GET() {
  const supabase = await createServerSupabaseClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Surveys com contagem de respostas e comunidades
  const { data: surveys } = await supabase
    .from('surveys')
    .select(`
      id, slug, title, status, open_date, close_date,
      response_sessions(id, submitted_at, school, community_id, synced_to_sheets),
      survey_communities(community_id, status)
    `)
    .order('created_at', { ascending: false })

  const result = (surveys ?? []).map(s => {
    const sessions = Array.isArray(s.response_sessions) ? s.response_sessions : []
    const communities = Array.isArray(s.survey_communities) ? s.survey_communities : []
    const activeCommunities = communities.filter((c: { status: string }) => c.status === 'ativa').length
    const totalResponses = sessions.length
    const syncedCount = sessions.filter((r: { synced_to_sheets: boolean }) => r.synced_to_sheets).length
    const lastResponse = sessions.length > 0
      ? sessions.sort((a: { submitted_at: string }, b: { submitted_at: string }) =>
          new Date(b.submitted_at).getTime() - new Date(a.submitted_at).getTime()
        )[0].submitted_at
      : null

    // Escola com mais respostas
    const schoolCount: Record<string, number> = {}
    for (const sess of sessions) {
      const key = (sess as { school?: string }).school || 'sem escola'
      schoolCount[key] = (schoolCount[key] ?? 0) + 1
    }

    return {
      id: s.id,
      slug: s.slug,
      title: s.title,
      status: s.status,
      open_date: s.open_date,
      close_date: s.close_date,
      total_responses: totalResponses,
      active_communities: activeCommunities,
      sync_rate: totalResponses > 0 ? Math.round((syncedCount / totalResponses) * 100) : 0,
      last_response_at: lastResponse,
      school_breakdown: Object.entries(schoolCount)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([school, count]) => ({ school, count })),
    }
  })

  return NextResponse.json(result)
}
