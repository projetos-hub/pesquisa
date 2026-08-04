import { createHash, randomBytes, randomUUID } from 'node:crypto'
import type { User } from '@supabase/supabase-js'
import { createServiceClient } from '@/lib/supabase-service'

const OPS_TOKEN_PREFIX = 'pml_live_'
const DEFAULT_ALLOWED_DOMAINS = ['raizeducacao.com.br']

export class OpsApiAuthError extends Error {
  constructor(message: string, readonly status: number) {
    super(message)
    this.name = 'OpsApiAuthError'
  }
}

export interface OpsApiPrincipal {
  tokenId: string
  userId: string
  email: string
  scopes: string[]
  requestId: string
}

interface TokenRow {
  id: string
  user_id: string
  owner_email: string
  scopes: string[] | null
  enabled: boolean
  expires_at: string | null
}

function bearerToken(request: Request) {
  const authorization = request.headers.get('authorization') ?? ''
  return authorization.startsWith('Bearer ') ? authorization.slice(7).trim() : ''
}

export function hashOpsApiToken(token: string) {
  return createHash('sha256').update(token, 'utf8').digest('hex')
}

function allowedDomains() {
  const configured = process.env.OPS_ALLOWED_EMAIL_DOMAINS
    ?.split(',')
    .map(domain => domain.trim().toLowerCase())
    .filter(Boolean)
  return configured?.length ? configured : DEFAULT_ALLOWED_DOMAINS
}

function assertAllowedInternalUser(user: User) {
  const email = user.email?.trim().toLowerCase()
  if (!email || !user.email_confirmed_at) {
    throw new OpsApiAuthError('Verified internal email required', 403)
  }
  const domain = email.split('@').at(-1)
  if (!domain || !allowedDomains().includes(domain)) {
    throw new OpsApiAuthError('Internal email domain required', 403)
  }
  return email
}

export async function requireInternalSupabaseUser(request: Request) {
  const jwt = bearerToken(request)
  if (!jwt || jwt.startsWith(OPS_TOKEN_PREFIX)) {
    throw new OpsApiAuthError('Supabase access token required', 401)
  }
  const service = createServiceClient()
  const { data: { user }, error } = await service.auth.getUser(jwt)
  if (error || !user) throw new OpsApiAuthError('Invalid Supabase access token', 401)
  const email = assertAllowedInternalUser(user)
  return { user, email }
}

export async function createPersonalOpsToken(input: {
  user: User
  email: string
  name: string
  expiresAt: string | null
}) {
  const token = `${OPS_TOKEN_PREFIX}${randomBytes(32).toString('base64url')}`
  const tokenHash = hashOpsApiToken(token)
  const tokenPrefix = token.slice(0, OPS_TOKEN_PREFIX.length + 10)
  const service = createServiceClient()
  const { data, error } = await service
    .from('ops_api_tokens')
    .insert({
      user_id: input.user.id,
      owner_email: input.email,
      name: input.name,
      token_prefix: tokenPrefix,
      token_hash: tokenHash,
      scopes: ['*'],
      expires_at: input.expiresAt,
    })
    .select('id, name, token_prefix, scopes, expires_at, created_at')
    .single()
  if (error || !data) throw new Error(error?.message ?? 'Token creation failed')
  return { token, record: data }
}

export async function requireOpsToken(request: Request, requiredScope: string): Promise<OpsApiPrincipal> {
  const token = bearerToken(request)
  if (!token.startsWith(OPS_TOKEN_PREFIX) || token.length < 40) {
    throw new OpsApiAuthError('Valid operations token required', 401)
  }
  const service = createServiceClient()
  const { data, error } = await service
    .from('ops_api_tokens')
    .select('id, user_id, owner_email, scopes, enabled, expires_at')
    .eq('token_hash', hashOpsApiToken(token))
    .maybeSingle()
  const row = data as TokenRow | null
  if (error || !row || !row.enabled || row.expires_at && new Date(row.expires_at) <= new Date()) {
    throw new OpsApiAuthError('Expired or revoked operations token', 401)
  }
  const scopes = row.scopes ?? []
  if (!scopes.includes('*') && !scopes.includes(requiredScope)) {
    throw new OpsApiAuthError(`Missing scope: ${requiredScope}`, 403)
  }
  await service.from('ops_api_tokens').update({ last_used_at: new Date().toISOString() }).eq('id', row.id)
  return {
    tokenId: row.id,
    userId: row.user_id,
    email: row.owner_email,
    scopes,
    requestId: request.headers.get('x-request-id')?.trim() || randomUUID(),
  }
}

export function opsAuthErrorResponse(error: unknown) {
  if (!(error instanceof OpsApiAuthError)) return null
  return Response.json({ error: error.message }, { status: error.status })
}
