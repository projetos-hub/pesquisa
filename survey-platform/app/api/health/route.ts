import { createServiceClient } from '@/lib/supabase-service'
import { getCorrelationId, jsonWithCorrelation, logInfo, logWarn } from '@/lib/observability'

interface HealthCheck {
  ok: boolean
  status: 'ok' | 'warn' | 'error'
  detail?: string
  count?: number
}

const REQUIRED_ENV = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'CRON_SECRET',
  'LAYERS_API_TOKEN',
]

const OPTIONAL_ENV = [
  'SHEETS_WEBHOOK_URL',
  'SHEETS_WEBHOOK_SECRET',
]

function checkEnvironment(): HealthCheck {
  const missingRequired = REQUIRED_ENV.filter(key => !process.env[key])
  const missingOptional = OPTIONAL_ENV.filter(key => !process.env[key])

  if (missingRequired.length > 0) {
    return {
      ok: false,
      status: 'error',
      detail: `Missing required env vars: ${missingRequired.join(', ')}`,
    }
  }

  if (missingOptional.length > 0) {
    return {
      ok: true,
      status: 'warn',
      detail: `Missing optional env vars: ${missingOptional.join(', ')}`,
    }
  }

  return { ok: true, status: 'ok' }
}

export async function GET(request: Request) {
  const correlationId = getCorrelationId(request)
  const logContext = { route: 'GET /api/health', correlationId }
  const json = (body: unknown, init?: ResponseInit) => jsonWithCorrelation(body, init, correlationId)

  const checks: Record<string, HealthCheck> = {
    environment: checkEnvironment(),
  }

  if (checks.environment.ok) {
    const supabase = createServiceClient()

    const { error: supabaseError } = await supabase
      .from('surveys')
      .select('id', { count: 'exact', head: true })
      .limit(1)

    checks.supabase = supabaseError
      ? { ok: false, status: 'error', detail: supabaseError.message }
      : { ok: true, status: 'ok' }

    const { count: pendingDispatches, error: dispatchError } = await supabase
      .from('survey_dispatches')
      .select('id', { count: 'exact', head: true })
      .in('status', ['scheduled', 'sending'])

    checks.dispatch_queue = dispatchError
      ? { ok: false, status: 'error', detail: dispatchError.message }
      : { ok: true, status: 'ok', count: pendingDispatches ?? 0 }

    const { count: unsyncedSheets, error: sheetsError } = await supabase
      .from('response_sessions')
      .select('id', { count: 'exact', head: true })
      .eq('synced_to_sheets', false)

    checks.sheets_queue = sheetsError
      ? { ok: false, status: 'error', detail: sheetsError.message }
      : { ok: true, status: 'ok', count: unsyncedSheets ?? 0 }
  } else {
    checks.supabase = { ok: false, status: 'error', detail: 'Skipped because required env vars are missing' }
    checks.dispatch_queue = { ok: false, status: 'error', detail: 'Skipped because required env vars are missing' }
    checks.sheets_queue = { ok: false, status: 'error', detail: 'Skipped because required env vars are missing' }
  }

  const ok = Object.values(checks).every(check => check.ok)
  const status = ok ? 200 : 503
  const payload = {
    ok,
    status: ok ? 'ok' : 'error',
    timestamp: new Date().toISOString(),
    checks,
  }

  if (ok) logInfo('health.ok', logContext)
  else logWarn('health.unhealthy', logContext, { failedChecks: Object.keys(checks).filter(key => !checks[key].ok).length })

  return json(payload, { status })
}
