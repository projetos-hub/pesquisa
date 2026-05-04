/**
 * global-setup.spec.ts
 * Autentica admin via /api/test-auth (dev-only) que seta sessão Supabase SSR via cookie
 */
import { test as setup, expect } from '@playwright/test'
import { createClient }          from '@supabase/supabase-js'
import path                      from 'path'
import fs                        from 'fs'

const AUTH_FILE   = path.join(__dirname, '../.auth/admin.json')
const ADMIN_EMAIL = 'lucas.mesquita@raizeducacao.com.br'

setup('autenticar admin via test-auth', async ({ page }) => {
  const dir = path.dirname(AUTH_FILE)
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })

  const supabaseUrl    = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
  const anonKey        = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!

  // 1. Gera magic link via service role
  const serviceClient = createClient(supabaseUrl, serviceRoleKey)
  const { data: linkData, error: linkErr } = await serviceClient.auth.admin.generateLink({
    type:  'magiclink',
    email: ADMIN_EMAIL,
  })
  if (linkErr || !linkData?.properties?.action_link) {
    throw new Error(`generateLink falhou: ${linkErr?.message}`)
  }

  // 2. Extrai token_hash da action_link e verifica OTP → session
  const actionUrl = new URL(linkData.properties.action_link)
  const tokenHash = actionUrl.searchParams.get('token')
  if (!tokenHash) throw new Error('token não encontrado na action_link')

  const anonClient = createClient(supabaseUrl, anonKey)
  const { data: otpData, error: otpErr } = await anonClient.auth.verifyOtp({
    type:       'magiclink',
    token_hash: tokenHash,
  })
  if (otpErr || !otpData?.session) {
    throw new Error(`verifyOtp falhou: ${otpErr?.message}`)
  }

  const { access_token, refresh_token } = otpData.session
  console.log('[setup] sessão obtida:', otpData.user?.email)

  // 3. Usa rota dev-only para setar sessão via Supabase SSR (define cookies corretos)
  const testAuthUrl = `http://localhost:3000/api/test-auth?access_token=${access_token}&refresh_token=${refresh_token}`
  await page.goto(testAuthUrl)

  // Aguarda redirect para /admin/surveys
  await page.waitForURL('**/admin/surveys', { timeout: 15_000 })

  await expect(page.locator('h2').filter({ hasText: 'Pesquisas' }).first()).toBeVisible({ timeout: 8_000 })

  await page.context().storageState({ path: AUTH_FILE })
  console.log('[setup] Auth salvo em', AUTH_FILE)
})
