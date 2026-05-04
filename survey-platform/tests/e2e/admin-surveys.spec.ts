import { test, expect } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'
import fs               from 'fs'
import path             from 'path'

const STATE_FILE = path.join(__dirname, '../.auth/test-state.json')

function saveState(data: Record<string, string>) {
  const existing = fs.existsSync(STATE_FILE) ? JSON.parse(fs.readFileSync(STATE_FILE, 'utf-8')) : {}
  fs.writeFileSync(STATE_FILE, JSON.stringify({ ...existing, ...data }, null, 2))
}

test.describe('Admin — Surveys', () => {

  test('lista surveys existentes', async ({ page }) => {
    await page.goto('/admin/surveys')
    await page.waitForLoadState('networkidle')
    // Verifica que a tabela de surveys carregou
    await expect(page.locator('table, [role="table"]').first()).toBeVisible({ timeout: 10_000 })
    // Deve ter ao menos a CSAT
    await expect(page.locator('a[href*="/admin/surveys/"]').first()).toBeVisible()
  })

  test('cria survey TESTE Playwright 2026 via API', async ({ page }) => {
    // Cria via Supabase direto (mais confiável que UI para esta etapa)
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    )

    // Remove survey antiga se existir
    await supabase.from('surveys').delete().eq('slug', 'teste-playwright-2026')

    const { data: survey, error } = await supabase
      .from('surveys')
      .insert({
        title:       'TESTE Playwright 2026',
        slug:        'teste-playwright-2026',
        survey_type: 'quantitativa',
        status:      'ativa',
        target_roles: ['guardian'],
      })
      .select('id, slug')
      .single()

    expect(error).toBeNull()
    expect(survey?.slug).toBe('teste-playwright-2026')
    saveState({ surveyId: survey!.id })
    console.log('[admin-surveys] Survey criada:', survey!.id)

    // Instala community raizeducacao
    await supabase.from('survey_communities').upsert({
      survey_id:    survey!.id,
      community_id: 'raizeducacao',
      status:       'ativa',
      active:       true,
      theme:        { nomeEscola: 'Raiz Educação' },
    })

    // Verifica na UI
    await page.goto(`/admin/surveys/${survey!.id}`)
    await page.waitForLoadState('networkidle')
    await expect(page.locator('text=TESTE Playwright 2026').first()).toBeVisible({ timeout: 8_000 })
  })

})
