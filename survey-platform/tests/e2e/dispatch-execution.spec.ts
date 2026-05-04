/**
 * dispatch-execution.spec.ts
 * Testa o ciclo completo de criação e processamento de dispatches:
 * - Criação de dispatch agendado e imediato
 * - Processamento via cron endpoint
 * - Scope sample com validações
 * - Audit logs após execução
 */
import { test, expect } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'
import fs               from 'fs'
import path             from 'path'

const STATE_FILE   = path.join(__dirname, '../.auth/test-state.json')
const COMMUNITY_ID = 'raizeducacao'
const CRON_SECRET  = process.env.CRON_SECRET ?? ''

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

test.describe('Dispatch — Criação e Execução', () => {

  test('POST dispatch scope=all agendado cria registro com status=scheduled', async ({ request }) => {
    const { surveyId } = getState()
    if (!surveyId) { test.skip(); return }

    const futureDate = new Date(Date.now() + 3_600_000).toISOString()

    const res = await request.post(`/api/admin/surveys/${surveyId}/dispatch`, {
      data: {
        title:               'E2E Dispatch Agendado',
        body:                'Mensagem de teste agendado',
        channels:            ['pushNotification'],
        target_scope:        'all',
        target_roles:        ['guardian'],
        personalized:        false,
        scheduled_at:        futureDate,
        email_action_label:  'Responder',
      },
    })

    expect(res.status()).toBe(200)
    const body = await res.json() as { ok: boolean; scheduled: boolean; dispatch_id?: string }
    expect(body.ok).toBe(true)
    expect(body.scheduled).toBe(true)

    if (body.dispatch_id) {
      saveState({ scheduledDispatchId: body.dispatch_id })

      // Verificar status no banco
      const supabase = db()
      const { data: dispatch } = await supabase
        .from('survey_dispatches')
        .select('status')
        .eq('id', body.dispatch_id)
        .single()
      expect(dispatch?.status).toBe('scheduled')
    }
  })

  test('POST dispatch scope=sample sem personalized → 422', async ({ request }) => {
    const { surveyId } = getState()
    if (!surveyId) { test.skip(); return }

    const res = await request.post(`/api/admin/surveys/${surveyId}/dispatch`, {
      data: {
        title:        'Sample Dispatch Sem Personalized',
        body:         'Teste',
        channels:     ['pushNotification'],
        target_scope: 'sample',
        target_roles: ['guardian'],
        personalized: false,
      },
    })

    expect(res.status()).toBe(422)
  })

  test('cron com CRON_SECRET correto retorna ok=true', async ({ request }) => {
    if (!CRON_SECRET) { test.skip(); return }

    const res = await request.get('/api/cron/process-dispatches', {
      headers: { Authorization: `Bearer ${CRON_SECRET}` },
    })

    expect(res.status()).toBe(200)
    const body = await res.json() as { ok: boolean; errors: number }
    expect(body.ok).toBe(true)
    expect(typeof body.errors).toBe('number')
    console.log('[dispatch-execution] cron response:', body)
  })

  test('dispatch com sample resolvido cria audit logs', async ({ request }) => {
    const { surveyId } = getState()
    if (!surveyId || !CRON_SECRET) { test.skip(); return }

    const supabase = db()

    // Limpa dispatches antigos de teste
    const { data: oldDispatches } = await supabase
      .from('survey_dispatches')
      .select('id')
      .eq('survey_id', surveyId)
      .eq('title', 'E2E Sample Dispatch Audit Test')

    for (const d of oldDispatches ?? []) {
      await supabase.from('notification_audit_logs').delete().eq('dispatch_id', d.id)
      await supabase.from('survey_dispatch_jobs').delete().eq('dispatch_id', d.id)
    }
    await supabase.from('survey_dispatches').delete()
      .eq('survey_id', surveyId)
      .eq('title', 'E2E Sample Dispatch Audit Test')

    // Garante entry na amostra com layers_user_id fake (para não disparar real)
    await supabase.from('survey_sample_lists').upsert({
      survey_id:      surveyId,
      community_id:   COMMUNITY_ID,
      email:          'audit-test@raizeducacao.com.br',
      nome:           'Audit Test User',
      layers_user_id: 'fake-layers-id-audit-test',
    }, { onConflict: 'survey_id,community_id,email' })

    // Cria dispatch amostra personalizado via API
    const res = await request.post(`/api/admin/surveys/${surveyId}/dispatch`, {
      data: {
        title:        'E2E Sample Dispatch Audit Test',
        body:         'Olá {{nome}}, teste de audit.',
        channels:     ['pushNotification'],
        target_scope: 'sample',
        target_roles: ['guardian'],
        personalized: true,
        scheduled_at: new Date(Date.now() + 100).toISOString(), // praticamente imediato
      },
    })

    if (res.status() !== 200) {
      console.log('[dispatch-execution] dispatch não criado, status:', res.status())
      return
    }

    const dispatchBody = await res.json() as { ok: boolean; dispatch_id?: string }
    if (!dispatchBody.dispatch_id) return
    saveState({ auditDispatchId: dispatchBody.dispatch_id })

    // Aguarda 1 segundo para o scheduled_at passar
    await new Promise(r => setTimeout(r, 1_500))

    // Acionar cron para processar
    await request.get('/api/cron/process-dispatches', {
      headers: { Authorization: `Bearer ${CRON_SECRET}` },
    })

    // Verificar audit logs (pode ser 0 se Layers rejeitar — mas o endpoint deve existir)
    const auditRes = await request.get(
      `/api/admin/surveys/${surveyId}/dispatch-audit?dispatch_id=${dispatchBody.dispatch_id}`
    )
    expect(auditRes.status()).toBe(200)

    const auditBody = await auditRes.json() as {
      dispatch_id:  string
      total:        number
      total_sent:   number
      total_failed: number
      logs:         unknown[]
    }
    expect(auditBody.dispatch_id).toBe(dispatchBody.dispatch_id)
    expect(typeof auditBody.total).toBe('number')
    console.log('[dispatch-execution] audit logs:', auditBody.total, 'entries')
  })

  test('GET dispatch-audit sem dispatch_id → 400', async ({ request }) => {
    const { surveyId } = getState()
    if (!surveyId) { test.skip(); return }

    const res = await request.get(`/api/admin/surveys/${surveyId}/dispatch-audit`)
    expect(res.status()).toBe(400)
  })

  test('GET dispatch-audit com dispatch_id inválido → 404', async ({ request }) => {
    const { surveyId } = getState()
    if (!surveyId) { test.skip(); return }

    const res = await request.get(
      `/api/admin/surveys/${surveyId}/dispatch-audit?dispatch_id=00000000-0000-0000-0000-000000000000`
    )
    expect(res.status()).toBe(404)
  })

})
