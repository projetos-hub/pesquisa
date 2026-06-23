import { expect, test } from '@playwright/test'
import {
  cleanupSurveyFixtures,
  createSurveyFixture,
  E2E_COMMUNITY_ID,
  E2E_PREFIX,
  serviceDb,
  writeState,
} from './helpers/e2e-data'

const RUN_ID = Date.now()
const SHORT_SLUG = `admin-essential-${RUN_ID}`
const THEME_SLUG = `admin-theme-${RUN_ID}`
const FULL_SLUG = `${E2E_PREFIX}-${SHORT_SLUG}`

test.describe('Admin essencial deterministico', () => {
  test.beforeAll(async () => {
    await cleanupSurveyFixtures([SHORT_SLUG, THEME_SLUG])
  })

  test.afterAll(async () => {
    await cleanupSurveyFixtures([SHORT_SLUG, THEME_SLUG])
  })

  test('login reutilizado acessa listagem admin', async ({ page }) => {
    await page.goto('/admin/surveys')
    await page.waitForLoadState('networkidle')

    await expect(page.locator('table, [role="table"]').first()).toBeVisible({ timeout: 10_000 })
    await expect(page.getByRole('link', { name: /nova|criar/i }).or(page.locator('a[href="/admin/surveys/new"]'))).toBeVisible()
  })

  test('cria, edita e instala comunidade pela UI', async ({ page }) => {
    await page.goto('/admin/surveys/new')

    await page.locator('input[name="title"]').fill('E2E Admin Essential')
    await page.locator('input[name="slug"]').fill(FULL_SLUG)
    await page.getByRole('button', { name: /criar pesquisa/i }).click()

    await page.waitForURL(/\/admin\/surveys\/[0-9a-f-]+$/i, { timeout: 15_000 })
    const surveyId = page.url().split('/').pop()
    expect(surveyId).toBeTruthy()
    writeState({ adminEssentialSurveyId: surveyId!, surveyId: surveyId! })

    await expect(page.getByText('E2E Admin Essential').first()).toBeVisible({ timeout: 8_000 })

    const metadataForm = page.locator('form').filter({ has: page.locator('textarea[name="thankyouMessage"]') }).first()
    await metadataForm.locator('input[name="title"]').fill('E2E Admin Essential Editada')
    await metadataForm.locator('select[name="status"]').selectOption('ativa')
    await metadataForm.getByRole('button', { name: /salvar/i }).click()
    await expect(page.getByText(/salvo/i).first()).toBeVisible({ timeout: 8_000 })

    await page.locator('input[name="communityId"]').fill(E2E_COMMUNITY_ID)
    await page.getByRole('button', { name: /instalar/i }).click()

    const db = serviceDb()
    const { data: survey } = await db
      .from('surveys')
      .select('id, title, status')
      .eq('slug', FULL_SLUG)
      .single()

    expect(survey?.title).toBe('E2E Admin Essential Editada')
    expect(survey?.status).toBe('ativa')

    await expect.poll(async () => {
      const { count } = await db
        .from('survey_communities')
        .select('*', { count: 'exact', head: true })
        .eq('survey_id', survey!.id)
        .eq('community_id', E2E_COMMUNITY_ID)
      return count ?? 0
    }, { timeout: 10_000 }).toBe(1)

    const { data: install } = await db
      .from('survey_communities')
      .select('community_id, active, status')
      .eq('survey_id', survey!.id)
      .eq('community_id', E2E_COMMUNITY_ID)
      .single()

    expect(install?.active).toBe(true)
    expect(install?.status).toBe('ativa')
  })

  test('edita identidade visual da comunidade', async ({ page }) => {
    const db = serviceDb()
    const survey = await createSurveyFixture({
      slug: THEME_SLUG,
      title: 'E2E Admin Theme',
    }, db)

    await page.goto(`/admin/surveys/${survey.surveyId}/communities`)
    await page.waitForLoadState('networkidle')

    await page.getByRole('button', { name: /editar/i }).first().click()
    await page.locator('input[name="nomeEscola"]').fill('Raiz Educacao E2E Tema')
    await page.locator('input[name="primaryColor"]').fill('#123456')
    await page.locator('input[name="secondaryColor"]').fill('#abcdef')
    await page.locator('textarea[name="thankyouMessage"]').fill('Obrigado pela resposta E2E.')
    await page.getByRole('button', { name: /^salvar$/i }).click()

    await expect(page.getByText('Raiz Educacao E2E Tema').first()).toBeVisible({ timeout: 8_000 })

    const { data: install } = await db
      .from('survey_communities')
      .select('theme')
      .eq('survey_id', survey.surveyId)
      .eq('community_id', E2E_COMMUNITY_ID)
      .single()

    const theme = install?.theme as Record<string, string> | null
    expect(theme?.nomeEscola).toBe('Raiz Educacao E2E Tema')
    expect(theme?.primaryColor).toBe('#123456')
    expect(theme?.secondaryColor).toBe('#abcdef')
    expect(theme?.thankyouMessage).toBe('Obrigado pela resposta E2E.')
  })
})
