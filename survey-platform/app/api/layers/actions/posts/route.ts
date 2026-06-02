import { createServiceClient } from '@/lib/supabase-service'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const body = await request.json()

    // Validar secret (loga warning se ausente mas não bloqueia no teste inicial)
    const secret = process.env.LAYERS_POSTS_SECRET
    if (secret && body.secret !== secret) {
      console.warn('[layers/posts] secret inválido')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const community: string = body?.context?.community
    const after: string = body?.data?.after ?? '2000-01-01T00:00:00Z'
    const limit: number = body?.data?.limit ?? 20

    if (!community) {
      return NextResponse.json({ error: 'community obrigatório' }, { status: 400 })
    }

    const supabase = createServiceClient()
    const { data, error } = await supabase
      .from('comunicados')
      .select('*')
      .eq('community_id', community)
      .eq('status', 'published')
      .eq('approved', true)
      .gte('updated_at', after)
      .order('updated_at', { ascending: false })
      .limit(limit)

    if (error) {
      console.error('[layers/posts] erro Supabase:', error)
      return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
    }

    const result = (data ?? []).map((c) => ({
      id:          c.id,
      title:       c.title,
      description: c.description,
      createdAt:   c.created_at,
      updatedAt:   c.updated_at,
      category:    c.category ?? 'Avisos',
      attachments: c.attachments ?? [],
      targets:     c.targets,
      author:      { name: c.author_name ?? 'Raiz Educação' },
      approved:    c.approved,
    }))

    console.log(`[layers/posts] community=${community} after=${after} retornando ${result.length} comunicados`)
    return NextResponse.json({ result })

  } catch (err) {
    console.error('[layers/posts] erro inesperado:', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
