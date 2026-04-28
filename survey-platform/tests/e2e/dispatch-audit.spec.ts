/**
 * dispatch-audit.spec.ts
 * Valida API GET /dispatch-audit e estrutura dos logs
 */
import { test, expect } from '@playwright/test'
import fs               from 'fs'
import path             from 'path'

const STATE_FILE = path.join(__dirname, '../.auth/test-state.json')

test.describe('Dispatch Audit API', () => {

  test('sem dispatch_id → 400', async ({ request }) => {
    const res = await request.get('/api/admin/surveys/invalid-id/dispatch-audit')
    expect([400, 401, 404]).toContain(res.status())
  })

  test('com dispatch_id válido retorna estrutura correta', async ({ request }) => {
    if (!fs.existsSync(STATE_FILE)) test.skip()

    const state = JSON.parse(fs.readFileSync(STATE_FILE, 'utf-8')) as Record<string, string>
    const { surveyId, dispatchId } = state
    if (!surveyId || !dispatchId) test.skip()

    const res = await request.get(
      `/api/admin/surveys/${surveyId}/dispatch-audit?dispatch_id=${dispatchId}`
    )
    expect(res.status()).toBe(200)

    const body = await res.json() as {
      dispatch_id:  string
      total:        number
      total_sent:   number
      total_failed: number
      logs:         unknown[]
    }

    expect(body.dispatch_id).toBe(dispatchId)
    expect(typeof body.total).toBe('number')
    expect(typeof body.total_sent).toBe('number')
    expect(typeof body.total_failed).toBe('number')
    expect(Array.isArray(body.logs)).toBe(true)

    console.log('[audit] total:', body.total, '| sent:', body.total_sent, '| failed:', body.total_failed)
  })

})
