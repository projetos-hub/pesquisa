import { renderPlaceholders } from './placeholders/render'

const PORTAL_ALIAS = '@raizeducacao:pesquisa'

export type TargetScope = 'all' | 'communities' | 'group' | 'sample'
export type TargetRole  = 'guardian' | 'student' | 'admin'
export type Channel     = 'pushNotification' | 'email'

export interface DispatchRecord {
  id:                   string
  survey_id:            string
  title:                string
  body:                 string
  push_title:           string | null
  push_body:            string | null
  email_title:          string | null
  email_body:           string | null
  email_action_label:   string
  email_background_url: string | null
  channels:             Channel[]
  target_scope:         TargetScope
  target_community_ids: string[] | null
  target_group_alias:   string | null
  target_roles:         TargetRole[]
  personalized:         boolean
}

export interface LayersUserListItem {
  _id:        string
  name?:      string
  email?:     string
  roles?:     string[]
  membersId?: string[]
}

export interface PersonalizedVars {
  nome:         string
  nomeAluno:    string
  nomeEscola:   string
  marca?:       string
  unidade?:     string
  serie:        string
  programaMais?: string
  equipeMarca?:  string
}

export interface SamplePersonalizedPayloadInput {
  layersUserId: string
  vars:         PersonalizedVars
}

export interface LayersTopic {
  kind:   'user' | 'member' | 'group'
  alias?: string
  email?: string
  id?:    string
}

export interface LayersPayload {
  targets: {
    topics: LayersTopic[]
    roles:  TargetRole[]
  }
  title:        string
  body:         string
  action: {
    type:        'portal'
    portalAlias: string
    path:        string
  }
  channels?: {
    pushNotification?: { title: string; body: string }
    email?: {
      title:          string
      body:           string
      actionLabel?:   string
      backgroundUrl?: string
    }
  }
}

export interface JobResult {
  communityId: string
  success:     boolean
  response?:   unknown
  error?:      string
}

export interface DispatchResult {
  sent:   number
  failed: number
  jobs:   JobResult[]
}

export interface NotificationAuditLogInput {
  dispatchId: string
  jobId:      string
  email:      string
  nome?:      string | null
  success:    boolean
  error?:     string | null
}

export function buildNotificationAuditLog(input: NotificationAuditLogInput) {
  return {
    dispatch_id: input.dispatchId,
    job_id:      input.jobId,
    email:       input.email,
    nome:        input.nome ?? null,
    status:      input.success ? 'sent' : 'failed',
    error:       input.success ? null : input.error ?? null,
    sent_at:     input.success ? new Date().toISOString() : null,
  }
}

export function buildNotificationPayload(dispatch: DispatchRecord): LayersPayload {
  const topic: LayersTopic =
    dispatch.target_scope === 'group' && dispatch.target_group_alias
      ? { kind: 'group', alias: dispatch.target_group_alias }
      : { kind: 'group', alias: 'all' }

  const payload: LayersPayload = {
    targets: { topics: [topic], roles: dispatch.target_roles },
    title: dispatch.title,
    body: dispatch.body,
    action: { type: 'portal', portalAlias: PORTAL_ALIAS, path: '/' },
  }

  const channels: LayersPayload['channels'] = {}
  if (dispatch.channels.includes('pushNotification')) {
    channels.pushNotification = {
      title: optionalText(dispatch.push_title) ?? dispatch.title,
      body:  optionalText(dispatch.push_body)  ?? dispatch.body,
    }
  }

  if (dispatch.channels.includes('email')) {
    const emailChannel: NonNullable<LayersPayload['channels']>['email'] = {
      title: optionalText(dispatch.email_title) ?? dispatch.title,
      body:  optionalText(dispatch.email_body)  ?? dispatch.body,
    }
    if (dispatch.email_action_label) emailChannel.actionLabel = dispatch.email_action_label
    if (dispatch.email_background_url) emailChannel.backgroundUrl = dispatch.email_background_url
    channels.email = emailChannel
  }

  if (Object.keys(channels).length > 0) payload.channels = channels
  return payload
}

