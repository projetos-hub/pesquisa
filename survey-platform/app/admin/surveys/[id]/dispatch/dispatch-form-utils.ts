export interface Community { id: string; nome: string; marca?: string | null; unidade?: string | null }

export interface SequenceStep {
  key:            string
  offsetDays:     number
  label:          string
  overrideTitle:  string
  overrideBody:   string
  customPerCh:    boolean
  pushTitle:      string
  pushBody:       string
  emailTitle:     string
  emailBody:      string
  emailLabel:     string
}

export interface DispatchTemplate {
  id:                   string
  template_name:        string
  title:                string
  body:                 string
  channels:             string[]
  target_scope:         string
  target_roles:         string[]
  push_title:           string | null
  push_body:            string | null
  email_title:          string | null
  email_body:           string | null
  email_action_label:   string | null
  email_background_url: string | null
  sequence_steps:       SequenceStep[] | null
}

export interface DispatchFormProps {
  surveyId:    string
  surveySlug:  string
  communities: Community[]
  templates:   DispatchTemplate[]
  openDate:    string | null
  sampleCount: number
}

export interface SampleCommunity {
  community_id: string
  nome:         string
  marca?:       string | null
  unidade?:     string | null
  total:        number
  resolved:     number
}

export interface SampleGroupOption {
  id:           string
  name:         string
  color:        string
  member_count: number
}

export type DispatchScope = 'all' | 'communities' | 'group' | 'sample'

export interface DispatchPreview {
  community_count:           number
  personalized_estimate_min: number
}

export interface DispatchResultState {
  ok?:     boolean
  sent?:   number
  failed?: number
  error?:  string
}

export interface BuildBasePayloadInput {
  title:               string
  body:                string
  channels:            string[]
  scope:               DispatchScope
  selectedComms:       string[]
  selectedSampleComms: string[]
  groupComm:           string
  groupAlias:          string
  selectedSampleGroup: string
  roles:               string[]
  personalized:        boolean
  customPerCh:         boolean
  pushTitle:           string
  pushBody:            string
  emailTitle:          string
  emailBody:           string
  emailLabel:          string
  emailBgUrl:          string
  saveTemplate:        boolean
  templateName:        string
}

export type DispatchBasePayload = ReturnType<typeof buildDispatchBasePayload>

export const PLACEHOLDERS = ['{{nome}}', '{{nomeAluno}}', '{{nomeEscola}}', '{{marca}}', '{{unidade}}', '{{serie}}']

export const KNOWN_COMMUNITIES = [
  'americano','fwnash24','apogeu-santoantonio-i','apogeu-santoantonio-ii',
  'leonardodavinci-alfa','leonardodavinci-beta','leonardodavinci-gama',
  'globaltree-abm','matriz-bangu','matriz-campogrande','matriz-caxias',
  'matriz-madureira','matriz-novaiguacu','matriz-rochamiranda',
  'matriz-saojoaodemeriti','matriz-taquara','matriz-tijuca',
  'qi-freguesia','qi-metropolitano','qi-recreio','qi-rio2','qi-tijuca',
  'sarahdawsey-juizdefora','uniao','unificado-zonasul','raizeducacao',
]

export function genKey() {
  return Math.random().toString(36).slice(2, 9)
}

export function createDefaultSequenceSteps(): SequenceStep[] {
  return [
    { key: genKey(), offsetDays: 0,  label: 'Convite inicial', overrideTitle: '', overrideBody: '', customPerCh: false, pushTitle: '', pushBody: '', emailTitle: '', emailBody: '', emailLabel: '' },
    { key: genKey(), offsetDays: 7,  label: 'Lembrete',        overrideTitle: '', overrideBody: '', customPerCh: false, pushTitle: '', pushBody: '', emailTitle: '', emailBody: '', emailLabel: '' },
    { key: genKey(), offsetDays: 14, label: 'Aviso final',     overrideTitle: '', overrideBody: '', customPerCh: false, pushTitle: '', pushBody: '', emailTitle: '', emailBody: '', emailLabel: '' },
  ]
}

export function createNextSequenceStep(steps: SequenceStep[]): SequenceStep {
  return {
    key: genKey(), offsetDays: (steps.at(-1)?.offsetDays ?? 0) + 7, label: 'Novo passo',
    overrideTitle: '', overrideBody: '', customPerCh: false,
    pushTitle: '', pushBody: '', emailTitle: '', emailBody: '', emailLabel: '',
  }
}

export function buildDispatchBasePayload(input: BuildBasePayloadInput) {
  return {
    title: input.title,
    body: input.body,
    channels: input.channels,
    target_scope: input.scope,
    target_community_ids:
      input.scope === 'all' ? null :
      input.scope === 'sample' ? (input.selectedSampleComms.length > 0 ? input.selectedSampleComms : null) :
      input.scope === 'group' ? [input.groupComm] : input.selectedComms,
    target_group_alias:
      input.scope === 'group' ? input.groupAlias :
      input.scope === 'sample' && input.selectedSampleGroup ? input.selectedSampleGroup : null,
    target_roles: input.roles,
    personalized: input.personalized,
    push_title: input.customPerCh ? optionalText(input.pushTitle) : null,
    push_body: input.customPerCh ? optionalText(input.pushBody) : null,
    email_title: input.customPerCh ? optionalText(input.emailTitle) : null,
    email_body: input.customPerCh ? optionalText(input.emailBody) : null,
    email_action_label: input.emailLabel || null,
    email_background_url: input.emailBgUrl || null,
    save_as_template: input.saveTemplate,
    template_name: input.saveTemplate ? input.templateName : null,
  }
}

function optionalText(value: string) {
  const trimmed = value.trim()
  return trimmed ? value : null
}

export function resolveScheduledAt(mode: 'immediate' | 'scheduled', scheduledAt: string) {
  return mode === 'scheduled' && scheduledAt
    ? new Date(scheduledAt).toISOString()
    : null
}

export function buildSequenceStepPayload(
  basePayload: DispatchBasePayload,
  step: SequenceStep,
  index: number,
  stepDate: Date,
  sequenceId: string,
  globalTitle: string,
  globalBody: string,
  emailLabel: string,
  saveTemplate: boolean,
  templateName: string,
  steps: SequenceStep[],
) {
  return {
    ...basePayload,
    title: step.overrideTitle || globalTitle,
    body: step.overrideBody || globalBody,
    push_title: step.customPerCh ? (step.pushTitle || null) : basePayload.push_title,
    push_body: step.customPerCh ? (step.pushBody || null) : basePayload.push_body,
    email_title: step.customPerCh ? (step.emailTitle || null) : basePayload.email_title,
    email_body: step.customPerCh ? (step.emailBody || null) : basePayload.email_body,
    email_action_label: step.customPerCh ? (step.emailLabel || emailLabel || null) : basePayload.email_action_label,
    scheduled_at: stepDate.toISOString(),
    sequence_id: sequenceId,
    sequence_step: index,
    save_as_template: saveTemplate && index === 0,
    template_name: saveTemplate && index === 0 ? (templateName || null) : null,
    sequence_steps: saveTemplate && index === 0 ? steps : null,
  }
}
