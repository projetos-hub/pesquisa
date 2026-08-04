import { opsAuthErrorResponse, requireOpsToken } from '@/lib/ops-api-auth'
import { OPS_CAPABILITIES } from '@/lib/ops-api-operations'

export async function GET(request: Request) {
  try {
    const principal = await requireOpsToken(request, 'platform:read')
    return Response.json({ apiVersion: 'v1', actor: principal.email, capabilities: OPS_CAPABILITIES }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    return opsAuthErrorResponse(error) ?? Response.json({ error: 'Internal error' }, { status: 500 })
  }
}