export function formatFirstName(fullName: string): string {
  const first = fullName.trim().split(/\s+/)[0] ?? ''
  if (!first) return ''
  return first.charAt(0).toUpperCase() + first.slice(1).toLowerCase()
}

function isStudentNameList(value: string): boolean {
  return value.includes(',') || /\s+e\s+/i.test(value.trim())
}

export interface MaisProgramIdentityInput {
  communityId?: string | null
  marca?: string | null
  nomeEscola?: string | null
}

export interface MaisProgramIdentity {
  programaMais: string
  equipeMarca: string
}

const MAIS_PROGRAM_RULES: Array<{ match: string[]; programaMais: string; equipeMarca: string }> = [
  { match: ['cubo'], programaMais: 'Cubo After School', equipeMarca: 'Cubo' },
  { match: ['sa pereira', 'sao pereira'], programaMais: 'Mais Sá Pereira', equipeMarca: 'Sá Pereira' },
  { match: ['sap'], programaMais: 'Mais SAP', equipeMarca: 'SAP' },
  { match: ['qi'], programaMais: 'Mais Qi', equipeMarca: 'Qi' },
  { match: ['matriz'], programaMais: 'Mais Matriz', equipeMarca: 'Matriz' },
  { match: ['americano'], programaMais: 'Mais Americano', equipeMarca: 'Americano' },
  { match: ['uniao'], programaMais: 'Mais União', equipeMarca: 'União' },
  { match: ['unificado'], programaMais: 'Mais Unificado', equipeMarca: 'Unificado' },
  { match: ['global tree'], programaMais: 'Mais Global Tree', equipeMarca: 'Global Tree' },
  { match: ['apogeu'], programaMais: 'Mais Apogeu', equipeMarca: 'Apogeu' },
  { match: ['leonardo da vinci', 'leonardodavinci'], programaMais: 'Mais Leonardo Da Vinci', equipeMarca: 'Leonardo Da Vinci' },
  { match: ['sarah dawsey', 'sarahdawsey'], programaMais: 'Mais Sarah Dawsey', equipeMarca: 'Sarah Dawsey' },
  { match: ['raiz educacao', 'raizeducacao'], programaMais: 'Mais Raiz', equipeMarca: 'Raiz' },
]

function normalizeText(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
}

function fallbackEquipeMarca(input: MaisProgramIdentityInput): string {
  const source = input.marca?.trim() || input.nomeEscola?.trim() || input.communityId?.trim() || 'Raiz'
  return source
    .replace(/^Colégio\s+/i, '')
    .replace(/^Colegio\s+/i, '')
    .replace(/^Escola\s+/i, '')
    .replace(/\s+Educação$/i, '')
    .replace(/\s+Educacao$/i, '')
    .trim() || 'Raiz'
}

export function resolveMaisProgramIdentity(input: MaisProgramIdentityInput): MaisProgramIdentity {
  const haystack = normalizeText([
    input.communityId ?? '',
    input.marca ?? '',
    input.nomeEscola ?? '',
  ].join(' '))

  const rule = MAIS_PROGRAM_RULES.find(item => item.match.some(token => haystack.includes(token)))
  if (rule) return { programaMais: rule.programaMais, equipeMarca: rule.equipeMarca }

  const equipeMarca = fallbackEquipeMarca(input)
  return { programaMais: `Mais ${equipeMarca}`, equipeMarca }
}

function notificationVars(vars: PersonalizedVars): Record<string, string | undefined> {
  const identity = resolveMaisProgramIdentity({
    marca: vars.marca,
    nomeEscola: vars.nomeEscola,
  })

  return {
    nome: vars.nome || 'você',
    nomeAluno: vars.nomeAluno || 'seu filho(a)',
    nomeEscola: vars.nomeEscola || 'a escola',
    marca: vars.marca || vars.nomeEscola || 'a escola',
    unidade: vars.unidade || vars.nomeEscola || 'a escola',
    serie: vars.serie || 'a turma',
    programaMais: vars.programaMais || identity.programaMais,
    equipeMarca: vars.equipeMarca || identity.equipeMarca,
  }
}

