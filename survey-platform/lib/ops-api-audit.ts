import { createServiceClient } from '@/lib/supabase-service'
import type { OpsApiPrincipal } from '@/lib/ops-api-auth'

const SENSITIVE_KEY = /(password|secret|token|authorization|access.?key|service.?role)/i
const PII_KEY = /(email|name|nome|student|aluno|guardian|responsavel|user.?id)/i

export function sanitizeOpsSummary(value: unknown, depth = 0): unknown {
  if (depth > 4) return '[max-depth]'
  if (Array.isArray(value)) {
    return { type: 'array', count: value.length }
  }
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value as Record<string, unknown>).map(([key, item]) => {
      if (SENSITIVE_KEY.test(key)) return [key, '[redacted]']
      if (PII_KEY.test(key)) return [key, item == null ? null : '[masked]']
      return [key, sanitizeOpsSummary(item, depth + 1)]
    }))
  }
  if (typeof value === 'string') return value.length > 300 ? `${value.slice(0, 300)}...` : value
  return value
}

export async function findIdempotentSuccess(principal: OpsApiPrincipal, idempotencyKey: string) {
  const service = createServiceClient()
  const { data } = await service
    .from('ops_api_audit_logs')
    .select('response_summary, status_code')
    .eq('token_id', principal.tokenId)
    .eq('idempotency_key', idempotencyKey)
    .eq('success', true)
    .maybeSingle()
  return data
}

export async function writeOpsAudit(input: {
  principal: OpsApiPrincipal
  request: Request
  operation: string
  risk: string
  target?: string | null
  statusCode: number
  success: boolean
  startedAt: number
  idempotencyKey?: string | null
  requestSummary?: unknown
  responseSummary?: unknown
  error?: string | null
}) {
  const service = createServiceClient()
  const { error } = await service.from('ops_api_audit_logs').insert({
    token_id: input.principal.tokenId,
    actor_email: input.principal.email,
    request_id: input.principal.requestId,
    operation: input.operation,
    risk: input.risk,
    method: input.request.method,
    path: new URL(input.request.url).pathname,
    target: input.target ?? null,
    status_code: input.statusCode,
    success: input.success,
    duration_ms: Date.now() - input.startedAt,
    idempotency_key: input.idempotencyKey ?? null,
    request_summary: sanitizeOpsSummary(input.requestSummary) ?? {},
    response_summary: sanitizeOpsSummary(input.responseSummary) ?? {},
    error: input.error ?? null,
  })
  if (error) console.error('[ops-api] audit insert failed', error.message)
}
