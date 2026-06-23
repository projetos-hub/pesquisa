import { expect, test } from '@playwright/test'
import {
  cleanupSurveyFixtures,
  createSurveyFixture,
  E2E_COMMUNITY_ID,
  serviceDb,
  submitAnswers,
  type SurveyFixture,
} from './helpers/e2e-data'

const EMAIL_IN = 'sample-in-e2e@example.com'
const EMAIL_OUT = 'sample-out-e2e@example.com'

test.describe('Sample gate deterministico', () => {
  let sampled: SurveyFixture
  let open: SurveyFixture
  const runId = Date.now()
  const sampledSlug = `sampled-${runId}`
  const openSlug = `open-${runId}`

  test.beforeAll(async () => {
    const db = serviceDb()
    await cleanupSurveyFixtures([sampledSlug, openSlug], db)

    sampled = await createSurveyFixture({
      slug: sampledSlug,
      title: 'E2E Sampled',
      accessControl: 'amostra',
    }, db)
    open = await createSurveyFixture({
      slug: openSlug,
      title: 'E2E Open',
      accessControl: 'aberta',
    }, db)

    const { error } = await db.from('survey_sample_lists').insert({
      survey_id: sampled.surveyId,
      community_id: E2E_COMMUNITY_ID,
      email: EMAIL_IN,
      nome: 'Pessoa Na Amostra',
    })
    if (error) throw new Error(`Failed to seed sample list: ${error.message}`)
  })

  test.afterAll(async () => {
    await cleanupSurveyFixtures([sampledSlug, openSlug])
  })

  test('GET config permite email na amostra', async ({ request }) => {
    const res = await request.get(
      `/api/surveys/${sampled.slug}?communityId=${E2E_COMMUNITY_ID}&email=${encodeURIComponent(EMAIL_IN)}`
    )

    expect(res.status()).toBe(200)
    const body = await res.json() as { id: string; steps: unknown[] }
    expect(body.id).toBe(sampled.slug)
    expect(Array.isArray(body.steps)).toBe(true)
  })

  test('GET config bloqueia email fora da amostra', async ({ request }) => {
    const res = await request.get(
      `/api/surveys/${sampled.slug}?communityId=${E2E_COMMUNITY_ID}&email=${encodeURIComponent(EMAIL_OUT)}`
    )

    expect(res.status()).toBe(403)
    const body = await res.json() as { error: string }
    expect(body.error).toBe('not_in_sample')
  })

  test('GET config bloqueia survey amostral sem email', async ({ request }) => {
    const res = await request.get(`/api/surveys/${sampled.slug}?communityId=${E2E_COMMUNITY_ID}`)

    expect(res.status()).toBe(403)
    const body = await res.json() as { error: string }
    expect(body.error).toBe('not_in_sample')
  })

  test('survey aberta nao aplica sample gate', async ({ request }) => {
    const res = await request.get(
      `/api/surveys/${open.slug}?communityId=${E2E_COMMUNITY_ID}&email=${encodeURIComponent(EMAIL_OUT)}`
    )

    expect(res.status()).toBe(200)
  })

  test('POST submit bloqueia pessoa fora da amostra', async ({ request }) => {
    const res = await request.post(`/api/surveys/${sampled.slug}/submit`, {
      data: {
        communityId: E2E_COMMUNITY_ID,
        userId: 'e2e-outsider-001',
        accountId: 'e2e-outsider-001',
        perfil: 'responsavel',
        email: EMAIL_OUT,
        answers: submitAnswers(),
      },
    })

    expect(res.status()).toBe(403)
    const body = await res.json() as { error: string }
    expect(body.error).toBe('not_in_sample')
  })

  test('UI de pessoa bloqueada mostra erro e nao mostra botao inicial', async ({ page }) => {
    await page.goto(
      `/p/${sampled.slug}?communityId=${E2E_COMMUNITY_ID}&email=${encodeURIComponent(EMAIL_OUT)}`
    )
    await page.waitForLoadState('networkidle')

    await expect(page.getByText(/amostra|acesso|nenhuma pesquisa|nao encontrada|não encontrada/i).first()).toBeVisible({ timeout: 12_000 })
    await expect(page.getByRole('button', { name: /responder|comecar|começar|iniciar/i })).not.toBeVisible({ timeout: 3_000 })
  })
})
