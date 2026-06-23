import { expect, test } from '@playwright/test'

import {
  cleanupSurveyFixtures,
  createSurveyFixture,
  serviceDb,
  type SurveyFixture,
} from './helpers/e2e-data'

const slug = `admin-questions-${Date.now()}`

test.describe('Admin question editor', () => {
  let survey: SurveyFixture

  test.setTimeout(90_000)

  test.beforeAll(async () => {
    await cleanupSurveyFixtures([slug])
    survey = await createSurveyFixture({
      slug,
      title: 'E2E Question Editor',
    })
  })

  test.afterAll(async () => {
    await cleanupSurveyFixtures([slug])
  })

  test('cria, edita, reordena e alterna steps especiais', async ({ page }) => {
    const db = serviceDb()

    await page.goto(`/admin/surveys/${survey.surveyId}`, { waitUntil: 'domcontentloaded' })
    await expect(page.getByRole('heading', { name: /^perguntas$/i })).toBeVisible({ timeout: 10_000 })

    await page.getByRole('button', { name: /^remover$/i }).first().click()
    await expect.poll(async () => {
      const { count } = await db
        .from('questions')
        .select('*', { count: 'exact', head: true })
        .eq('survey_id', survey.surveyId)
        .eq('type', 'welcome')
      return count ?? 0
    }, { timeout: 10_000 }).toBe(0)

    await page.getByRole('button', { name: /^ativar$/i }).first().click()
    await expect.poll(async () => {
      const { count } = await db
        .from('questions')
        .select('*', { count: 'exact', head: true })
        .eq('survey_id', survey.surveyId)
        .eq('type', 'welcome')
      return count ?? 0
    }, { timeout: 10_000 }).toBe(1)

    await page.getByRole('button', { name: /adicionar pergunta/i }).click()
    await page.locator('input[placeholder^="Ex: Satis"]').last().fill('E2E Pergunta Texto')
    await page.locator('input[placeholder^="Instru"]').last().fill('Descricao inicial')
    await page.getByRole('button', { name: /^adicionar pergunta$/i }).click()

    let textQuestionId = ''
    await expect.poll(async () => {
      const { data } = await db
        .from('questions')
        .select('id, title, key, description')
        .eq('survey_id', survey.surveyId)
        .eq('key', 'e2e_pergunta_texto')
        .single()
      textQuestionId = data?.id ?? ''
      return textQuestionId
    }, { timeout: 10_000 }).not.toBe('')

    await page.getByRole('button', { name: /editar metadados/i }).last().click()
    await page.locator('input[placeholder^="Ex: Satis"]').last().fill('E2E Pergunta Texto Editada')
    await page.locator('input[title^="Identificador"]').last().fill('e2e_texto_editada')
    await page.getByRole('button', { name: /atualizar pergunta/i }).click()

    await expect.poll(async () => {
      const { data } = await db
        .from('questions')
        .select('title, key')
        .eq('id', textQuestionId)
        .single()
      return `${data?.key}:${data?.title}`
    }, { timeout: 10_000 }).toBe('e2e_texto_editada:E2E Pergunta Texto Editada')

    await page.getByRole('button', { name: /adicionar pergunta/i }).click()
    await page.getByRole('button', { name: /m.lt.*escolha/i }).click()
    await page.locator('input[placeholder^="Ex: Satis"]').last().fill('E2E Pergunta Radio')
    await page.locator('input[placeholder="Opção 1"]').fill('Sim')
    await page.locator('input[placeholder="Opção 2"]').fill('Não')
    await page.getByRole('button', { name: /^adicionar pergunta$/i }).click()

    let radioQuestionId = ''
    await expect.poll(async () => {
      const { data } = await db
        .from('questions')
        .select('id')
        .eq('survey_id', survey.surveyId)
        .eq('key', 'e2e_pergunta_radio')
        .single()
      radioQuestionId = data?.id ?? ''
      return radioQuestionId
    }, { timeout: 10_000 }).not.toBe('')

    await expect.poll(async () => {
      const { count } = await db
        .from('question_options')
        .select('*', { count: 'exact', head: true })
        .eq('question_id', radioQuestionId)
      return count ?? 0
    }, { timeout: 10_000 }).toBe(2)

    await page.getByRole('button', { name: /editar op/i }).last().click()
    await page.locator('textarea').last().fill('Sim\nNão\nTalvez')
    await page.getByRole('button', { name: /salvar op/i }).click()

    await expect.poll(async () => {
      const { data } = await db
        .from('question_options')
        .select('label')
        .eq('question_id', radioQuestionId)
        .order('order_index', { ascending: true })
      return (data ?? []).map(row => row.label).join('|')
    }, { timeout: 10_000 }).toBe('Sim|Não|Talvez')

    const beforeMove = await db
      .from('questions')
      .select('order_index')
      .eq('id', radioQuestionId)
      .single()

    await page.getByRole('button', { name: '▲' }).last().click()

    await expect.poll(async () => {
      const { data } = await db
        .from('questions')
        .select('order_index')
        .eq('id', radioQuestionId)
        .single()
      return data?.order_index
    }, { timeout: 10_000 }).toBeLessThan(beforeMove.data!.order_index)

    await page.getByRole('button', { name: /^remover$/i }).nth(1).click()
    await expect.poll(async () => {
      const { count } = await db
        .from('questions')
        .select('*', { count: 'exact', head: true })
        .eq('survey_id', survey.surveyId)
        .eq('type', 'thankyou')
      return count ?? 0
    }, { timeout: 10_000 }).toBe(0)

    await page.getByRole('button', { name: /^ativar$/i }).first().click()
    await expect.poll(async () => {
      const { count } = await db
        .from('questions')
        .select('*', { count: 'exact', head: true })
        .eq('survey_id', survey.surveyId)
        .eq('type', 'thankyou')
      return count ?? 0
    }, { timeout: 10_000 }).toBe(1)
  })
})
