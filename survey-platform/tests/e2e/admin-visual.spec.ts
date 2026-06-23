import { expect, test } from '@playwright/test'

async function expectNoHorizontalOverflow(page: import('@playwright/test').Page) {
  const hasOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1)
  expect(hasOverflow).toBe(false)
}

test.describe('Admin visual essencial', () => {
  test('surveys admin renderiza em desktop e tablet sem overflow evidente', async ({ page }, testInfo) => {
    for (const viewport of [
      { name: 'desktop', width: 1366, height: 768 },
      { name: 'tablet', width: 1024, height: 768 },
    ]) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height })
      await page.goto('/admin/surveys')
      await expect(page.locator('table, [role="table"]').first()).toBeVisible({ timeout: 10_000 })
      await expectNoHorizontalOverflow(page)

      await testInfo.attach(`admin-surveys-${viewport.name}`, {
        body: await page.screenshot({ fullPage: true }),
        contentType: 'image/png',
      })
    }
  })
})
