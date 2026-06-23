import { expect, test } from '@playwright/test'
import {
  cleanupSurveyFixtures,
  createSurveyFixture,
  E2E_COMMUNITY_ID,
  serviceDb,
  type SurveyFixture,
} from './helpers/e2e-data'

async function expectNoHorizontalOverflow(page: import('@playwright/test').Page) {
  const hasOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1)
  expect(hasOverflow).toBe(false)
}

test.describe('Respondente visual e acessibilidade basica', () => {
  let survey: SurveyFixture
  const slug = `respondente-visual-${Date.now()}`

  test.beforeAll(async () => {
    const db = serviceDb()
    await cleanupSurveyFixtures([slug], db)
    survey = await createSurveyFixture({
      slug,
      title: 'E2E Respondente Visual',
      bilingualNps: true,
    }, db)
  })

  test.afterAll(async () => {
    await cleanupSurveyFixtures([slug])
  })

  test('mobile e desktop renderizam sem overflow evidente', async ({ page }, testInfo) => {
    const runId = Date.now()
    for (const viewport of [
      { name: 'mobile', width: 375, height: 812 },
      { name: 'desktop', width: 1366, height: 768 },
    ]) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height })
      await page.goto(`/p/${survey.slug}?communityId=${E2E_COMMUNITY_ID}&userId=e2e-visual-${runId}-${viewport.name}&perfil=responsavel&email=visual-${runId}-${viewport.name}@example.com`)
      await expect(page.locator('.welcome-footer .btn-primary')).toBeVisible({ timeout: 15_000 })
      await expectNoHorizontalOverflow(page)

      await testInfo.attach(`respondente-${viewport.name}`, {
        body: await page.screenshot({ fullPage: true }),
        contentType: 'image/png',
      })
    }
  })
})
