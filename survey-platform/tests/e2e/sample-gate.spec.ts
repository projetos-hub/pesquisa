/**
 * sample-gate.spec.ts
 * Valida que o gate de amostra funciona ponta-a-ponta:
 * - GET /api/surveys/[slug] bloqueia usuários fora da amostra
 * - POST /api/surveys/[slug]/submit bloqueia direto (fix 8.0)
 * - Surveys sem amostra são acessíveis por qualquer email
 */
import { test, expect } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'
import fs               from 'fs'
import path             from 'path'

const STATE_FILE   = path.join(__dirname, '../.auth/test-state.json')
const COMMUNITY_ID = 'raizeducacao'
const EMAIL_IN     = 'sample-gate-in@test.com'
const EMAIL_OUT    = 'sample-gate-out@test.com'

function db() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

function getState(): Record<string, string> {
  if (!fs.existsSync(STATE_FILE)) return {}
  return JSON.parse(fs.readFileSync(STATE_FILE, 'utf-8'))
}
function saveState(data: Record<string, string>) {
  const existing = getState()
  fs.writeFileSync(STATE_FILE, JSON.stringify({ ...existing, ...data }, null, 2))
}

test.describe('Sample Gate', () => {
  let sampledSurveySlug: string
  let sampledSurveyId:   string
  let openSurveySlug:    string
  let openSurveyId:      string

  test.beforeAll(async () => {
    const supabase = db()
    const ts = Date.now()

    // Survey com amostra
    const { data: s1 } = await supabase
      .from('surveys')
      .insert({ title: 'Sampled E2E', slug: `e2e-sampled-${ts}`, survey_type: 'quantitativa', status: 'ativa' })
      .select('id, slug').single()
    sampledSurveyId   = s1!.id
    sampledSurveySlug = s1!.slug
    saveState({ sampledSurveyId, sampledSurveySlug })

    // Survey aberta (sem amostra)
    const { data: s2 } = await supabase
      .from('surveys')
      .insert({ title: 'Open E2E', slug: `e2e-open-${ts}`, survey_type: 'quantitativa', status: 'ativa' })
      .select('id, slug').single()
    openSurveyId   = s2!.id
    openSurveySlug = s2!.slug

    // Instalar ambas na community
    await supabase.from('survey_communities').insert([
      { survey_id: sampledSurveyId, community_id: COMMUNITY_ID, active: true, status: 'ativa', theme: { nomeEscola: 'Raiz Educação' } },
      { survey_id: openSurveyId,    community_id: COMMUNITY_ID, active: true, status: 'ativa', theme: { nomeEscola: 'Raiz Educação' } },
    ])

    // Amostra: apenas EMAIL_IN
    await supabase.from('survey_sample_lists').insert({
      survey_id: sampledSurveyId, community_id: COMMUNITY_ID,
      email: EMAIL_IN, nome: 'In-Sample User',
    })
  })

  test.afterAll(async () => {
    const supabase = db()
    await supabase.from('survey_sample_lists').delete().eq('survey_id', sampledSurveyId)
    await supabase.from('response_sessions').delete().in('survey_id', [sampledSurveyId, openSurveyId].filter(Boolean))
    await supabase.from('survey_communities').delete().in('survey_id', [sampledSurveyId, openSurveyId].filter(Boolean))
    await supabase.from('surveys').delete().in('id', [sampledSurveyId, openSurveyId].filter(Boolean))
  })

  // ── GET /api/surveys/[slug] — acesso à config ─────────────────────────────

  test('GET config: email NA amostra → 200', async ({ request }) => {
    const res = await request.get(
      `/api/surveys/${sampledSurveySlug}?communityId=${COMMUNITY_ID}&email=${encodeURIComponent(EMAIL_IN)}`
    )
    // 200 ou 404 por falta de questions — mas NÃO 403
    expect(res.status()).not.toBe(403)
  })

  test('GET config: email FORA da amostra → 403 not_in_sample', async ({ request }) => {
    const res = await request.get(
      `/api/surveys/${sampledSurveySlug}?communityId=${COMMUNITY_ID}&email=${encodeURIComponent(EMAIL_OUT)}`
    )
    expect(res.status()).toBe(403)
    const body = await res.json() as { error: string }
    expect(body.error).toBe('not_in_sample')
  })

  test('GET config: sem email em survey com amostra → 403', async ({ request }) => {
    const res = await request.get(
      `/api/surveys/${sampledSurveySlug}?communityId=${COMMUNITY_ID}`
    )
    expect(res.status()).toBe(403)
    const body = await res.json() as { error: string }
    expect(body.error).toBe('not_in_sample')
  })

  test('GET config: survey sem amostra aceita qualquer email → não 403', async ({ request }) => {
    const res = await request.get(
      `/api/surveys/${openSurveySlug}?communityId=${COMMUNITY_ID}&email=${encodeURIComponent(EMAIL_OUT)}`
    )
    expect(res.status()).not.toBe(403)
  })

  // ── POST /api/surveys/[slug]/submit — gate no submit (fix 8.0) ─────────────

  test('POST submit: email FORA da amostra → 403 not_in_sample', async ({ request }) => {
    const res = await request.post(`/api/surveys/${sampledSurveySlug}/submit`, {
      data: {
        communityId: COMMUNITY_ID,
        userId:      'e2e-outsider-001',
        email:       EMAIL_OUT,
        answers:     { nps: 9 },
      },
    })
    expect(res.status()).toBe(403)
    const body = await res.json() as { error: string }
    expect(body.error).toBe('not_in_sample')
  })

  test('POST submit: sem email em survey com amostra → 403', async ({ request }) => {
    const res = await request.post(`/api/surveys/${sampledSurveySlug}/submit`, {
      data: {
        communityId: COMMUNITY_ID,
        userId:      'e2e-noemail-001',
        answers:     { nps: 7 },
      },
    })
    expect(res.status()).toBe(403)
    const body = await res.json() as { error: string }
    expect(body.error).toBe('not_in_sample')
  })

  test('POST submit: survey sem amostra aceita qualquer email → 200', async ({ request }) => {
    const res = await request.post(`/api/surveys/${openSurveySlug}/submit`, {
      data: {
        communityId: COMMUNITY_ID,
        userId:      'e2e-open-submit-001',
        email:       EMAIL_OUT,
        answers:     { nps: 8 },
      },
    })
    // 200 (novo) ou 200 duplicate — não 403
    expect(res.status()).toBe(200)
  })

  // ── UI: SurveyRunner mostra erro quando bloqueado ─────────────────────────

  test('UI: acesso bloqueado mostra mensagem de erro', async ({ page }) => {
    await page.goto(
      `/p/${sampledSurveySlug}?communityId=${COMMUNITY_ID}&email=${encodeURIComponent(EMAIL_OUT)}`
    )
    await page.waitForLoadState('networkidle')

    // SurveyRunner deve mostrar tela de acesso negado
    await expect(
      page.locator('text=amostra')
        .or(page.locator('text=Acesso').first())
        .or(page.locator('text=não encontrada').first())
    ).toBeVisible({ timeout: 12_000 })

    // Não deve mostrar o WelcomeStep
    const welcomeBtn = page.locator('button:has-text("Responder"), button:has-text("Começar")')
    await expect(welcomeBtn).not.toBeVisible({ timeout: 3_000 })
  })
})
