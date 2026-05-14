/**
 * Playbook Screenshot Capture
 * Roda contra localhost:3000 (dev server) usando admin.json gerado pelo setup.
 * Output: docs/playbook-screenshots/
 *
 * Pré-requisito: npx playwright test --project=setup --config=playwright.config.ts
 * Run:           npx playwright test --config=playwright.playbook.config.ts
 */

import { test, chromium } from '@playwright/test'
import path from 'path'
import fs   from 'fs'

const APP  = process.env.PLAYBOOK_URL ?? 'http://localhost:3000'
const OUT  = path.resolve(__dirname, '../../../docs/playbook-screenshots')
const AUTH = path.resolve(__dirname, '../.auth/admin.json')
const NAV  = { waitUntil: 'domcontentloaded' as const, timeout: 20_000 }

async function goto(page: import('@playwright/test').Page, url: string) {
  await page.goto(url, NAV).catch(() => page.goto(url, { waitUntil: 'commit', timeout: 20_000 }).catch(() => {}))
  await page.waitForTimeout(800)
}

async function shot(page: import('@playwright/test').Page, name: string) {
  await page.waitForTimeout(400)
  await page.screenshot({ path: path.join(OUT, `${name}.png`), fullPage: false })
  console.log(`✓ ${name}.png`)
}

test.describe.configure({ mode: 'serial' })

