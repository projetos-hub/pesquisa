// GET  /api/admin/surveys/[id]/sample/groups — listar grupos com contagem de membros
// POST /api/admin/surveys/[id]/sample/groups — criar grupo
// DELETE /api/admin/surveys/[id]/sample/groups?id=xxx — deletar grupo

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

    const { data: groups } = await supabase
      .from('survey_sample_groups')
      .select('id, name, color, created_at')
      .eq('survey_id', id)
      .order('created_at', { ascending: true })

    if (!groups || groups.length === 0) {
      return Response.json({ groups: [] })
    }

    // Contar membros por grupo
    const { data: counts } = await supabase
      .from('survey_sample_group_members')
      .select('group_id')
      .in('group_id', groups.map(g => g.id))

    const countMap = new Map<string, number>()
    for (const c of counts ?? []) {
      countMap.set(c.group_id, (countMap.get(c.group_id) ?? 0) + 1)
    }

    return Response.json({
      groups: groups.map(g => ({ ...g, member_count: countMap.get(g.id) ?? 0 })),
    })
  } catch (err) {
    return Response.json({ error: err instanceof Error ? err.message : 'Error' }, { status: 500 })
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireAuth()
    const { id } = await params
    const { name, color = '#6366f1' } = await req.json() as { name?: string; color?: string }

    if (!name?.trim()) {
      return Response.json({ error: 'name é obrigatório' }, { status: 400 })
    }

    const supabase = createServiceClient()
    const { data, error } = await supabase
      .from('survey_sample_groups')
      .insert({ survey_id: id, name: name.trim(), color })
      .select('id, name, color, created_at')
      .single()

    if (error) {
      if (error.code === '23505') {
        return Response.json({ error: 'Já existe um grupo com este nome' }, { status: 409 })
      }
      return Response.json({ error: error.message }, { status: 500 })
    }

    return Response.json({ group: { ...data, member_count: 0 } }, { status: 201 })
  } catch (err) {
    return Response.json({ error: err instanceof Error ? err.message : 'Error' }, { status: 500 })
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireAuth()
    await params
    const url    = new URL(req.url)
    const groupId = url.searchParams.get('id')

    if (!groupId) return Response.json({ error: 'id é obrigatório' }, { status: 400 })

    const supabase = createServiceClient()
    await supabase.from('survey_sample_groups').delete().eq('id', groupId)

    return Response.json({ ok: true })
  } catch (err) {
    return Response.json({ error: err instanceof Error ? err.message : 'Error' }, { status: 500 })
  }
}
