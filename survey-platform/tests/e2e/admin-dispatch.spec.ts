import { expect, test } from '@playwright/test'
import {
  cleanupSurveyFixtures,
  createSurveyFixture,
  E2E_COMMUNITY_ID,
  serviceDb,
  type SurveyFixture,
} from './helpers/e2e-data'

test.describe('Admin dispatch UI', () => {
  let survey: SurveyFixture

  test.beforeAll(async () => {
    const db = serviceDb()
    await cleanupSurveyFixtures(['admin-dispatch'], db)
    survey = await createSurveyFixture({
      slug: 'admin-dispatch',
      title: 'E2E Admin Dispatch',
    }, db)

    const { error } = await db.from('survey_sample_lists').insert({
      survey_id: survey.surveyId,
      community_id: E2E_COMMUNITY_ID,
      email: 'admin-dispatch-e2e@example.com',
      nome: 'Admin Dispatch E2E',
      layers_user_id: 'layers-e2e-dispatch',
    })
    if (error) throw new Error(`Failed to seed dispatch sample: ${error.message}`)
  })

  test.afterAll(async () => {
    await cleanupSurveyFixtures(['admin-dispatch'])
  })

  test('mostra os quatro escopos de disparo', async ({ page }) => {
    await page.goto(`/admin/surveys/${survey.surveyId}/dispatch`)

    await expect(page.locator('label').filter({ hasText: 'Todas as comunidades' }).first()).toBeVisible({ timeout: 8_000 })
    await expect(page.locator('label').filter({ hasText: 'Comunidades' }).first()).toBeVisible()
    await expect(page.locator('label').filter({ hasText: 'turma' }).first()).toBeVisible()
    await expect(page.locator('label').filter({ hasText: 'Amostra' }).first()).toBeVisible()
  })

  test('selecionar amostra exibe estado de sample', async ({ page }) => {
    await page.goto(`/admin/surveys/${survey.surveyId}/dispatch`)
    const sampleScope = page.locator('label').filter({ hasText: 'Amostra' }).first()
    await expect(sampleScope).toBeVisible({ timeout: 8_000 })

    await sampleScope.locator('input[type="radio"]').click()

    await expect(
      page.getByText(/amostra|email/i).first()
    ).toBeVisible({ timeout: 5_000 })
  })

  test('cria dispatch agendado via API autenticada e aparece no historico', async ({ request, page }) => {
    const scheduledAt = new Date(Date.now() + 3_600_000).toISOString()
    const res = await request.post(`/api/admin/surveys/${survey.surveyId}/dispatch`, {
      data: {
        title: 'E2E Admin Dispatch Agendado',
        body: 'Mensagem criada pelo E2E',
        channels: ['pushNotification'],
        target_scope: 'all',
        target_roles: ['guardian'],
        personalized: false,
        scheduled_at: scheduledAt,
      },
    })

    expect(res.status()).toBe(200)

    await page.goto(`/admin/surveys/${survey.surveyId}/dispatch`)
    await expect(page.getByText('E2E Admin Dispatch Agendado').first()).toBeVisible({ timeout: 8_000 })
  })

  test('painel de disparo rapido valida payload incompleto', async ({ request }) => {
    const res = await request.post(`/api/admin/surveys/${survey.surveyId}/dispatch-manual`, {
      data: {
        emails: ['test@example.com'],
        title: 'Sem community',
        body: 'Teste',
        channels: ['pushNotification'],
      },
    })

    expect([400, 422]).toContain(res.status())
  })
})
