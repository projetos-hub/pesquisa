import { expect, test } from '@playwright/test'
import {
  cleanupSurveyFixtures,
  createSurveyFixture,
  type SurveyFixture,
} from './helpers/e2e-data'

test.describe('Admin surveys', () => {
  let survey: SurveyFixture
  const slug = `admin-surveys-${Date.now()}`

  test.beforeAll(async () => {
    await cleanupSurveyFixtures([slug])
    survey = await createSurveyFixture({
      slug,
      title: 'E2E Admin Surveys',
    })
  })

  test.afterAll(async () => {
    await cleanupSurveyFixtures([slug])
  })

  test('lista surveys existentes', async ({ page }) => {
    await page.goto('/admin/surveys')
    await page.waitForLoadState('networkidle')

    await expect(page.locator('table, [role="table"]').first()).toBeVisible({ timeout: 10_000 })
    await expect(page.getByText('E2E Admin Surveys').first()).toBeVisible({ timeout: 8_000 })
  })

  test('abre detalhe da survey seedada', async ({ page }) => {
    await page.goto(`/admin/surveys/${survey.surveyId}`)
    await page.waitForLoadState('networkidle')

    await expect(page.getByText('E2E Admin Surveys').first()).toBeVisible({ timeout: 8_000 })
    await expect(page.getByText(/metadados/i).first()).toBeVisible()
  })
})