export function interpolatePlaceholders(text: string, vars: PersonalizedVars): string {
  const nomeAluno = vars.nomeAluno || 'seu filho(a)'
  const studentText = isStudentNameList(nomeAluno)
    ? text
        .replace(/\bdo\s+\{\{nomeAluno\}\}/gi, 'de {{nomeAluno}}')
        .replace(/\bda\s+\{\{nomeAluno\}\}/gi, 'de {{nomeAluno}}')
    : text

  return renderPlaceholders(studentText, notificationVars(vars))
}

function optionalText(value: string | null | undefined): string | null {
  const trimmed = value?.trim()
  return trimmed ? value! : null
}

export type CommunityNotificationIdentity = string | (MaisProgramIdentityInput & {
  unidade?: string | null
  programaMais?: string | null
  equipeMarca?: string | null
})

function communityNotificationVars(identity: CommunityNotificationIdentity) {
  if (typeof identity === 'string') {
    const maisIdentity = resolveMaisProgramIdentity({ nomeEscola: identity })
    return {
      nomeEscola: identity,
      marca: '',
      unidade: '',
      programaMais: maisIdentity.programaMais,
      equipeMarca: maisIdentity.equipeMarca,
    }
  }

  const maisIdentity = resolveMaisProgramIdentity(identity)
  return {
    nomeEscola: identity.nomeEscola ?? '',
    marca: identity.marca ?? '',
    unidade: identity.unidade ?? '',
    programaMais: identity.programaMais ?? maisIdentity.programaMais,
    equipeMarca: identity.equipeMarca ?? maisIdentity.equipeMarca,
  }
}

export function buildPersonalizedPayload(
  dispatch:  DispatchRecord,
  user:      LayersUserListItem,
  community: CommunityNotificationIdentity,
): LayersPayload {
  return buildUserPayload(dispatch, { kind: 'user', id: user._id }, {
    nome: formatFirstName(user.name ?? ''),
    nomeAluno: '',
    ...communityNotificationVars(community),
    serie: '',
  })
}
export function buildSamplePersonalizedPayload(
  dispatch: DispatchRecord,
  input:    SamplePersonalizedPayloadInput,
): LayersPayload {
  return buildUserPayload(dispatch, { kind: 'user', id: input.layersUserId }, input.vars)
}

function buildUserPayload(
  dispatch: DispatchRecord,
  topic:    LayersTopic,
  vars:     PersonalizedVars,
): LayersPayload {
  const title = interpolatePlaceholders(optionalText(dispatch.push_title) ?? dispatch.title, vars)
  const body  = interpolatePlaceholders(optionalText(dispatch.push_body)  ?? dispatch.body,  vars)

  const payload: LayersPayload = {
    targets: { topics: [topic], roles: dispatch.target_roles },
    title,
    body,
    action: { type: 'portal', portalAlias: PORTAL_ALIAS, path: '/' },
  }

  const channels: LayersPayload['channels'] = {}
  if (dispatch.channels.includes('pushNotification')) {
    channels.pushNotification = { title, body }
  }

  if (dispatch.channels.includes('email')) {
    channels.email = {
      title: interpolatePlaceholders(optionalText(dispatch.email_title) ?? dispatch.title, vars),
      body:  interpolatePlaceholders(optionalText(dispatch.email_body)  ?? dispatch.body,  vars),
      actionLabel: dispatch.email_action_label || 'Responder Pesquisa',
      ...(dispatch.email_background_url ? { backgroundUrl: dispatch.email_background_url } : {}),
    }
  }

  if (Object.keys(channels).length > 0) payload.channels = channels
  return payload
}
