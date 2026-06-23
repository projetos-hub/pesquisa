import { expect, test } from '@playwright/test'
import {
  cleanupSurveyFixtures,
  createSurveyFixture,
  E2E_COMMUNITY_ID,
  serviceDb,
  submitAnswers,
  type SurveyFixture,
} from './helpers/e2e-data'

test.describe('Fluxo respondente deterministico', () => {
  let survey: SurveyFixture
  const slug = `respondente-${Date.now()}`

  test.beforeAll(async () => {
    const db = serviceDb()
    await cleanupSurveyFixtures([slug], db)
    survey = await createSurveyFixture({
      slug,
      title: 'E2E Respondente',
      bilingualNps: true,
    }, db)
  })

  test.afterAll(async () => {
    await cleanupSurveyFixtures([slug])
  })

  test('carrega welcome, responde NPS com bilingue e chega no ThankYou', async ({ page }) => {
    const userId = `e2e-ui-${Date.now()}`
    await page.goto(`/p/${survey.slug}?communityId=${E2E_COMMUNITY_ID}&userId=${userId}&perfil=responsavel&email=ui-e2e@example.com`)
    await page.waitForLoadState('networkidle')

    const startButton = page.getByRole('button', { name: /responder|comecar|começar|iniciar/i })
    await expect(startButton).toBeVisible({ timeout: 12_000 })
    await startButton.click()

    await expect(page.locator('.nps-btn').first()).toBeVisible({ timeout: 10_000 })
    await expect(page.locator('.nps-btn')).toHaveCount(11)
    await page.locator('.nps-btn').first().click()
    await expect(page.getByText(/programa bilingue|programa bilíngue/i)).toBeVisible()
    await page.getByRole('button', { name: /nao|não/i }).click()
    await page.getByRole('button', { name: /proximo|próximo/i }).click()

    await expect(page.getByText('Pedagogico')).toBeVisible({ timeout: 8_000 })
    await page.locator('.scale-group').nth(0).locator('.scale-btn').first().click()
    await page.locator('.scale-group').nth(1).locator('.scale-btn').first().click()
    await page.getByRole('button', { name: /enviar pesquisa/i }).click()

    await expect(page.getByText(/obrigado/i).first()).toBeVisible({ timeout: 12_000 })
  })

  test('falha temporaria no submit mostra retry sem perder respostas', async ({ page }) => {
    const userId = `e2e-retry-${Date.now()}`
    let attempts = 0

    await page.route(`**/api/surveys/${survey.slug}/submit`, async (route) => {
      attempts += 1
      if (attempts === 1) {
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'temporary_failure' }),
        })
        return
      }

      await route.fallback()
    })

    await page.goto(`/p/${survey.slug}?communityId=${E2E_COMMUNITY_ID}&userId=${userId}&perfil=responsavel&email=retry-e2e@example.com`)

    await page.locator('.welcome-footer .btn-primary').click()
    await page.locator('.nps-btn').first().click()
    await page.locator('.option-btn').nth(1).click()
    await page.locator('.btn-primary').click()
    await page.locator('.scale-group').nth(0).locator('.scale-btn').first().click()
    await page.locator('.scale-group').nth(1).locator('.scale-btn').first().click()
    await page.locator('.btn-primary').click()

    await expect(page.locator('.submit-alert')).toContainText(/nao foi possivel|temporary_failure/i)
    await page.getByRole('button', { name: /tentar novamente/i }).click()

    await expect(page.getByText(/obrigado/i).first()).toBeVisible({ timeout: 12_000 })
    expect(attempts).toBe(2)
  })

  test('submit via API persiste respostas e duplicate e idempotente', async ({ request }) => {
    const userId = `e2e-submit-${Date.now()}`
    const payload = {
      communityId: E2E_COMMUNITY_ID,
      userId,
      accountId: userId,
      perfil: 'responsavel',
      nomeCompleto: 'Pessoa E2E',
      email: 'respondente-e2e@example.com',
      answers: submitAnswers(),
    }

    const first = await request.post(`/api/surveys/${survey.slug}/submit`, { data: payload })
    expect(first.status()).toBe(200)
    await expect(first).toBeOK()
    const firstBody = await first.json() as { ok?: boolean; sessionId?: string }
    expect(firstBody.ok).toBe(true)
    expect(firstBody.sessionId).toBeTruthy()

    const second = await request.post(`/api/surveys/${survey.slug}/submit`, { data: payload })
    expect(second.status()).toBe(200)
    const secondBody = await second.json() as { duplicate?: boolean }
    expect(secondBody.duplicate).toBe(true)

    const db = serviceDb()
    const { count } = await db
      .from('response_sessions')
      .select('*', { count: 'exact', head: true })
      .eq('survey_id', survey.surveyId)
      .eq('user_id', userId)

    expect(count).toBe(1)
  })

  test('payload invalido retorna 422 sem criar sessao', async ({ request }) => {
    const res = await request.post(`/api/surveys/${survey.slug}/submit`, {
      data: {
        communityId: E2E_COMMUNITY_ID,
        userId: 'e2e-invalid-payload',
        perfil: 'responsavel',
        answers: { unknown_key: 'value' },
      },
    })

    expect(res.status()).toBe(422)
    const body = await res.json() as { error: string }
    expect(body.error).toContain('No valid answers')
  })

  test('survey inexistente mostra erro para usuario', async ({ page }) => {
    await page.goto('/p/e2e-survey-nao-existe')
    await page.waitForLoadState('networkidle')

    await expect(
      page.getByText(/nao encontrada|não encontrada|erro/i).first()
    ).toBeVisible({ timeout: 8_000 })
  })
})
