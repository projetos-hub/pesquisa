import { expect, test } from '@playwright/test'
import { utils, write } from 'xlsx'
import {
  cleanupSurveyFixtures,
  createSurveyFixture,
  serviceDb,
  type SurveyFixture,
} from './helpers/e2e-data'

function sampleWorkbookBuffer() {
  const rows = [
    {
      NOME: 'Aluno E2E',
      NOMEFANTASIA: 'RAIZ EDUCACAO',
      'EMAIL INSTITUCIONAL': 'aluno.sample.e2e@example.com',
      'EMAIL RESP FIN': 'financeiro.sample.e2e@example.com',
      'EMAIL RESP ACAD': 'academico.sample.e2e@example.com',
    },
  ]
  const workbook = utils.book_new()
  utils.book_append_sheet(workbook, utils.json_to_sheet(rows), 'Amostra')
  return write(workbook, { type: 'buffer', bookType: 'xlsx' }) as Buffer
}

test.describe('Admin sample deterministico', () => {
  let survey: SurveyFixture

  test.beforeAll(async () => {
    const db = serviceDb()
    await cleanupSurveyFixtures(['admin-sample'], db)
    survey = await createSurveyFixture({
      slug: 'admin-sample',
      title: 'E2E Admin Sample',
      accessControl: 'amostra',
    }, db)
  })

  test.afterAll(async () => {
    await cleanupSurveyFixtures(['admin-sample'])
  })

  test('pagina de amostra carrega', async ({ page }) => {
    await page.goto(`/admin/surveys/${survey.surveyId}/sample`)
    await page.waitForLoadState('networkidle')

    await expect(page.locator('h1, h2').first()).toBeVisible({ timeout: 8_000 })
    await expect(page.getByText(/internal server error|500/i)).not.toBeVisible()
  })

  test('upload de amostra via API retorna contagens e persiste entradas', async ({ request }) => {
    const res = await request.post(`/api/admin/surveys/${survey.surveyId}/sample`, {
      multipart: {
        file: {
          name: 'amostra-e2e.xlsx',
          mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          buffer: sampleWorkbookBuffer(),
        },
      },
    })

    expect(res.status()).toBe(200)
    const body = await res.json() as {
      total_entries: number
      diagnostico: { duplicatas_removidas: number }
    }
    expect(body.total_entries).toBe(3)
    expect(body.diagnostico.duplicatas_removidas).toBe(0)

    const db = serviceDb()
    const { count } = await db
      .from('survey_sample_lists')
      .select('*', { count: 'exact', head: true })
      .eq('survey_id', survey.surveyId)
    expect(count).toBe(3)
  })

  test('GET sample retorna totais e entries', async ({ request }) => {
    const res = await request.get(`/api/admin/surveys/${survey.surveyId}/sample`)
    expect(res.status()).toBe(200)

    const body = await res.json() as {
      totals: { total: number; pending: number }
      entries: unknown[]
    }
    expect(body.totals.total).toBeGreaterThanOrEqual(0)
    expect(Array.isArray(body.entries)).toBe(true)
  })

  test('DELETE sample limpa entradas', async ({ request }) => {
    const res = await request.delete(`/api/admin/surveys/${survey.surveyId}/sample`)
    expect(res.status()).toBe(200)

    const db = serviceDb()
    const { count } = await db
      .from('survey_sample_lists')
      .select('*', { count: 'exact', head: true })
      .eq('survey_id', survey.surveyId)
    expect(count).toBe(0)
  })
})
