import { describe, expect, it } from 'vitest'
import {
  buildNotificationAuditLog,
  buildSamplePersonalizedPayload,
  buildNotificationPayload,
  interpolatePlaceholders,
  type DispatchRecord,
} from '@/lib/layers-notification-payloads'
import { sendToOneCommunity } from '@/lib/layers-notifications'

function dispatch(overrides: Partial<DispatchRecord> = {}): DispatchRecord {
  return {
    id: 'dispatch-1',
    survey_id: 'survey-1',
    title: 'Pesquisa',
    body: 'Responda a pesquisa',
    push_title: null,
    push_body: null,
    email_title: null,
    email_body: null,
    email_action_label: 'Responder',
    email_background_url: null,
    channels: ['pushNotification'],
    target_scope: 'all',
    target_community_ids: null,
    target_group_alias: null,
    target_roles: ['guardian'],
    personalized: false,
    ...overrides,
  }
}

describe('buildNotificationPayload', () => {
  it('targets the whole community when scope is all', () => {
    const payload = buildNotificationPayload(dispatch())

    expect(payload.targets.topics).toEqual([{ kind: 'group', alias: 'all' }])
    expect(payload.targets.roles).toEqual(['guardian'])
    expect(payload.action).toMatchObject({
      type: 'portal',
      portalAlias: '@raizeducacao:pesquisa',
      path: '/',
    })
  })

  it('uses the configured group alias for group dispatches', () => {
    const payload = buildNotificationPayload(
      dispatch({ target_scope: 'group', target_group_alias: 'familias-7a' }),
    )

    expect(payload.targets.topics).toEqual([{ kind: 'group', alias: 'familias-7a' }])
  })

  it('builds channel overrides with root title and body fallback', () => {
    const payload = buildNotificationPayload(
      dispatch({
        channels: ['pushNotification', 'email'],
        push_title: 'Push title',
        push_body: 'Push body',
        email_title: null,
        email_body: 'Email body',
        email_background_url: 'https://example.com/bg.png',
      }),
    )

    expect(payload.channels).toEqual({
      pushNotification: { title: 'Push title', body: 'Push body' },
      email: {
        title: 'Pesquisa',
        body: 'Email body',
        actionLabel: 'Responder',
        backgroundUrl: 'https://example.com/bg.png',
      },
    })
  })

  it('falls back to root title and body when channel overrides are blank', () => {
    const payload = buildNotificationPayload(
      dispatch({
        channels: ['pushNotification', 'email'],
        push_title: '',
        push_body: '   ',
        email_title: '',
        email_body: '   ',
      }),
    )

    expect(payload.title).toBe('Pesquisa')
    expect(payload.body).toBe('Responda a pesquisa')
    expect(payload.channels).toEqual({
      pushNotification: { title: 'Pesquisa', body: 'Responda a pesquisa' },
      email: {
        title: 'Pesquisa',
        body: 'Responda a pesquisa',
        actionLabel: 'Responder',
      },
    })
  })
})

describe('buildNotificationAuditLog', () => {
  it('builds a sent audit log with timestamp and no error', () => {
    const log = buildNotificationAuditLog({
      dispatchId: 'dispatch-1',
      jobId: 'job-1',
      email: 'ana@example.com',
      nome: 'Ana',
      success: true,
      error: 'ignored',
    })

    expect(log).toMatchObject({
      dispatch_id: 'dispatch-1',
      job_id: 'job-1',
      email: 'ana@example.com',
      nome: 'Ana',
      status: 'sent',
      error: null,
    })
    expect(typeof log.sent_at).toBe('string')
  })

  it('builds a failed audit log with error and no sent timestamp', () => {
    expect(buildNotificationAuditLog({
      dispatchId: 'dispatch-1',
      jobId: 'job-1',
      email: 'ana@example.com',
      success: false,
      error: 'rate_limited',
    })).toEqual({
      dispatch_id: 'dispatch-1',
      job_id: 'job-1',
      email: 'ana@example.com',
      nome: null,
      status: 'failed',
      error: 'rate_limited',
      sent_at: null,
    })
  })
})

