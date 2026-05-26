/**
 * cron-endpoint.spec.ts
 * Valida que o endpoint de cron autentica corretamente
 */
import { test, expect } from '@playwright/test'

test.describe('Cron endpoint', () => {

  test('sem Authorization → 401', async ({ request }) => {
    const res = await request.get('/api/cron/process-dispatches')
    expect(res.status()).toBe(401)
  })

  test('com Authorization errado → 401', async ({ request }) => {
    const res = await request.get('/api/cron/process-dispatches', {
      headers: { Authorization: 'Bearer token-errado' },
    })
    expect(res.status()).toBe(401)
  })

  test('com CRON_SECRET correto → 200', async ({ request }) => {
    const secret = process.env.CRON_SECRET
    if (!secret) test.skip()

    const res = await request.get('/api/cron/process-dispatches', {
      headers: { Authorization: `Bearer ${secret}` },
    })
    expect(res.status()).toBe(200)

    const body = await res.json() as { ok: boolean; errors: number }
    expect(body.ok).toBe(true)
    expect(body.errors).toBe(0)
    console.log('[cron] response:', body)
  })

})
