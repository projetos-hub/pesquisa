/**
 * Playbook Screenshot Capture
 * Roda contra a Vercel (live) e captura screenshots para o playbook operacional.
 * Output: docs/playbook-screenshots/
 *
 * Run: npx playwright test --config=playwright.playbook.config.ts
 */

import { test, chromium } from '@playwright/test'
import path from 'path'
import fs   from 'fs'

const APP   = 'https://pesquisa-nu-sand.vercel.app'
const OUT   = path.resolve(__dirname, '../../../docs/playbook-screenshots')
const AUTH  = path.resolve(__dirname, '../.auth/playbook.json')
const EMAIL = process.env.PLAYBOOK_EMAIL    ?? 'lucas.mesquita@raizeducacao.com.br'
const PASS  = process.env.PLAYBOOK_PASSWORD ?? ''

async function shot(page: import('@playwright/test').Page, name: string) {
  await page.waitForLoadState('networkidle').catch(() => {})
  await page.waitForTimeout(600)
  await page.screenshot({ path: path.join(OUT, `${name}.png`), fullPage: false })
  console.log(`✓ ${name}.png`)
}

test.describe.configure({ mode: 'serial' })

test('capturar screenshots do playbook', async () => {
  fs.mkdirSync(OUT, { recursive: true })

  const browser = await chromium.launch({ headless: false, slowMo: 150 })

  if (!PASS) throw new Error('Defina PLAYBOOK_PASSWORD no .env.local')

  // ── BLOCO A: Login — screenshot + gerar sessão ───────────────────────────
  const ctxLogin  = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  const pageLogin = await ctxLogin.newPage()

  await pageLogin.goto(`${APP}/admin/login`)
  await pageLogin.waitForLoadState('networkidle')
  await shot(pageLogin, '01-login')

  await pageLogin.fill('input[type="email"]',    EMAIL)
  await pageLogin.fill('input[type="password"]', '••••••••')
  await shot(pageLogin, '01b-login-preenchido')

  // Login real para gerar sessão
  await pageLogin.fill('input[type="password"]', PASS)
  await pageLogin.click('button[type="submit"]')
  await pageLogin.waitForURL(`${APP}/admin**`, { timeout: 20_000 })
  await ctxLogin.storageState({ path: AUTH })
  await ctxLogin.close()
  console.log('✓ sessão salva')

  // ── BLOCO B: Admin (storageState fresco) ─────────────────────────────────
  const ctx  = await browser.newContext({
    viewport:     { width: 1440, height: 900 },
    storageState: AUTH,
  })
  const page = await ctx.newPage()

  // ── 02 LISTAGEM DE PESQUISAS ─────────────────────────────────────────────
  await page.goto(`${APP}/admin/surveys`)
  await page.waitForLoadState('networkidle')
  await shot(page, '02-painel-visao-geral')

  // ── 03 BOTÃO CRIAR PESQUISA ──────────────────────────────────────────────
  await shot(page, '03-criar-pesquisa-botao')

  // ── 04 FORMULÁRIO DE CRIAÇÃO ─────────────────────────────────────────────
  await page.goto(`${APP}/admin/surveys/new`)
  await page.waitForLoadState('networkidle')
  await shot(page, '04-criar-pesquisa-form')

  // ── EXTRAIR surveyId da primeira pesquisa ────────────────────────────────
  await page.goto(`${APP}/admin/surveys`)
  await page.waitForLoadState('networkidle')

  const firstHref = await page.locator('a[href^="/admin/surveys/"]').first().getAttribute('href', { timeout: 5000 }).catch(() => null)
  const surveyId  = firstHref?.match(/\/admin\/surveys\/([^/]+)/)?.[1] ?? ''
  console.log(`surveyId: ${surveyId}`)

  if (!surveyId) {
    console.error('Não foi possível extrair surveyId — abortando screenshots de sub-páginas')
  } else {
    // ── 05 PAINEL DA PESQUISA ──────────────────────────────────────────────
    await page.goto(`${APP}/admin/surveys/${surveyId}`)
    await page.waitForLoadState('networkidle')
    await shot(page, '05-painel-pesquisa')

    // ── 06 FORM NOVA PERGUNTA ──────────────────────────────────────────────
    const addBtn = page.locator('button:has-text("Adicionar pergunta")')
    await addBtn.scrollIntoViewIfNeeded().catch(() => {})
    if (await addBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await addBtn.click()
      await page.waitForTimeout(500)
      await shot(page, '06-nova-pergunta-form')
      await page.keyboard.press('Escape')
      await page.waitForTimeout(300)
    }

    // ── 07 EDITAR PESQUISA (status, datas) ────────────────────────────────
    // O SurveyEditForm fica inline na página — scroll até ele
    const editForm = page.locator('form').filter({ hasText: 'Salvar alterações' })
    await editForm.scrollIntoViewIfNeeded().catch(() => {})
    await page.waitForTimeout(400)
    await shot(page, '07-editar-pesquisa-status-datas')

    // ── 08 INSTALAR EM COMUNIDADE (topo da página de communities) ──────────
    await page.goto(`${APP}/admin/surveys/${surveyId}/communities`)
    await page.waitForLoadState('networkidle')
    await page.evaluate(() => window.scrollTo(0, 0))
    await shot(page, '08-instalar-comunidade')

    // ── 09 IDENTIDADE VISUAL (editor de tema — scroll para baixo) ──────────
    const themeEditor = page.locator('text=Identidade Visual').first()
    await themeEditor.scrollIntoViewIfNeeded().catch(() => {})
    await page.waitForTimeout(400)
    await shot(page, '09-identidade-visual')

    // ── 10 DISPAROS — visão geral ─────────────────────────────────────────
    await page.goto(`${APP}/admin/surveys/${surveyId}/dispatch`)
    await page.waitForLoadState('networkidle')
    await page.evaluate(() => window.scrollTo(0, 0))
    await shot(page, '10-disparos-visao-geral')

    // ── 11 RÉGUA — form de configuração ──────────────────────────────────
    const reguaTitle = page.locator('h3:has-text("Régua"), h3:has-text("régua"), h2:has-text("Régua")').first()
    await reguaTitle.scrollIntoViewIfNeeded().catch(() => {})
    await page.waitForTimeout(400)
    await shot(page, '11-disparos-regua-form')

    // ── 12 RÉGUA — passos (scroll mais para baixo) ────────────────────────
    await page.evaluate(() => window.scrollBy(0, 500))
    await page.waitForTimeout(400)
    await shot(page, '12-disparos-regua-passos')

    // ── 13 DISPARO RÁPIDO (ManualDispatch — final da página) ─────────────
    const manualTitle = page.locator('h2:has-text("Disparo Rápido"), h3:has-text("Disparo Rápido")').first()
    await manualTitle.scrollIntoViewIfNeeded().catch(async () => {
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
    })
    await page.waitForTimeout(400)
    await shot(page, '13-disparo-rapido')

    // ── 14 AMOSTRA SEGMENTADA ─────────────────────────────────────────────
    await page.goto(`${APP}/admin/surveys/${surveyId}/sample`)
    await page.waitForLoadState('networkidle')
    await shot(page, '14-amostra-segmentada')

    // ── 15 RESPOSTAS ──────────────────────────────────────────────────────
    await page.goto(`${APP}/admin/surveys/${surveyId}/responses`)
    await page.waitForLoadState('networkidle')
    await shot(page, '15-respostas-tabela')
  }

  // ── 16 COMUNIDADES GLOBAL ─────────────────────────────────────────────────
  await page.goto(`${APP}/admin/communities`)
  await page.waitForLoadState('networkidle')
  await shot(page, '16-comunidades-global')

  const editThemeBtn = page.locator('button:has-text("Editar"), button:has-text("Configurar"), button:has-text("Ver tema")').first()
  if (await editThemeBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
    await editThemeBtn.click()
    await page.waitForTimeout(600)
    await shot(page, '17-editor-tema-global')
    await page.keyboard.press('Escape')
  }

  // ── 17 EXPORTAR ────────────────────────────────────────────────────────────
  await page.goto(`${APP}/admin/export`)
  await page.waitForLoadState('networkidle')
  await shot(page, '18-exportar')

  // ── 18 RESPONDENTE (portal sem contexto Layers) ───────────────────────────
  await page.goto(`${APP}/portal`)
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(1000)
  await shot(page, '19-respondente-portal')

  await ctx.close()
  await browser.close()
  console.log(`\n✅ Screenshots salvas em: ${OUT}`)
})
