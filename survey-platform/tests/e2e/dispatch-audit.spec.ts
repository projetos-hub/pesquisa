import { expect, test } from '@playwright/test'
import {
  cleanupSurveyFixtures,
  createSurveyFixture,
  E2E_COMMUNITY_ID,
  serviceDb,
  type SurveyFixture,
} from './helpers/e2e-data'

test.describe('Dispatch Audit API deterministica', () => {
  let survey: SurveyFixture

  test.beforeAll(async () => {
    const db = serviceDb()
    await cleanupSurveyFixtures(['dispatch-audit'], db)
    survey = await createSurveyFixture({
      slug: 'dispatch-audit',
      title: 'E2E Dispatch Audit',
    }, db)
  })

  test.afterAll(async () => {
    await cleanupSurveyFixtures(['dispatch-audit'])
  })

  test('sem dispatch_id retorna 400', async ({ request }) => {
    const res = await request.get(`/api/admin/surveys/${survey.surveyId}/dispatch-audit`)
    expect(res.status()).toBe(400)
  })

  test('com dispatch_id valido retorna estrutura correta', async ({ request }) => {
    const db = serviceDb()
    const { data: dispatch } = await db
      .from('survey_dispatches')
      .insert({
        survey_id: survey.surveyId,
        title: 'E2E Audit API',
        body: 'Mensagem audit',
        channels: ['pushNotification'],
        target_scope: 'all',
        target_roles: ['guardian'],
        personalized: false,
        status: 'partial_failure',
        total_jobs: 1,
        failed_jobs: 1,
      })
      .select('id')
      .single()

    const { data: job } = await db
      .from('survey_dispatch_jobs')
      .insert({
        dispatch_id: dispatch!.id,
        community_id: E2E_COMMUNITY_ID,
        status: 'failed',
        error: 'Erro controlado E2E',
      })
      .select('id')
      .single()

    await db.from('notification_audit_logs').insert({
      dispatch_id: dispatch!.id,
      job_id: job!.id,
      email: 'audit-api-e2e@example.com',
      nome: 'Audit API E2E',
      status: 'failed',
      error: 'Erro controlado E2E',
    })

    const res = await request.get(`/api/admin/surveys/${survey.surveyId}/dispatch-audit?dispatch_id=${dispatch!.id}`)
    expect(res.status()).toBe(200)

    const body = await res.json() as {
      dispatch_id: string
      total: number
      total_failed: number
      logs: Array<{ email: string; status: string; error: string }>
    }

    expect(body.dispatch_id).toBe(dispatch!.id)
    expect(body.total).toBe(1)
    expect(body.total_failed).toBe(1)
    expect(body.logs[0]?.status).toBe('failed')
  })
})
