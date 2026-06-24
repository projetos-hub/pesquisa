// GET /api/admin/surveys/[id]/sample/communities
// Returns sample communities with total and resolved counts.

import { createServerSupabaseClient } from '@/lib/supabase-server'
import { createServiceClient } from '@/lib/supabase-service'

const PAGE_SIZE = 1000

async function requireAuth() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authorized')
}

type SampleRow = {
  community_id: string
  layers_user_id: string | null
}

async function fetchAllSampleRows(surveyId: string): Promise<SampleRow[]> {
  const supabase = createServiceClient()
  const rows: SampleRow[] = []

  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await supabase
      .from('survey_sample_lists')
      .select('community_id, layers_user_id')
      .eq('survey_id', surveyId)
      .range(from, from + PAGE_SIZE - 1)

    if (error) throw error
    rows.push(...((data ?? []) as SampleRow[]))
    if (!data || data.length < PAGE_SIZE) break
  }

  return rows
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireAuth()
    const { id } = await params
    const supabase = createServiceClient()

    const rows = await fetchAllSampleRows(id)
    if (rows.length === 0) {
      return Response.json({ communities: [] })
    }

    const map = new Map<string, { total: number; resolved: number }>()
    for (const row of rows) {
      const entry = map.get(row.community_id) ?? { total: 0, resolved: 0 }
      entry.total++
      if (row.layers_user_id && row.layers_user_id !== 'NOT_FOUND') entry.resolved++
      map.set(row.community_id, entry)
    }

    const communityIds = [...map.keys()]
    const { data: communityRows } = await supabase
      .from('communities')
      .select('community_id, nome_escola')
      .in('community_id', communityIds)

    const nomeMap = new Map<string, string>()
    for (const community of communityRows ?? []) {
      nomeMap.set(community.community_id, community.nome_escola ?? community.community_id)
    }

    const communities = communityIds.map(cid => ({
      community_id: cid,
      nome: nomeMap.get(cid) ?? cid,
      total: map.get(cid)!.total,
      resolved: map.get(cid)!.resolved,
    })).sort((a, b) => b.resolved - a.resolved)

    return Response.json({ communities })
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: err instanceof Error && err.message === 'Not authorized' ? 401 : 500 },
    )
  }
}
