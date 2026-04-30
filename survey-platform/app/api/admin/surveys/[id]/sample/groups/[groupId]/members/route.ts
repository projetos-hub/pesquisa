// GET    /api/admin/surveys/[id]/sample/groups/[groupId]/members
//        ?community=X&perfil=responsavel&q=nome&status=resolved&limit=N&offset=N
// POST   — adicionar membros (bulk por sample IDs)
// DELETE — remover membros (bulk por sample IDs)

import { createServerSupabaseClient } from '@/lib/supabase-server'
import { createServiceClient }        from '@/lib/supabase-service'

async function requireAuth() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authorized')
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string; groupId: string }> },
) {
  try {
    await requireAuth()
    const { id: surveyId, groupId } = await params
    const url      = new URL(req.url)
    const community = url.searchParams.get('community') ?? ''
    const perfil    = url.searchParams.get('perfil')    ?? ''
    const q         = url.searchParams.get('q')         ?? ''
    const status    = url.searchParams.get('status')    ?? '' // resolved | not_found | pending | ''
    const inGroup   = url.searchParams.get('in_group')  ?? 'true' // true = só membros, false = só não-membros
    const limit     = Math.min(Number(url.searchParams.get('limit')  ?? 200), 500)
    const offset    = Number(url.searchParams.get('offset') ?? 0)

    const supabase = createServiceClient()

    // Buscar IDs dos membros do grupo
    const { data: memberRows } = await supabase
      .from('survey_sample_group_members')
      .select('sample_id')
      .eq('group_id', groupId)

    const memberIds = new Set((memberRows ?? []).map(r => r.sample_id))

    // Query base de entradas da amostra
    let query = supabase
      .from('survey_sample_lists')
      .select('id, community_id, email, nome, perfil, layers_user_id', { count: 'exact' })
      .eq('survey_id', surveyId)
      .order('community_id, nome')
      .range(offset, offset + limit - 1)

    if (community) query = query.eq('community_id', community)
    if (perfil)    query = query.eq('perfil', perfil)
    if (q)         query = query.ilike('nome', `%${q}%`)
    if (status === 'resolved')  query = query.not('layers_user_id', 'is', null).neq('layers_user_id', 'NOT_FOUND')
    if (status === 'not_found') query = query.eq('layers_user_id', 'NOT_FOUND')
    if (status === 'pending')   query = query.is('layers_user_id', null)

    if (inGroup === 'true'  && memberIds.size > 0) query = query.in('id', [...memberIds])
    if (inGroup === 'false' && memberIds.size > 0) query = query.not('id', 'in', `(${[...memberIds].join(',')})`)

    const { data: entries, count } = await query

    return Response.json({
      entries: (entries ?? []).map(e => ({
        ...e,
        in_group: memberIds.has(e.id),
      })),
      total: count ?? 0,
      member_count: memberIds.size,
    })
  } catch (err) {
    return Response.json({ error: err instanceof Error ? err.message : 'Error' }, { status: 500 })
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string; groupId: string }> },
) {
  try {
    await requireAuth()
    const { groupId } = await params
    const { sample_ids } = await req.json() as { sample_ids?: string[] }

    if (!Array.isArray(sample_ids) || sample_ids.length === 0) {
      return Response.json({ error: 'sample_ids é obrigatório' }, { status: 400 })
    }

    const supabase = createServiceClient()
    const rows = sample_ids.map(sid => ({ group_id: groupId, sample_id: sid }))

    const { error } = await supabase
      .from('survey_sample_group_members')
      .upsert(rows, { onConflict: 'group_id,sample_id', ignoreDuplicates: true })

    if (error) return Response.json({ error: error.message }, { status: 500 })

    return Response.json({ ok: true, added: sample_ids.length })
  } catch (err) {
    return Response.json({ error: err instanceof Error ? err.message : 'Error' }, { status: 500 })
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string; groupId: string }> },
) {
  try {
    await requireAuth()
    const { groupId } = await params
    const { sample_ids } = await req.json() as { sample_ids?: string[] }

    if (!Array.isArray(sample_ids) || sample_ids.length === 0) {
      return Response.json({ error: 'sample_ids é obrigatório' }, { status: 400 })
    }

    const supabase = createServiceClient()
    await supabase
      .from('survey_sample_group_members')
      .delete()
      .eq('group_id', groupId)
      .in('sample_id', sample_ids)

    return Response.json({ ok: true, removed: sample_ids.length })
  } catch (err) {
    return Response.json({ error: err instanceof Error ? err.message : 'Error' }, { status: 500 })
  }
}
