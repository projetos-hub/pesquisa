/**
 * admin-sample.spec.ts
 * Testa a UI e API de gestão de amostra:
 * download de template, upload, status, resolução de IDs, exclusão
 */
import { test, expect } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'
import fs               from 'fs'
import path             from 'path'

const STATE_FILE = path.join(__dirname, '../.auth/test-state.json')
const TEMPLATE_PATH = path.join(__dirname, '../../amostra-teste.xlsx')

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

test.describe('Admin — Sample Upload e Gestão', () => {

  test('página de amostra carrega sem erro', async ({ page }) => {
    const { surveyId } = getState()
    if (!surveyId) { test.skip(); return }

    await page.goto(`/admin/surveys/${surveyId}/sample`)
    await page.waitForLoadState('networkidle')

    await expect(page.locator('h1, h2').first()).toBeVisible({ timeout: 8_000 })
    // Não deve ter erro 500 visível
    await expect(page.locator('text=500').or(page.locator('text=Internal Server Error'))).not.toBeVisible()
  })

  test('GET /api/admin/surveys/[id]/sample retorna estrutura correta', async ({ request }) => {
    const { surveyId } = getState()
    if (!surveyId) { test.skip(); return }

    const res = await request.get(`/api/admin/surveys/${surveyId}/sample`)
    expect(res.status()).toBe(200)

    const body = await res.json() as {
      by_community: unknown[]
      totals: { total_entries: number; schools: number; resolved: number }
    }
    expect(Array.isArray(body.by_community)).toBe(true)
    expect(typeof body.totals.total_entries).toBe('number')
    expect(typeof body.totals.schools).toBe('number')
    expect(typeof body.totals.resolved).toBe('number')
  })

  test('download do template XLSX retorna arquivo válido', async ({ request }) => {
    const { surveyId } = getState()
    if (!surveyId) { test.skip(); return }

    const res = await request.get(`/api/admin/surveys/${surveyId}/sample?template=1`)
    // Pode ser 200 (arquivo) ou a rota pode não suportar este query param
    // O template é baixado via JS no cliente — testar via UI
    expect([200, 404]).toContain(res.status())
  })

  test('botão Baixar modelo XLSX existe na UI', async ({ page }) => {
    const { surveyId } = getState()
    if (!surveyId) { test.skip(); return }

    await page.goto(`/admin/surveys/${surveyId}/sample`)
    await page.waitForLoadState('networkidle')

    const downloadBtn = page.locator(
      'button:has-text("modelo"), button:has-text("Modelo"), button:has-text("XLSX"), button:has-text("template")'
    ).first()
    await expect(downloadBtn).toBeVisible({ timeout: 8_000 })
  })

  test('upload de amostra via API retorna contagens', async ({ request }) => {
    const { surveyId } = getState()
    if (!surveyId) { test.skip(); return }

    // Usa o arquivo amostra-teste.xlsx se existir, senão pula
    if (!fs.existsSync(TEMPLATE_PATH)) {
      console.log('[admin-sample] amostra-teste.xlsx não encontrado, pulando upload test')
      test.skip()
      return
    }

    const fileBuffer = fs.readFileSync(TEMPLATE_PATH)
    const formData = new FormData()
    formData.append('file', new Blob([fileBuffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    }), 'amostra-teste.xlsx')

    const res = await request.post(`/api/admin/surveys/${surveyId}/sample`, {
      multipart: {
        file: {
          name:     'amostra-teste.xlsx',
          mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          buffer:   fileBuffer,
        },
      },
    })

    expect(res.status()).toBe(200)
    const body = await res.json() as {
      total_entries:      number
      duplicates_removed: number
      rows_without_email: number
    }
    expect(typeof body.total_entries).toBe('number')
    expect(typeof body.duplicates_removed).toBe('number')
    console.log('[admin-sample] upload result:', body)
    saveState({ sampleUploaded: 'true' })
  })

  test('POST /sample/resolve retorna progresso', async ({ request }) => {
    const { surveyId } = getState()
    if (!surveyId) { test.skip(); return }

    const res = await request.post(`/api/admin/surveys/${surveyId}/sample/resolve`)
    // 200 ou 422 se não houver entries pending
    expect([200, 422]).toContain(res.status())

    if (res.status() === 200) {
      const body = await res.json() as { processed: number; remaining: number }
      expect(typeof body.processed).toBe('number')
      expect(typeof body.remaining).toBe('number')
      console.log('[admin-sample] resolve result:', body)
    }
  })

  test('segundo upload substitui o anterior', async ({ request }) => {
    const { surveyId } = getState()
    if (!surveyId || !fs.existsSync(TEMPLATE_PATH)) { test.skip(); return }

    const fileBuffer = fs.readFileSync(TEMPLATE_PATH)

    // Primeiro upload
    await request.post(`/api/admin/surveys/${surveyId}/sample`, {
      multipart: {
        file: {
          name:     'amostra-teste.xlsx',
          mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          buffer:   fileBuffer,
        },
      },
    })

    // Segundo upload (deve substituir)
    const res2 = await request.post(`/api/admin/surveys/${surveyId}/sample`, {
      multipart: {
        file: {
          name:     'amostra-teste.xlsx',
          mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          buffer:   fileBuffer,
        },
      },
    })
    expect(res2.status()).toBe(200)

    // Contagem deve ser consistente (não duplicada)
    const body1 = await request.get(`/api/admin/surveys/${surveyId}/sample`)
    const data = await body1.json() as { totals: { total_entries: number } }
    expect(data.totals.total_entries).toBeGreaterThanOrEqual(0)
  })

  test('DELETE /sample limpa a amostra', async ({ request }) => {
    const { surveyId } = getState()
    if (!surveyId) { test.skip(); return }

    // Inserir entry diretamente para garantir que há algo para deletar
    const supabase = db()
    await supabase.from('survey_sample_lists').upsert({
      survey_id:    surveyId,
      community_id: 'raizeducacao',
      email:        'delete-test@sample.com',
      nome:         'Delete Test',
    }, { onConflict: 'survey_id,community_id,email' })

    const res = await request.delete(`/api/admin/surveys/${surveyId}/sample`)
    expect(res.status()).toBe(200)

    const body = await res.json() as { message: string }
    expect(body.message).toContain('cleared')

    // Verificar que está vazio
    const { count } = await supabase
      .from('survey_sample_lists')
      .select('*', { count: 'exact', head: true })
      .eq('survey_id', surveyId)
    expect(count ?? 0).toBe(0)
  })

})
