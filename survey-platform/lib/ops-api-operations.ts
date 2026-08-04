import { z } from 'zod'
import { createServiceClient } from '@/lib/supabase-service'

const RESOURCE_DEFINITIONS = {
  surveys: { primaryKey: 'id', columns: ['slug', 'title', 'description', 'survey_type', 'target_roles', 'status', 'open_date', 'close_date', 'settings', 'access_control'] },
  questions: { primaryKey: 'id', columns: ['survey_id', 'order_index', 'type', 'key', 'title', 'description', 'required', 'only_for_roles', 'conditional_on', 'settings'] },
  question_options: { primaryKey: 'id', columns: ['question_id', 'order_index', 'label', 'value', 'section_key', 'section_title'] },
  communities: { primaryKey: 'community_id', columns: ['community_id', 'nome_escola', 'marca', 'unidade', 'primary_color', 'secondary_color', 'logo', 'indicacao_link'] },
  survey_communities: { primaryKey: 'id', columns: ['survey_id', 'community_id', 'status', 'open_date', 'close_date', 'theme', 'settings', 'active', 'expected_responses'] },
  survey_sample_lists: { primaryKey: 'id', columns: ['survey_id', 'community_id', 'email', 'nome', 'layers_user_id', 'perfil'] },
  survey_sample_groups: { primaryKey: 'id', columns: ['survey_id', 'name'] },
  survey_sample_group_members: { primaryKey: 'id', columns: ['group_id', 'sample_id'] },
  survey_dispatches: { primaryKey: 'id', columns: ['survey_id', 'title', 'body', 'push_title', 'push_body', 'email_title', 'email_body', 'email_action_label', 'email_background_url', 'channels', 'target_scope', 'target_community_ids', 'target_group_alias', 'target_roles', 'personalized', 'only_unnotified', 'scheduled_at', 'status', 'is_template', 'template_name', 'sequence_steps'] },
  survey_dispatch_jobs: { primaryKey: 'id', columns: ['dispatch_id', 'community_id', 'status'] },
  comunicados: { primaryKey: 'id', columns: ['survey_id', 'community_id', 'title', 'description', 'category', 'target_scope', 'targets', 'author_name', 'attachments', 'approved', 'status'] },
  public_response_links: { primaryKey: 'id', columns: ['survey_id', 'label', 'enabled', 'include_pii', 'expires_at', 'scope'] },
  response_sessions: { primaryKey: 'id', columns: [] },
  responses: { primaryKey: 'id', columns: [] },
  notification_audit_logs: { primaryKey: 'id', columns: [] },
} as const

const RPC_DEFINITIONS = {
  duplicate_survey: { name: 'admin_duplicate_survey_template', args: ['p_survey_id'] },
  delete_survey: { name: 'admin_delete_survey_cascade', args: ['p_survey_id'] },
  replace_question_options: { name: 'admin_replace_question_options', args: ['p_question_id', 'p_labels'] },
} as const

export const OPS_CAPABILITIES = {
  resources: Object.keys(RESOURCE_DEFINITIONS),
  actions: ['resource.list', 'resource.get', 'resource.count', 'resource.create', 'resource.update', 'resource.upsert', 'resource.delete', 'rpc.call', 'dispatch.process'],
  rpcs: Object.keys(RPC_DEFINITIONS),
}

const RequestSchema = z.object({
  operation: z.enum(['resource.list', 'resource.get', 'resource.count', 'resource.create', 'resource.update', 'resource.upsert', 'resource.delete', 'rpc.call', 'dispatch.process']),
  resource: z.string().optional(),
  id: z.union([z.string(), z.number()]).optional(),
  data: z.union([z.record(z.string(), z.unknown()), z.array(z.record(z.string(), z.unknown()))]).optional(),
  filters: z.record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.null()])).optional(),
  rpc: z.string().optional(),
  args: z.record(z.string(), z.unknown()).optional(),
  limit: z.number().int().min(1).max(500).default(100),
  offset: z.number().int().min(0).default(0),
  dryRun: z.boolean().default(true),
})

export type OpsRequest = z.infer<typeof RequestSchema>

export function parseOpsRequest(value: unknown) {
  return RequestSchema.safeParse(value)
}

export function opsRisk(request: OpsRequest) {
  if (request.operation === 'dispatch.process') return 'external'
  if (request.operation === 'resource.delete' || request.rpc === 'delete_survey') return 'destructive'
  if (['resource.create', 'resource.update', 'resource.upsert', 'rpc.call'].includes(request.operation)) return 'write'
  return 'read'
}

export function opsScope(request: OpsRequest) {
  const risk = opsRisk(request)
  if (risk === 'external') return 'dispatch:send'
  if (risk === 'read') return 'platform:read'
  return 'platform:write'
}

