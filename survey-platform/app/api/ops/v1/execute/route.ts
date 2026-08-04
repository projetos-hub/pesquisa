import { findIdempotentSuccess, sanitizeOpsSummary, writeOpsAudit } from '@/lib/ops-api-audit'
import { opsAuthErrorResponse, requireOpsToken } from '@/lib/ops-api-auth'
import { executeOpsRequest, opsRisk, opsScope, parseOpsRequest } from '@/lib/ops-api-operations'

export async function POST(request: Request) {
  const startedAt = Date.now()
  let principal: Awaited<ReturnType<typeof requireOpsToken>> | null = null
  let operation = 'unknown'
  let risk = 'read'
  let body: unknown = null
  try {
    body = await request.json()
    const parsed = parseOpsRequest(body)
    if (!parsed.success) return Response.json({ error: 'Invalid operation request', details: parsed.error.flatten() }, { status: 400 })

    operation = parsed.data.operation
    risk = opsRisk(parsed.data)
    principal = await requireOpsToken(request, opsScope(parsed.data))
    const idempotencyKey = request.headers.get('idempotency-key')?.trim() || null
    const isWrite = risk !== 'read' && !parsed.data.dryRun

    if (isWrite && !idempotencyKey) {
      return Response.json({ error: 'Idempotency-Key header required for writes' }, { status: 428 })
    }

    if (isWrite && (risk === 'destructive' || risk === 'external')) {
      const target = parsed.data.resource ?? parsed.data.rpc ?? 'dispatch'
      const expected = `${operation}:${target}`
      if (request.headers.get('x-confirm-operation') !== expected) {
        return Response.json({ error: 'Explicit operation confirmation required', expectedConfirmation: expected }, { status: 428 })
      }
    }

    if (isWrite && idempotencyKey) {
      const previous = await findIdempotentSuccess(principal, idempotencyKey)
      if (previous) return Response.json({ ok: true, idempotentReplay: true, result: previous.response_summary })
    }

    const result = await executeOpsRequest(parsed.data)
    const response = { ok: true, requestId: principal.requestId, result }
    await writeOpsAudit({
      principal, request, operation, risk,
      target: parsed.data.resource ?? parsed.data.rpc ?? null,
      statusCode: 200, success: true, startedAt, idempotencyKey,
      requestSummary: body, responseSummary: response,
    })
    return Response.json(response, { headers: { 'Cache-Control': 'no-store', 'X-Request-Id': principal.requestId } })
  } catch (error) {
    const authResponse = opsAuthErrorResponse(error)
    if (authResponse) return authResponse
    const message = error instanceof Error ? error.message : 'Internal error'
    if (principal) {
      await writeOpsAudit({
        principal, request, operation, risk, statusCode: 500, success: false,
        startedAt, requestSummary: body, responseSummary: {}, error: message,
        idempotencyKey: request.headers.get('idempotency-key'),
      })
    }
    console.error('[ops-api] execution failed', sanitizeOpsSummary({ operation, message }))
    return Response.json({ error: message }, { status: 500 })
  }
}
