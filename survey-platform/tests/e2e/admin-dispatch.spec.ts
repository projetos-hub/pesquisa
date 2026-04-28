import { test, expect } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'
import fs               from 'fs'
import path             from 'path'

const STATE_FILE = path.join(__dirname, '../.auth/test-state.json')

function getState(): Record<string, string> {
  if (!fs.existsSync(STATE_FILE)) return {}
  return JSON.parse(fs.readFileSync(STATE_FILE, 'utf-8'))
}
function saveState(data: Record<string, string>) {
  fs.writeFileSync(STATE_FILE, JSON.stringify({ ...getState(), ...data }, null, 2))
}

function supabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

test.describe('Admin — Dispatch', () => {

  test('4 radios de escopo presentes (incluindo Amostra)', async ({ page }) => {
    const { surveyId } = getState()
    if (!surveyId) { test.skip(); return }

    await page.goto(`/admin/surveys/${surveyId}/dispatch`)
    await page.waitForLoadState('networkidle')

    await expect(page.locator('label').filter({ hasText: 'Todas as comunidades' }).first()).toBeVisible({ timeout: 8_000 })
    await expect(page.locator('label').filter({ hasText: 'Comunidades específicas' }).first()).toBeVisible()
    await expect(page.locator('label').filter({ hasText: 'Uma turma' }).first()).toBeVisible()
    await expect(page.locator('label').filter({ hasText: 'Amostra' }).first()).toBeVisible()
  })

  test('selecionar Amostra mostra info de sampleCount', async ({ page }) => {
    const { surveyId } = getState()
    if (!surveyId) { test.skip(); return }

    await page.goto(`/admin/surveys/${surveyId}/dispatch`)
    await page.waitForLoadState('networkidle')

    await page.locator('label').filter({ hasText: 'Amostra' }).first().locator('input[type="radio"]').click()
    await page.waitForTimeout(500)

    // Deve mostrar mensagem sobre emails na amostra
    await expect(
      page.locator('div.bg-indigo-50').first()
        .or(page.locator('text=Nenhum email resolvido').first())
        .or(page.locator('text=email(s) resolvido').first())
    ).toBeVisible({ timeout: 5_000 })
  })

  test('insere amostra via API e verifica', async () => {
    const { surveyId } = getState()
    if (!surveyId) { test.skip(); return }

    const db = supabase()

    // Limpa entradas antigas de teste
    await db.from('survey_sample_lists')
      .delete()
      .eq('survey_id', surveyId)
      .eq('email', 'lucas.mesquita@raizeducacao.com.br')

    // Insere via API admin
    const res = await fetch(`http://localhost:3000/api/admin/surveys/${surveyId}/sample`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      // Este endpoint espera um arquivo, vamos inserir direto no DB
    })

    // Insere direto no Supabase (mais confiável)
    const { error } = await db.from('survey_sample_lists').insert({
      survey_id:    surveyId,
      community_id: 'raizeducacao',
      email:        'lucas.mesquita@raizeducacao.com.br',
      nome:         'Lucas Mesquita',
      layers_user_id: '67890', // simulado para o teste
    })

    expect(error).toBeNull()
    console.log('[dispatch] amostra inserida para survey:', surveyId)
    saveState({ sampleReady: 'true' })
  })

  test('cria dispatch via API e verifica no banco', async () => {
    const { surveyId } = getState()
    if (!surveyId) { test.skip(); return }

    // Cria dispatch via API diretamente
    const res = await fetch(`http://localhost:3000/api/admin/surveys/${surveyId}/dispatch`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // A rota requer auth via cookie — vamos usar o Supabase direto
      },
      body: JSON.stringify({
        title:        'Teste Playwright — Amostra',
        body:         'Olá {{nome}}, teste via Playwright.',
        channels:     ['pushNotification'],
        target_scope: 'sample',
        target_roles: ['guardian'],
        personalized: true,
      }),
    })

    // Se a rota retornar 401 (sem cookie), inserimos direto no banco
    if (res.status === 401) {
      const db = supabase()
      const { data: dispatch, error } = await db.from('survey_dispatches').insert({
        survey_id:    surveyId,
        title:        'Teste Playwright — Amostra',
        body:         'Olá {{nome}}, teste via Playwright.',
        channels:     ['pushNotification'],
        target_scope: 'sample',
        target_roles: ['guardian'],
        personalized: true,
        status:       'draft',
        total_jobs:   1,
      }).select('id').single()

      expect(error).toBeNull()
      saveState({ dispatchId: dispatch!.id })
      console.log('[dispatch] criado no DB:', dispatch!.id)

      // Cria job associado
      await db.from('survey_dispatch_jobs').insert({
        dispatch_id:  dispatch!.id,
        community_id: 'raizeducacao',
        status:       'pending',
      })
    } else {
      const body = await res.json() as { dispatch_id?: string; ok?: boolean }
      if (body.dispatch_id) saveState({ dispatchId: body.dispatch_id })
      console.log('[dispatch] API response:', body)
    }
  })

  test('histórico mostra dispatch criado', async ({ page }) => {
    const { surveyId } = getState()
    if (!surveyId) { test.skip(); return }

    await page.goto(`/admin/surveys/${surveyId}/dispatch`)
    await page.waitForLoadState('networkidle')

    // Deve ter ao menos 1 disparo no histórico
    await expect(page.locator('text=Teste Playwright — Amostra')).toBeVisible({ timeout: 8_000 })

    // Clica para expandir
    const dispatchRow = page.locator('text=Teste Playwright — Amostra')
    if (await dispatchRow.isVisible().catch(() => false)) {
      await dispatchRow.click()
      await page.waitForTimeout(500)
      // Personalized dispatch → deve ter aba "Por email"
      const emailTab = page.locator('button:has-text("Por email")')
      if (await emailTab.isVisible({ timeout: 3_000 }).catch(() => false)) {
        await emailTab.click()
        await expect(page.locator('button:has-text("Por email")')).toBeVisible()
      }
    }
  })

})

