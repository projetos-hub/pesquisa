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
  nome:       string
  nomeAluno:  string
  nomeEscola: string
  serie:      string
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

export function interpolatePlaceholders(text: string, vars: PersonalizedVars): string {
  return text
    .replace(/\{\{nome\}\}/g,       vars.nome       || 'você')
    .replace(/\{\{nomeAluno\}\}/g,  vars.nomeAluno  || 'seu filho(a)')
    .replace(/\{\{nomeEscola\}\}/g, vars.nomeEscola || 'a escola')
    .replace(/\{\{serie\}\}/g,      vars.serie      || 'a turma')
}

function optionalText(value: string | null | undefined): string | null {
  const trimmed = value?.trim()
  return trimmed ? value! : null
}

export function buildPersonalizedPayload(
  dispatch:   DispatchRecord,
  user:       LayersUserListItem,
  nomeEscola: string,
): LayersPayload {
  return buildUserPayload(dispatch, { kind: 'user', id: user._id }, {
    nome: formatFirstName(user.name ?? ''),
    nomeAluno: '',
    nomeEscola,
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
