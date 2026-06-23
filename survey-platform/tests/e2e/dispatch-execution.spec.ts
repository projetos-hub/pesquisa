import { expect, test } from '@playwright/test'
import {
  cleanupSurveyFixtures,
  createSurveyFixture,
  E2E_COMMUNITY_ID,
  serviceDb,
  type SurveyFixture,
} from './helpers/e2e-data'

test.describe('Dispatch sem envio externo real', () => {
  let survey: SurveyFixture

  test.beforeAll(async () => {
    const db = serviceDb()
    await cleanupSurveyFixtures(['dispatch'], db)
    survey = await createSurveyFixture({
      slug: 'dispatch',
      title: 'E2E Dispatch',
    }, db)
  })

  test.afterAll(async () => {
    await cleanupSurveyFixtures(['dispatch'])
  })

  test('POST dispatch agendado cria dispatch e jobs sem chamar Layers', async ({ request }) => {
    const scheduledAt = new Date(Date.now() + 3_600_000).toISOString()
    const res = await request.post(`/api/admin/surveys/${survey.surveyId}/dispatch`, {
      data: {
        title: 'E2E Dispatch Agendado',
        body: 'Mensagem E2E agendada',
        channels: ['pushNotification'],
        target_scope: 'all',
        target_roles: ['guardian'],
        personalized: false,
        scheduled_at: scheduledAt,
      },
    })

    expect(res.status()).toBe(200)
    const body = await res.json() as { ok: boolean; scheduled: boolean; dispatch: { id: string } }
    expect(body.ok).toBe(true)
    expect(body.scheduled).toBe(true)
    expect(body.dispatch.id).toBeTruthy()

    const db = serviceDb()
    const { data: dispatch } = await db
      .from('survey_dispatches')
      .select('id, status, scheduled_at, total_jobs')
      .eq('id', body.dispatch.id)
      .single()
    expect(dispatch?.status).toBe('scheduled')
    expect(dispatch?.total_jobs).toBe(1)

    const { count } = await db
      .from('survey_dispatch_jobs')
      .select('*', { count: 'exact', head: true })
      .eq('dispatch_id', body.dispatch.id)
      .eq('community_id', E2E_COMMUNITY_ID)
    expect(count).toBe(1)
  })

  test('POST dispatch sample sem personalized retorna 422', async ({ request }) => {
    const res = await request.post(`/api/admin/surveys/${survey.surveyId}/dispatch`, {
      data: {
        title: 'E2E Sample Invalido',
        body: 'Mensagem E2E',
        channels: ['pushNotification'],
        target_scope: 'sample',
        target_roles: ['guardian'],
        personalized: false,
      },
    })

    expect(res.status()).toBe(422)
  })

  test('GET dispatch-audit retorna estrutura com log seedado', async ({ request }) => {
    const db = serviceDb()
    const { data: dispatch, error: dispatchError } = await db
      .from('survey_dispatches')
      .insert({
        survey_id: survey.surveyId,
        title: 'E2E Dispatch Audit Seed',
        body: 'Mensagem audit',
        channels: ['pushNotification'],
        target_scope: 'all',
        target_roles: ['guardian'],
        personalized: false,
        status: 'sent',
        total_jobs: 1,
        completed_jobs: 1,
      })
      .select('id')
      .single()
    expect(dispatchError).toBeNull()

    const { data: job, error: jobError } = await db
      .from('survey_dispatch_jobs')
      .insert({
        dispatch_id: dispatch!.id,
        community_id: E2E_COMMUNITY_ID,
        status: 'sent',
      })
      .select('id')
      .single()
    expect(jobError).toBeNull()

    const { error: logError } = await db.from('notification_audit_logs').insert({
      dispatch_id: dispatch!.id,
      job_id: job!.id,
      email: 'dispatch-audit-e2e@example.com',
      nome: 'Audit E2E',
      status: 'sent',
      sent_at: new Date().toISOString(),
    })
    expect(logError).toBeNull()

    const res = await request.get(`/api/admin/surveys/${survey.surveyId}/dispatch-audit?dispatch_id=${dispatch!.id}`)
    expect(res.status()).toBe(200)

    const body = await res.json() as {
      dispatch_id: string
      total: number
      total_sent: number
      logs: Array<{ email: string; status: string }>
    }
    expect(body.dispatch_id).toBe(dispatch!.id)
    expect(body.total).toBe(1)
    expect(body.total_sent).toBe(1)
    expect(body.logs[0]?.email).toBe('dispatch-audit-e2e@example.com')
  })
})
