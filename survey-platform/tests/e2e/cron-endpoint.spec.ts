import { expect, test } from '@playwright/test'

test.describe('Cron endpoint', () => {
  test('sem Authorization retorna 401', async ({ request }) => {
    const res = await request.get('/api/cron/process-dispatches')
    expect(res.status()).toBe(401)
  })

  test('com Authorization errado retorna 401', async ({ request }) => {
    const res = await request.get('/api/cron/process-dispatches', {
      headers: { Authorization: 'Bearer token-errado' },
    })
    expect(res.status()).toBe(401)
  })

  test('com CRON_SECRET correto retorna 200 quando habilitado explicitamente', async ({ request }) => {
    const secret = process.env.CRON_SECRET
    if (!secret || process.env.RUN_CRON_E2E !== 'true') test.skip()

    const res = await request.get('/api/cron/process-dispatches', {
      headers: { Authorization: `Bearer ${secret}` },
      timeout: 15_000,
    })
    expect(res.status()).toBe(200)

    const body = await res.json() as { ok: boolean; errors: number }
    expect(body.ok).toBe(true)
    expect(typeof body.errors).toBe('number')
  })
})
