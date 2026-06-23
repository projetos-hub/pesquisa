import { test, expect } from '@playwright/test'

test.describe('Admin - Export', () => {
  test('pagina de export lista surveys', async ({ page }) => {
    await page.goto('/admin/export')
    await expect(page.locator('h1').first()).toBeVisible({ timeout: 8_000 })
    await expect(page.locator('a[href*="export?surveyId"]').first()).toBeVisible()
  })

  test('download XLSX inicia corretamente', async ({ page }) => {
    await page.goto('/admin/export')
    const exportLink = page.locator('a[href*="export?surveyId"]').first()
    await expect(exportLink).toBeVisible({ timeout: 10_000 })

    const downloadPromise = page.waitForEvent('download', { timeout: 10_000 })
    await exportLink.click()
    const download = await downloadPromise

    expect(download.suggestedFilename()).toContain('.xlsx')
  })
})