function resourceDefinition(resource: string | undefined) {
  if (!resource || !(resource in RESOURCE_DEFINITIONS)) throw new Error('Unsupported resource')
  return RESOURCE_DEFINITIONS[resource as keyof typeof RESOURCE_DEFINITIONS]
}

function allowedPayload(resource: string, value: Record<string, unknown>) {
  const definition = resourceDefinition(resource)
  const allowed = new Set<string>(definition.columns)
  const entries = Object.entries(value).filter(([key]) => allowed.has(key))
  if (entries.length === 0) throw new Error('No allowed fields supplied')
  return Object.fromEntries(entries)
}

type FilterValue = string | number | boolean

interface FilterableQuery<TSelf> {
  eq(column: string, value: FilterValue): TSelf
  is(column: string, value: null): TSelf
}

function applyFilters<TQuery extends FilterableQuery<TQuery>>(
  query: TQuery,
  filters: OpsRequest['filters'],
  resource: string,
) {
  if (!filters) return query
  const definition = resourceDefinition(resource)
  const allowed = new Set<string>([definition.primaryKey, ...definition.columns])
  for (const [key, value] of Object.entries(filters)) {
    if (!allowed.has(key)) throw new Error(`Unsupported filter: ${key}`)
    query = value === null ? query.is(key, null) : query.eq(key, value)
  }
  return query
}

export async function executeOpsRequest(request: OpsRequest) {
  if (request.dryRun) return { dryRun: true, operation: request.operation, resource: request.resource ?? null, risk: opsRisk(request) }

  if (request.operation === 'dispatch.process') {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://pesquisa-nu-sand.vercel.app'
    const response = await fetch(`${appUrl}/api/cron/process-dispatches`, { headers: { authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}` } })
    const body = await response.json().catch(() => ({}))
    if (!response.ok) throw new Error(`Dispatch processor failed: ${response.status}`)
    return body
  }

  const service = createServiceClient()
  if (request.operation === 'rpc.call') {
    if (!request.rpc || !(request.rpc in RPC_DEFINITIONS)) throw new Error('Unsupported RPC')
    const definition = RPC_DEFINITIONS[request.rpc as keyof typeof RPC_DEFINITIONS]
    const supplied = request.args ?? {}
    const rpcArgs = Object.fromEntries(definition.args.map(key => [key, supplied[key]]))
    const { data, error } = await service.rpc(definition.name, rpcArgs)
    if (error) throw error
    return { data }
  }

  const resource = request.resource
  const definition = resourceDefinition(resource)
  const table = resource as keyof typeof RESOURCE_DEFINITIONS

  if (request.operation === 'resource.list' || request.operation === 'resource.count') {
    let query = service.from(table).select('*', { count: 'exact', head: request.operation === 'resource.count' })
    query = applyFilters(query, request.filters, table)
    if (request.operation === 'resource.list') query = query.range(request.offset, request.offset + request.limit - 1)
    const { data, count, error } = await query
    if (error) throw error
    return { data: data ?? [], count: count ?? data?.length ?? 0 }
  }

  if (request.operation === 'resource.get') {
    if (request.id == null) throw new Error('Resource id required')
    const { data, error } = await service.from(table).select('*').eq(definition.primaryKey, request.id).maybeSingle()
    if (error) throw error
    return { data }
  }

  if (request.operation === 'resource.create') {
    if (!request.data || Array.isArray(request.data)) throw new Error('Object data required')
    const { data, error } = await service.from(table).insert(allowedPayload(table, request.data)).select('*').single()
    if (error) throw error
    return { data }
  }

  if (request.operation === 'resource.update') {
    if (request.id == null || !request.data || Array.isArray(request.data)) throw new Error('Resource id and object data required')
    const { data, error } = await service.from(table).update(allowedPayload(table, request.data)).eq(definition.primaryKey, request.id).select('*').maybeSingle()
    if (error) throw error
    return { data }
  }

  if (request.operation === 'resource.upsert') {
    const rows = Array.isArray(request.data) ? request.data : request.data ? [request.data] : []
    if (rows.length === 0 || rows.length > 500) throw new Error('Provide 1 to 500 rows')
    const payload = rows.map(row => allowedPayload(table, row))
    const { data, error } = await service.from(table).upsert(payload).select('*')
    if (error) throw error
    return { data: data ?? [], count: data?.length ?? 0 }
  }

  if (request.operation === 'resource.delete') {
    if (request.id == null && !request.filters) throw new Error('Resource id or filters required')
    let query = service.from(table).delete().select(definition.primaryKey)
    query = request.id != null ? query.eq(definition.primaryKey, request.id) : applyFilters(query, request.filters, table)
    const { data, error } = await query
    if (error) throw error
    return { deleted: data?.length ?? 0 }
  }

  throw new Error('Unsupported operation')
}
