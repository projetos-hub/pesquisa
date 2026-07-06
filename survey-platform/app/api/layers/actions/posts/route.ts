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

function shouldReturnMinimalPost(targets: unknown): boolean {
  return Boolean(
    targets &&
    typeof targets === 'object' &&
    !Array.isArray(targets) &&
    (targets as { __responseMode?: unknown }).__responseMode === 'minimal'
  )
}

function stripResponseMode(targets: unknown): unknown {
  if (!targets || typeof targets !== 'object' || Array.isArray(targets)) return targets

  const sanitized = { ...(targets as Record<string, unknown>) }
  delete sanitized.__responseMode
  return sanitized
}
async function auditProviderCall(input: {
  community: string
  after: string
  limit: number
  sourceShape: string
  action: string
  version: string
  userAgent: string
  clientHint: string
  returnedCount: number
}) {
  const supabase = createServiceClient()
  const { error } = await supabase
    .from('layers_posts_provider_calls')
    .insert({
      community_id:   input.community,
      after_value:    input.after,
      limit_value:    input.limit,
      source_shape:   input.sourceShape,
      action:         input.action,
      version:        input.version,
      user_agent:     input.userAgent.slice(0, 500),
      client_hint:    input.clientHint,
      returned_count: input.returnedCount,
    })

  if (error) {
    console.warn('[layers/posts] audit insert failed:', error.message)
  }
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
    const action = body?.context?.action ?? 'unknown'
    const version = String(body?.context?.version ?? 'unknown')

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

    const result = (data ?? []).map((c) => {
      const minimal = shouldReturnMinimalPost(c.targets)
      const post: Record<string, unknown> = {
        id:          c.id,
        title:       c.title,
        description: c.description,
        createdAt:   c.created_at,
        updatedAt:   c.updated_at,
        targets:     stripResponseMode(c.targets),
      }

      if (!minimal) {
        post.category = c.category ?? 'Geral'
        post.attachments = c.attachments ?? []
        post.author = { name: c.author_name ?? 'Raiz Educacao' }
        post.approved = c.approved
      }

      return post
    })

    await auditProviderCall({
      community,
      after,
      limit,
      sourceShape,
      action,
      version,
      userAgent,
      clientHint,
      returnedCount: result.length,
    })

    console.log(
      `[layers/posts] community=${community} after=${after} limit=${limit} shape=${sourceShape} ` +
      `action=${action} version=${version} ` +
      `ua=${userAgent} ip=${clientHint} returned=${result.length}`
    )

    return NextResponse.json({ result })
  } catch (err) {
    console.error('[layers/posts] erro inesperado:', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

