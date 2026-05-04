/**
 * respondente.spec.ts
 * Fluxo completo: acessar survey → responder → ThankYou → idempotência
 */
import { test, expect } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'

const BASE = '/p/csat?communityId=raizeducacao&userId=pw-test-resp-001&nome=Playwright&studentName=FilhoTeste&grade=3A'

test.describe('Fluxo respondente', () => {

  test('WelcomeStep carrega e botão Responder existe', async ({ page }) => {
    await page.goto(BASE)
    // Aguarda hydration do SurveyRunner
    await page.waitForLoadState('networkidle')
    // Welcome step deve ter um botão de avançar
    const btn = page.locator('button:has-text("Responder"), button:has-text("Começar"), button:has-text("Iniciar")')
    await expect(btn).toBeVisible({ timeout: 12_000 })
  })

  test('NPS step renderiza após WelcomeStep', async ({ page }) => {
    await page.goto(BASE)
    await page.waitForLoadState('networkidle')

    // Clica no botão de avançar do WelcomeStep
    const startBtn = page.locator('button:has-text("Responder"), button:has-text("Começar"), button:has-text("Iniciar")').first()
    await startBtn.click()

    // Aguarda NPS renderizar (tem botões 0-10 com class nps-btn)
    await expect(page.locator('.nps-btn').first()).toBeVisible({ timeout: 10_000 })
    await expect(page.locator('.nps-btn').nth(9)).toBeVisible() // botão '9'
    await expect(page.locator('.step-title')).toBeVisible()
  })

  test('NPS promotor (9) → avança → ThankYou ou próximo step', async ({ page }) => {
    await page.goto(BASE)
    await page.waitForLoadState('networkidle')

    // WelcomeStep
    await page.locator('button:has-text("Responder"), button:has-text("Começar")').first().click()
    await expect(page.locator('.nps-btn').first()).toBeVisible({ timeout: 10_000 })

    // Clica NPS 9 (índice 9 = décimo botão, valor 9)
    await page.locator('.nps-btn').nth(9).click()

    // Responde bilíngue se aparecer (csat tem perguntaBilingue=true)
    const bilBtn = page.locator('.option-btn, button:has-text("Sim"), button:has-text("Não")').first()
    if (await bilBtn.isVisible({ timeout: 1000 }).catch(() => false)) await bilBtn.click()

    // Clica Próximo
    await page.locator('button:has-text("Próximo")').click()

    // Deve ter avançado para próximo step
    await expect(page.locator('.step-title').first()).toBeVisible({ timeout: 8_000 })
  })

  test('submissão via API persiste no banco', async () => {
    const userId = `pw-test-submit-api-${Date.now()}`

    // Busca config da survey para montar answers com as question keys corretas
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    )
    const { data: questions } = await supabase
      .from('questions')
      .select('id, key, type')
      .eq('survey_id', '83c7556d-d0af-4815-8bc8-38059d50ac21') // csat
      .order('order_index')

    // Monta answers para todos os steps
    const answers: Record<string, unknown> = {}
    for (const q of questions ?? []) {
      if (q.type === 'nps')           answers[q.key] = { nps: 10, participa_bilingue: 'Não' }
      if (q.type === 'scale')         answers[q.key] = { 0: 5, 1: 5, 2: 5, 3: 5, 4: 5 }
      if (q.type === 'scale_sections') answers[q.key] = {}
      if (q.type === 'welcome')       answers[q.key] = true
    }

    // Chama o endpoint de submit diretamente
    const res = await fetch('http://localhost:3000/api/surveys/csat/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        communityId: 'raizeducacao',
        userId,
        accountId:   userId,
        perfil:      'responsavel',
        nomeCompleto: 'Playwright Test',
        answers,
      }),
    })

    expect(res.status).toBe(200)
    const body = await res.json() as { ok: boolean; sessionId?: string }
    expect(body.ok).toBe(true)
    console.log('[respondente] session via API:', body.sessionId)

    // Verifica no banco
    const { data } = await supabase
      .from('response_sessions')
      .select('id, community_id, user_id')
      .eq('community_id', 'raizeducacao')
      .eq('user_id', userId)
      .limit(1)

    expect(data?.length).toBe(1)
  })

  test('Survey slug inválido exibe tela de erro', async ({ page }) => {
    await page.goto('/p/survey-nao-existe-404')
    await page.waitForLoadState('networkidle')
    await expect(
      page.locator('text=não encontrada').or(page.locator('text=Erro').or(page.locator('text=erro')))
    ).toBeVisible({ timeout: 8_000 })
  })

  test('submit duplicado retorna 200 com duplicate:true (idempotência)', async () => {
    const userId = `pw-idem-test-${Date.now()}`
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    )
    const { data: questions } = await supabase
      .from('questions')
      .select('id, key, type')
      .eq('survey_id', '83c7556d-d0af-4815-8bc8-38059d50ac21')
      .order('order_index')

    const answers: Record<string, unknown> = {}
    for (const q of questions ?? []) {
      if (q.type === 'nps')    answers[q.key] = { nps: 8, participa_bilingue: 'Não' }
      if (q.type === 'scale')  answers[q.key] = { 0: 4, 1: 4, 2: 4, 3: 4, 4: 4 }
      if (q.type === 'welcome') answers[q.key] = true
    }

    const payload = {
      communityId: 'raizeducacao',
      userId,
      accountId:   userId,
      perfil:      'responsavel',
      answers,
    }

    // Primeira submissão — deve criar
    const res1 = await fetch('http://localhost:3000/api/surveys/csat/submit', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    expect(res1.status).toBe(200)
    const body1 = await res1.json() as { ok?: boolean; duplicate?: boolean }
    expect(body1.ok).toBe(true)

    // Segunda submissão — deve retornar duplicate:true sem erro
    const res2 = await fetch('http://localhost:3000/api/surveys/csat/submit', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    expect(res2.status).toBe(200)
    const body2 = await res2.json() as { ok?: boolean; duplicate?: boolean }
    expect(body2.duplicate).toBe(true)
  })

  test('survey encerrada mostra tela Encerrada', async ({ page }) => {
    await page.goto('/p/csat?status=encerrada&closeDate=2026-01-01&communityId=raizeducacao')
    await page.waitForLoadState('networkidle')
    await expect(
      page.locator('text=encerrada, text=Encerrada').first()
        .or(page.locator('[data-testid="encerrada"]').first())
    ).toBeVisible({ timeout: 10_000 })
  })

  test('survey não aberta mostra tela Não Aberta', async ({ page }) => {
    await page.goto('/p/csat?status=nao_aberta&openDate=2099-01-01&communityId=raizeducacao')
    await page.waitForLoadState('networkidle')
    await expect(
      page.locator('text=aberta, text=Aberta').first()
        .or(page.locator('text=2099').first())
        .or(page.locator('[data-testid="nao_aberta"]').first())
    ).toBeVisible({ timeout: 10_000 })
  })

})