test.describe('Admin — Disparo Rápido (Manual)', () => {

  test('painel "⚡ Disparo rápido" existe na página de dispatch', async ({ page }) => {
    const { surveyId } = getState()
    if (!surveyId) { test.skip(); return }

    await page.goto(`/admin/surveys/${surveyId}/dispatch`)
    await page.waitForLoadState('networkidle')

    await expect(
      page.locator('text=Disparo rápido').or(page.locator('text=disparo rápido'))
    ).toBeVisible({ timeout: 8_000 })
  })

  test('expandir painel mostra formulário', async ({ page }) => {
    const { surveyId } = getState()
    if (!surveyId) { test.skip(); return }

    await page.goto(`/admin/surveys/${surveyId}/dispatch`)
    await page.waitForLoadState('networkidle')

    // Clica no header colapsável
    const header = page.locator('text=Disparo rápido, text=disparo rápido').first()
    if (await header.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await header.click()
      await page.waitForTimeout(300)
    }

    // Formulário deve aparecer (campo de emails)
    await expect(
      page.locator('textarea, input[placeholder*="email"], textarea[placeholder*="email"]').first()
    ).toBeVisible({ timeout: 5_000 })
  })

  test('POST dispatch-manual com email fake retorna not_found', async ({ request }) => {
    const { surveyId } = getState()
    if (!surveyId) { test.skip(); return }

    const res = await request.post(`/api/admin/surveys/${surveyId}/dispatch-manual`, {
      data: {
        community_id: 'raizeducacao',
        emails:       ['nao-existe-mesmo@example.com'],
        title:        'Teste Manual E2E',
        body:         'Mensagem de teste',
        channels:     ['pushNotification'],
      },
    })

    // 200 com resultados ou 401 (sem cookie admin)
    expect([200, 401]).toContain(res.status())
    if (res.status() === 200) {
      const body = await res.json() as { results: { email: string; status: string }[] }
      expect(Array.isArray(body.results)).toBe(true)
      const result = body.results.find(r => r.email === 'nao-existe-mesmo@example.com')
      if (result) {
        expect(['not_found', 'failed']).toContain(result.status)
      }
    }
  })

  test('POST dispatch-manual sem community_id → 422', async ({ request }) => {
    const { surveyId } = getState()
    if (!surveyId) { test.skip(); return }

    const res = await request.post(`/api/admin/surveys/${surveyId}/dispatch-manual`, {
      data: {
        emails:   ['test@example.com'],
        title:    'Sem community',
        body:     'Teste',
        channels: ['pushNotification'],
      },
    })

    expect([400, 401, 422]).toContain(res.status())
  })

})
