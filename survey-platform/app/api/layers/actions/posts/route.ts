import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase-service'

function getClientHint(request: Request): string {
  const forwardedFor = request.headers.get('x-forwarded-for') ?? ''
  const firstIp = forwardedFor.split(',')[0]?.trim()
  if (!firstIp) return 'unknown'

  const parts = firstIp.split('.')
  if (parts.length === 4) return `${parts[0]}.${parts[1]}.x.x`

  return firstIp.slice(0, 16)
}

export async function POST(request: Request) {
  try {
    const body = await request.json()

    const community: string = body?.context?.community
    const after: string = body?.after ?? body?.data?.after ?? '2000-01-01T00:00:00Z'
    const limit = Math.min(Number(body?.limit ?? body?.data?.limit ?? 20) || 20, 100)
    const sourceShape = body?.after ? 'top-level' : body?.data?.after ? 'data' : 'default'
    const userAgent = request.headers.get('user-agent') ?? 'unknown'
    const clientHint = getClientHint(request)

    if (!community) {
      console.warn(`[layers/posts] missing community ua=${userAgent} ip=${clientHint}`)
      return NextResponse.json({ error: 'community obrigatorio' }, { status: 400 })
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
      category:    c.category ?? 'Geral',
      attachments: c.attachments ?? [],
      targets:     c.targets,
      author:      { name: c.author_name ?? 'Raiz Educacao' },
      approved:    c.approved,
    }))

    console.log(
      `[layers/posts] community=${community} after=${after} limit=${limit} shape=${sourceShape} ` +
      `action=${body?.context?.action ?? 'unknown'} version=${body?.context?.version ?? 'unknown'} ` +
      `ua=${userAgent} ip=${clientHint} returned=${result.length}`
    )

    return NextResponse.json({ result })
  } catch (err) {
    console.error('[layers/posts] erro inesperado:', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
