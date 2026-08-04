import { z } from 'zod'
import { createPersonalOpsToken, opsAuthErrorResponse, requireInternalSupabaseUser } from '@/lib/ops-api-auth'
import { createServiceClient } from '@/lib/supabase-service'

const CreateTokenSchema = z.object({
  name: z.string().trim().min(1).max(100).default('Codex Skill'),
  expiresInDays: z.number().int().min(1).max(365).default(180),
})

export async function POST(request: Request) {
  try {
    const { user, email } = await requireInternalSupabaseUser(request)
    const parsed = CreateTokenSchema.safeParse(await request.json().catch(() => ({})))
    if (!parsed.success) return Response.json({ error: 'Invalid request', details: parsed.error.flatten() }, { status: 400 })
    const expiresAt = new Date(Date.now() + parsed.data.expiresInDays * 86_400_000).toISOString()
    const created = await createPersonalOpsToken({ user, email, name: parsed.data.name, expiresAt })
    return Response.json({
      ok: true,
      token: created.token,
      tokenRecord: created.record,
      warning: 'This token is shown once. Store it only in the local skill configuration.',
    }, { status: 201, headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    return opsAuthErrorResponse(error) ?? Response.json({ error: error instanceof Error ? error.message : 'Internal error' }, { status: 500 })
  }
}

export async function GET(request: Request) {
  try {
    const { user } = await requireInternalSupabaseUser(request)
    const service = createServiceClient()
    const { data, error } = await service.from('ops_api_tokens')
      .select('id, name, token_prefix, scopes, enabled, expires_at, last_used_at, created_at, revoked_at')
      .eq('user_id', user.id).order('created_at', { ascending: false })
    if (error) throw error
    return Response.json({ tokens: data ?? [] }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    return opsAuthErrorResponse(error) ?? Response.json({ error: error instanceof Error ? error.message : 'Internal error' }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const { user } = await requireInternalSupabaseUser(request)
    const tokenId = new URL(request.url).searchParams.get('id')
    if (!tokenId) return Response.json({ error: 'Token id required' }, { status: 400 })
    const service = createServiceClient()
    const { data, error } = await service.from('ops_api_tokens')
      .update({ enabled: false, revoked_at: new Date().toISOString() })
      .eq('id', tokenId).eq('user_id', user.id).select('id').maybeSingle()
    if (error) throw error
    if (!data) return Response.json({ error: 'Token not found' }, { status: 404 })
    return Response.json({ ok: true, revokedTokenId: data.id })
  } catch (error) {
    return opsAuthErrorResponse(error) ?? Response.json({ error: error instanceof Error ? error.message : 'Internal error' }, { status: 500 })
  }
}
