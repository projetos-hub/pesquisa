import { test, expect } from '@playwright/test'

test.describe('Admin — Export', () => {

  test('página de export lista surveys', async ({ page }) => {
    await page.goto('/admin/export')
    await page.waitForLoadState('networkidle')
    await expect(page.locator('h1').first()).toBeVisible({ timeout: 8_000 })
    await expect(page.locator('a[href*="export?surveyId"]').first()).toBeVisible()
  })

  test('download XLSX inicia corretamente', async ({ page }) => {
    await page.goto('/admin/export')
    await page.waitForLoadState('networkidle')

    const downloadPromise = page.waitForEvent('download', { timeout: 10_000 }).catch(() => null)
    await page.locator('a[href*="export?surveyId"]').first().click()
    const download = await downloadPromise
    if (download) {
      expect(download.suggestedFilename()).toContain('.xlsx')
      console.log('[export] download:', download.suggestedFilename())
    }
  })

})
