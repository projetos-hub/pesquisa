type LogLevel = 'info' | 'warn' | 'error'

type LogValue =
  | string
  | number
  | boolean
  | null
  | undefined
  | LogValue[]
  | { [key: string]: LogValue }

export interface LogContext {
  route: string
  correlationId: string
  surveyId?: string
  dispatchId?: string
  jobId?: string
}

const PII_KEYS = new Set([
  'email',
  'nome',
  'name',
  'nomeCompleto',
  'nomeAluno',
  'nome_responsavel',
  'nome_aluno',
  'userId',
  'accountId',
  'layers_user_id',
])

function createCorrelationId() {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `cid-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

export function getCorrelationId(request: Request): string {
  return (
    request.headers.get('x-correlation-id') ||
    request.headers.get('x-request-id') ||
    createCorrelationId()
  )
}

function sanitize(value: LogValue, key?: string): LogValue {
  if (key && PII_KEYS.has(key)) return '[redacted]'
  if (Array.isArray(value)) return value.map(item => sanitize(item))
  if (typeof value === 'object' && value !== null) {
    return Object.fromEntries(
      Object.entries(value).map(([entryKey, entryValue]) => [
        entryKey,
        sanitize(entryValue as LogValue, entryKey),
      ])
    )
  }
  return value
}

function emit(level: LogLevel, event: string, context: LogContext, fields: Record<string, LogValue> = {}) {
  const safeFields = sanitize(fields) as Record<string, LogValue>
  const payload = {
    level,
    event,
    route: context.route,
    correlationId: context.correlationId,
    ...(context.surveyId ? { surveyId: context.surveyId } : {}),
    ...(context.dispatchId ? { dispatchId: context.dispatchId } : {}),
    ...(context.jobId ? { jobId: context.jobId } : {}),
    ...safeFields,
    timestamp: new Date().toISOString(),
  }

  const line = JSON.stringify(payload)
  if (level === 'error') console.error(line)
  else if (level === 'warn') console.warn(line)
  else console.log(line)
}

export function logInfo(event: string, context: LogContext, fields?: Record<string, LogValue>) {
  emit('info', event, context, fields)
}

export function logWarn(event: string, context: LogContext, fields?: Record<string, LogValue>) {
  emit('warn', event, context, fields)
}

export function logError(event: string, context: LogContext, error: unknown, fields: Record<string, LogValue> = {}) {
  emit('error', event, context, {
    ...fields,
    error: error instanceof Error ? error.message : String(error),
  })
}

export function jsonWithCorrelation(
  body: unknown,
  init: ResponseInit | undefined,
  correlationId: string,
) {
  const headers = new Headers(init?.headers)
  headers.set('x-correlation-id', correlationId)
  return Response.json(body, { ...init, headers })
}