describe('buildSamplePersonalizedPayload', () => {
  it('targets one resolved Layers user and interpolates personalized channel content', () => {
    const payload = buildSamplePersonalizedPayload(
      dispatch({
        target_scope: 'sample',
        personalized: true,
        channels: ['pushNotification', 'email'],
        title: 'Pesquisa {{nomeEscola}}',
        body: 'Ola {{nome}}, fale sobre {{nomeAluno}}',
        push_title: 'Oi {{nome}}',
        push_body: 'Turma {{serie}}',
        email_title: 'Email {{nomeEscola}}',
        email_body: 'Aluno {{nomeAluno}}',
      }),
      {
        layersUserId: 'layers-user-1',
        vars: {
          nome: 'Ana',
          nomeAluno: 'Bruno',
          nomeEscola: 'Raiz',
          serie: '7A',
        },
      },
    )

    expect(payload.targets.topics).toEqual([{ kind: 'user', id: 'layers-user-1' }])
    expect(payload.title).toBe('Oi Ana')
    expect(payload.body).toBe('Turma 7A')
    expect(payload.channels).toEqual({
      pushNotification: { title: 'Oi Ana', body: 'Turma 7A' },
      email: {
        title: 'Email Raiz',
        body: 'Aluno Bruno',
        actionLabel: 'Responder',
      },
    })
  })

  it('uses personalized root content when channel overrides are blank', () => {
    const payload = buildSamplePersonalizedPayload(
      dispatch({
        target_scope: 'sample',
        personalized: true,
        channels: ['pushNotification', 'email'],
        title: 'Pesquisa {{nomeEscola}}',
        body: 'Ola {{nome}}',
        push_title: '',
        push_body: '',
        email_title: '',
        email_body: '',
      }),
      {
        layersUserId: 'layers-user-1',
        vars: {
          nome: 'Ana',
          nomeAluno: 'Bruno',
          nomeEscola: 'Raiz',
          serie: '7A',
        },
      },
    )

    expect(payload.title).toBe('Pesquisa Raiz')
    expect(payload.body).toBe('Ola Ana')
    expect(payload.channels).toEqual({
      pushNotification: { title: 'Pesquisa Raiz', body: 'Ola Ana' },
      email: {
        title: 'Pesquisa Raiz',
        body: 'Ola Ana',
        actionLabel: 'Responder',
      },
    })
  })
})

describe('interpolatePlaceholders', () => {
  it('interpolates known variables and uses readable fallbacks', () => {
    const fallbackText = interpolatePlaceholders(
      'Ola {{nome}}, {{nomeAluno}} - {{nomeEscola}} - {{serie}}',
      { nome: '', nomeAluno: '', nomeEscola: '', serie: '' },
    )

    expect(fallbackText).not.toContain('{{')
    expect(fallbackText).toContain('seu filho(a)')
    expect(fallbackText).toContain('a escola')
    expect(fallbackText).toContain('a turma')

    expect(interpolatePlaceholders(
      'Ola {{nome}}, {{nomeAluno}}',
      { nome: 'Ana', nomeAluno: 'Bruno', nomeEscola: 'Raiz', serie: '7A' },
    )).toBe('Ola Ana, Bruno')
  })
})

describe('sendToOneCommunity', () => {
  const originalToken = process.env.LAYERS_API_TOKEN
  const originalFetch = globalThis.fetch

  afterEach(() => {
    process.env.LAYERS_API_TOKEN = originalToken
    globalThis.fetch = originalFetch
  })

  it('fails fast when the Layers token is missing', async () => {
    delete process.env.LAYERS_API_TOKEN

    await expect(sendToOneCommunity('community-1', buildNotificationPayload(dispatch())))
      .resolves.toEqual({
        communityId: 'community-1',
        success: false,
        error: 'LAYERS_API_TOKEN não configurado',
      })
  })

  it('returns success with the parsed Layers response', async () => {
    process.env.LAYERS_API_TOKEN = 'token'
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ id: 'notification-1' }),
    } as Response)

    await expect(sendToOneCommunity('community-1', buildNotificationPayload(dispatch())))
      .resolves.toEqual({
        communityId: 'community-1',
        success: true,
        response: { id: 'notification-1' },
      })
  })

  it('returns a failed job result for HTTP errors including rate limits', async () => {
    process.env.LAYERS_API_TOKEN = 'token'
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 429,
      json: async () => ({ error: 'rate_limited' }),
    } as Response)

    await expect(sendToOneCommunity('community-1', buildNotificationPayload(dispatch())))
      .resolves.toEqual({
        communityId: 'community-1',
        success: false,
        error: 'rate_limited',
        response: { error: 'rate_limited' },
      })
  })
})