test('capturar screenshots do playbook', async () => {
  if (!fs.existsSync(AUTH)) {
    throw new Error(`admin.json não encontrado em ${AUTH}.\nRode: npx playwright test --project=setup --config=playwright.config.ts`)
  }

  fs.mkdirSync(OUT, { recursive: true })
  const browser = await chromium.launch({ headless: true })

  // ── 01 Login (contexto limpo para screenshot da tela de login) ───────────
  const ctxLogin  = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  const pageLogin = await ctxLogin.newPage()
  await goto(pageLogin, `${APP}/admin/login`)
  await shot(pageLogin, '01-login')
  await pageLogin.fill('input[type="email"]',    'lucas.mesquita@raizeducacao.com.br')
  await pageLogin.fill('input[type="password"]', '••••••••')
  await shot(pageLogin, '01b-login-preenchido')
  await ctxLogin.close()

  // ── Contexto autenticado (usa admin.json do setup) ────────────────────────
  const ctx  = await browser.newContext({
    viewport:     { width: 1440, height: 900 },
    storageState: AUTH,
  })
  const page = await ctx.newPage()

  // ── 02 LISTAGEM DE PESQUISAS ─────────────────────────────────────────────
  await goto(page, `${APP}/admin/surveys`)
  await shot(page, '02-painel-visao-geral')

  // ── 03 BOTÃO CRIAR PESQUISA ──────────────────────────────────────────────
  await page.locator('a[href*="surveys/new"], button:has-text("Nova pesquisa")').first().evaluate(el => {
    ;(el as HTMLElement).style.outline = '3px solid #ef4444'
    ;(el as HTMLElement).style.outlineOffset = '3px'
    ;(el as HTMLElement).style.boxShadow = '0 0 0 8px rgba(239,68,68,0.25)'
  })
  await page.waitForTimeout(200)
  await shot(page, '03-criar-pesquisa-botao')

  // ── 04 FORMULÁRIO DE CRIAÇÃO ─────────────────────────────────────────────
  await goto(page, `${APP}/admin/surveys/new`)
  await shot(page, '04-criar-pesquisa-form')

  // ── EXTRAIR surveyId da primeira pesquisa ────────────────────────────────
  await goto(page, `${APP}/admin/surveys`)
  const firstHref = await page.locator('a:has-text("Editar")').first().getAttribute('href', { timeout: 5000 }).catch(() => null)
  const surveyId  = firstHref?.match(/\/admin\/surveys\/([^/]+)/)?.[1] ?? ''
  console.log(`surveyId: ${surveyId}`)

  if (!surveyId) {
    console.error('Não foi possível extrair surveyId — abortando screenshots de sub-páginas')
  } else {
    // ── 05 PAINEL DA PESQUISA ──────────────────────────────────────────────
    await goto(page, `${APP}/admin/surveys/${surveyId}`)
    await shot(page, '05-painel-pesquisa')

    // ── 06 FORM NOVA PERGUNTA ──────────────────────────────────────────────
    const addBtn = page.locator('button:has-text("Adicionar pergunta")')
    await addBtn.scrollIntoViewIfNeeded({ timeout: 3000 }).catch(() => {})
    if (await addBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await addBtn.click()
      await page.waitForTimeout(500)
      await shot(page, '06-nova-pergunta-form')
      await page.keyboard.press('Escape')
      await page.waitForTimeout(300)
    }

    // ── 07 EDITAR PESQUISA (status, datas) ────────────────────────────────
    const editForm = page.locator('form').filter({ hasText: 'Salvar alterações' })
    await editForm.scrollIntoViewIfNeeded({ timeout: 3000 }).catch(() => {})
    await page.waitForTimeout(400)
    await shot(page, '07-editar-pesquisa-status-datas')

    // ── 08 INSTALAR EM COMUNIDADE ─────────────────────────────────────────
    await goto(page, `${APP}/admin/surveys/${surveyId}`)
    const installInput = page.locator('input[placeholder*="comunidade"], input[placeholder*="ID"]').first()
    await installInput.scrollIntoViewIfNeeded({ timeout: 3000 }).catch(async () => {
      await page.evaluate(() => window.scrollBy(0, 400))
    })
    await page.waitForTimeout(400)
    await shot(page, '08-instalar-comunidade')

    // ── 09 IDENTIDADE VISUAL ──────────────────────────────────────────────
    await goto(page, `${APP}/admin/surveys/${surveyId}/communities`)
    await page.evaluate(() => window.scrollTo(0, 0))
    await page.waitForTimeout(400)
    await shot(page, '09-identidade-visual')

    // ── 10 DISPAROS — visão geral ─────────────────────────────────────────
    await goto(page, `${APP}/admin/surveys/${surveyId}/dispatch`)
    await page.evaluate(() => window.scrollTo(0, 0))
    await shot(page, '10-disparos-visao-geral')

    // ── 11 RÉGUA — form de configuração ──────────────────────────────────
    const reguaTitle = page.locator('h3:has-text("Régua"), h3:has-text("régua"), h2:has-text("Régua")').first()
    await reguaTitle.scrollIntoViewIfNeeded({ timeout: 3000 }).catch(() => {})
    await page.waitForTimeout(400)
    await shot(page, '11-disparos-regua-form')

    // ── 12 RÉGUA — ativar régua para mostrar passos ───────────────────────
    await goto(page, `${APP}/admin/surveys/${surveyId}/dispatch`)
    const reguaLabel = page.locator('text=Ativar régua').first()
    await reguaLabel.scrollIntoViewIfNeeded({ timeout: 3000 }).catch(() => {})
    await page.waitForTimeout(300)
    await reguaLabel.click({ timeout: 3000 }).catch(() => {})
    await page.waitForTimeout(800)
    await shot(page, '12-disparos-regua-passos')

    // ── 13 DISPARO RÁPIDO ─────────────────────────────────────────────────
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
    await page.waitForTimeout(400)
    const abrirBtn = page.locator('a:has-text("abrir"), button:has-text("abrir")').first()
    if (await abrirBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await abrirBtn.scrollIntoViewIfNeeded({ timeout: 2000 }).catch(() => {})
      await abrirBtn.click()
      await page.waitForTimeout(600)
    }
    await shot(page, '13-disparo-rapido')

    // ── 14 AMOSTRA SEGMENTADA ─────────────────────────────────────────────
    await goto(page, `${APP}/admin/surveys/${surveyId}/sample`)
    await shot(page, '14-amostra-segmentada')

    // ── 15 RESPOSTAS ──────────────────────────────────────────────────────
    await goto(page, `${APP}/admin/surveys/${surveyId}/responses`)
    await shot(page, '15-respostas-tabela')
  }

  // ── 16 COMUNIDADES GLOBAL ─────────────────────────────────────────────────
  await goto(page, `${APP}/admin/communities`)
  await shot(page, '16-comunidades-global')

  const editThemeBtn = page.locator('button:has-text("Editar"), button:has-text("Configurar"), button:has-text("Ver tema")').first()
  if (await editThemeBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
    await editThemeBtn.click()
    await page.waitForTimeout(400)
    await shot(page, '17-editor-tema-global')
    await page.keyboard.press('Escape')
  }

  // ── 18 EXPORTAR ────────────────────────────────────────────────────────────
  await goto(page, `${APP}/admin/export`)
  await shot(page, '18-exportar')

  // ── 19 RESPONDENTE (portal sem contexto Layers) ───────────────────────────
  await goto(page, `${APP}/portal`)
  await page.waitForTimeout(600)
  await shot(page, '19-respondente-portal')

  await browser.close()
  console.log(`\n✅ Screenshots salvas em: ${OUT}`)
})
