// GET /api/admin/surveys/[id]/sample/communities
// Retorna comunidades presentes na amostra com contagens de total e resolvidos.
// Usado pelo DispatchForm para mostrar checklist de segmentação.

import { createServerSupabaseClient } from '@/lib/supabase-server'
import { createServiceClient }        from '@/lib/supabase-service'

async function requireAuth() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authorized')
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireAuth()
    const { id } = await params
    const supabase = createServiceClient()

    // Contagem por community_id — total e resolvidos
    const { data: rows } = await supabase
      .from('survey_sample_lists')
      .select('community_id, layers_user_id')
      .eq('survey_id', id)

    if (!rows || rows.length === 0) {
      return Response.json({ communities: [] })
    }

    // Agregar por community_id
    const map = new Map<string, { total: number; resolved: number }>()
    for (const r of rows) {
      const entry = map.get(r.community_id) ?? { total: 0, resolved: 0 }
      entry.total++
      if (r.layers_user_id && r.layers_user_id !== 'NOT_FOUND') entry.resolved++
      map.set(r.community_id, entry)
    }

    // Buscar nomeEscola do tema de cada community
    const communityIds = [...map.keys()]
    const { data: themes } = await supabase
      .from('survey_communities')
      .select('community_id, theme')
      .eq('survey_id', id)
      .in('community_id', communityIds)

    const nomeMap = new Map<string, string>()
    for (const t of themes ?? []) {
      const nome = (t.theme as { nomeEscola?: string } | null)?.nomeEscola ?? t.community_id
      nomeMap.set(t.community_id, nome)
    }

    const communities = communityIds.map(cid => ({
      community_id: cid,
      nome:         nomeMap.get(cid) ?? cid,
      total:        map.get(cid)!.total,
      resolved:     map.get(cid)!.resolved,
    })).sort((a, b) => b.resolved - a.resolved)

    return Response.json({ communities })
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: err instanceof Error && err.message === 'Not authorized' ? 401 : 500 },
    )
  }
}
