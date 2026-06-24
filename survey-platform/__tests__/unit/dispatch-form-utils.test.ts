import { describe, expect, it } from 'vitest'

import {
  buildDispatchBasePayload,
  buildSequenceStepPayload,
  createNextSequenceStep,
  resolveScheduledAt,
  type SequenceStep,
} from '@/app/admin/surveys/[id]/dispatch/dispatch-form-utils'

const baseInput = {
  title: 'Titulo',
  body: 'Mensagem',
  channels: ['pushNotification', 'email'],
  scope: 'all' as const,
  selectedComms: [] as string[],
  selectedSampleComms: [] as string[],
  groupComm: 'community-a',
  groupAlias: 'turma-a',
  selectedSampleGroup: '',
  roles: ['guardian'],
  personalized: false,
  customPerCh: false,
  pushTitle: 'Push title',
  pushBody: 'Push body',
  emailTitle: 'Email title',
  emailBody: 'Email body',
  emailLabel: 'Responder',
  emailBgUrl: '',
  saveTemplate: false,
  templateName: '',
}

function step(overrides: Partial<SequenceStep> = {}): SequenceStep {
  return {
    key: 'step-1',
    offsetDays: 7,
    label: 'Lembrete',
    overrideTitle: '',
    overrideBody: '',
    customPerCh: false,
    pushTitle: '',
    pushBody: '',
    emailTitle: '',
    emailBody: '',
    emailLabel: '',
    ...overrides,
  }
}

describe('dispatch-form-utils', () => {
  it('builds base payload for all communities without channel overrides', () => {
    expect(buildDispatchBasePayload(baseInput)).toMatchObject({
      title: 'Titulo',
      body: 'Mensagem',
      target_scope: 'all',
      target_community_ids: null,
      target_group_alias: null,
      target_roles: ['guardian'],
      push_title: null,
      email_title: null,
      email_action_label: 'Responder',
      save_as_template: false,
      template_name: null,
    })
  })

  it('builds community and sample targeting payloads', () => {
    expect(buildDispatchBasePayload({
      ...baseInput,
      scope: 'communities',
      selectedComms: ['a', 'b'],
    }).target_community_ids).toEqual(['a', 'b'])

    expect(buildDispatchBasePayload({
      ...baseInput,
      scope: 'sample',
      selectedSampleComms: ['school-a'],
      selectedSampleGroup: 'group-1',
      personalized: true,
    })).toMatchObject({
      target_community_ids: ['school-a'],
      target_group_alias: 'group-1',
      personalized: true,
    })
  })

  it('keeps custom channel fields when enabled', () => {
    expect(buildDispatchBasePayload({
      ...baseInput,
      customPerCh: true,
      emailBgUrl: 'https://example.com/bg.png',
      saveTemplate: true,
      templateName: 'Convite',
    })).toMatchObject({
      push_title: 'Push title',
      push_body: 'Push body',
      email_title: 'Email title',
      email_body: 'Email body',
      email_background_url: 'https://example.com/bg.png',
      save_as_template: true,
      template_name: 'Convite',
    })
  })

  it('normalizes blank custom channel fields to null', () => {
    expect(buildDispatchBasePayload({
      ...baseInput,
      customPerCh: true,
      pushTitle: '',
      pushBody: '   ',
      emailTitle: '',
      emailBody: '   ',
    })).toMatchObject({
      push_title: null,
      push_body: null,
      email_title: null,
      email_body: null,
    })
  })

  it('builds sequence step payload with per-step channel overrides', () => {
    const basePayload = buildDispatchBasePayload({ ...baseInput, customPerCh: true })
    const steps = [step({ customPerCh: true, pushTitle: 'P2', emailLabel: 'Abrir' })]

    expect(buildSequenceStepPayload(
      basePayload,
      steps[0],
      0,
      new Date('2026-06-22T12:00:00.000Z'),
      'seq-1',
      'Titulo global',
      'Body global',
      'Responder',
      true,
      'Template',
      steps,
    )).toMatchObject({
      title: 'Titulo global',
      body: 'Body global',
      push_title: 'P2',
      push_body: null,
      email_action_label: 'Abrir',
      scheduled_at: '2026-06-22T12:00:00.000Z',
      sequence_id: 'seq-1',
      sequence_step: 0,
      save_as_template: true,
      template_name: 'Template',
      sequence_steps: steps,
    })
  })

  it('resolves scheduled date and creates next sequence step offset', () => {
    expect(resolveScheduledAt('immediate', '2026-06-22T09:00')).toBeNull()
    expect(resolveScheduledAt('scheduled', '2026-06-22T09:00')).toBe(new Date('2026-06-22T09:00').toISOString())
    expect(createNextSequenceStep([step({ offsetDays: 14 })]).offsetDays).toBe(21)
  })
})
