/**
 * Audit Log API Test
 * Verifica estrutura e comportamento do endpoint GET /dispatch-audit
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl  = process.env.NEXT_PUBLIC_SUPABASE_URL    || ''
const supabaseKey  = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || ''
const adminToken   = process.env.TEST_ADMIN_TOKEN            || ''

describe('Dispatch Audit Log API', () => {
  let testSurveyId:   string
  let testDispatchId: string
  const COMMUNITY_ID = 'test-audit-log'
  const supabase = createClient(supabaseUrl, supabaseKey)

  beforeAll(async () => {
    const ts = Date.now()

    const { data: survey, error } = await supabase
      .from('surveys')
      .insert({ title: 'Audit Test Survey', slug: `test-audit-${ts}`, survey_type: 'quantitativa', status: 'ativa' })
      .select('id').single()
    if (error || !survey) throw new Error(`setup error: ${error?.message}`)
    testSurveyId = survey.id

    await supabase.from('survey_communities').insert({
      survey_id: testSurveyId, community_id: COMMUNITY_ID, active: true, status: 'ativa',
    })

    // Criar um dispatch para usar nos testes
    const { data: dispatch, error: de } = await supabase
      .from('survey_dispatches')
      .insert({
        survey_id:   testSurveyId,
        title:       'Test Dispatch Audit',
        body:        'Teste',
        channels:    ['pushNotification'],
        target_scope: 'all',
        target_roles: ['guardian'],
        personalized: true,
        status:       'sent',
        total_jobs:   1,
        completed_jobs: 1,
        failed_jobs:  0,
      })
      .select('id').single()
    if (de || !dispatch) throw new Error(`dispatch setup error: ${de?.message}`)
    testDispatchId = dispatch.id

    // Inserir 2 audit log entries manualmente
    await supabase.from('notification_audit_logs').insert([
      {
        dispatch_id: testDispatchId,
        email:       'user1@test.com',
        nome:        'User 1',
        status:      'sent',
        sent_at:     new Date().toISOString(),
      },
      {
        dispatch_id: testDispatchId,
        email:       'user2@test.com',
        nome:        'User 2',
        status:      'failed',
        error:       'Token inválido',
        sent_at:     null,
      },
    ])
  })

  afterAll(async () => {
    await supabase.from('notification_audit_logs').delete().eq('dispatch_id', testDispatchId)
    await supabase.from('survey_dispatches').delete().eq('id', testDispatchId)
    await supabase.from('survey_communities').delete().eq('survey_id', testSurveyId)
    await supabase.from('surveys').delete().eq('id', testSurveyId)
  })

  it('retorna 400 sem dispatch_id', async () => {
    const res = await fetch(
      `/api/admin/surveys/${testSurveyId}/dispatch-audit`,
      { headers: { 'Authorization': `Bearer ${adminToken}` } }
    )
    expect(res.status).toBe(400)
    const body = await res.json() as { error: string }
    expect(body.error).toBeTruthy()
  })

  it('retorna 404 com dispatch_id inexistente', async () => {
    const res = await fetch(
      `/api/admin/surveys/${testSurveyId}/dispatch-audit?dispatch_id=00000000-0000-0000-0000-000000000000`,
      { headers: { 'Authorization': `Bearer ${adminToken}` } }
    )
    expect(res.status).toBe(404)
  })

  it('retorna estrutura correta com dispatch_id válido', async () => {
    const res = await fetch(
      `/api/admin/surveys/${testSurveyId}/dispatch-audit?dispatch_id=${testDispatchId}`,
      { headers: { 'Authorization': `Bearer ${adminToken}` } }
    )
    expect(res.status).toBe(200)

    const body = await res.json() as {
      dispatch_id:  string
      total:        number
      total_sent:   number
      total_failed: number
      logs:         { email: string; status: string; sent_at: string | null; created_at: string }[]
    }

    expect(body.dispatch_id).toBe(testDispatchId)
    expect(typeof body.total).toBe('number')
    expect(typeof body.total_sent).toBe('number')
    expect(typeof body.total_failed).toBe('number')
    expect(Array.isArray(body.logs)).toBe(true)

    // Contagens devem bater com o que inserimos
    expect(body.total).toBeGreaterThanOrEqual(2)
    expect(body.total_sent).toBeGreaterThanOrEqual(1)
    expect(body.total_failed).toBeGreaterThanOrEqual(1)
  })

  it('cada log tem os campos obrigatórios', async () => {
    const res = await fetch(
      `/api/admin/surveys/${testSurveyId}/dispatch-audit?dispatch_id=${testDispatchId}`,
      { headers: { 'Authorization': `Bearer ${adminToken}` } }
    )
    const body = await res.json() as {
      logs: { email: string; status: string; sent_at: string | null; created_at: string }[]
    }

    for (const log of body.logs) {
      expect(typeof log.email).toBe('string')
      expect(['sent', 'failed']).toContain(log.status)
      expect(typeof log.created_at).toBe('string')
      // sent_at pode ser null (para failed), mas deve existir no objeto
      expect('sent_at' in log).toBe(true)
    }
  })

  it('retorna 401 sem autenticação', async () => {
    const res = await fetch(
      `/api/admin/surveys/${testSurveyId}/dispatch-audit?dispatch_id=${testDispatchId}`
    )
    expect(res.status).toBe(401)
  })
})
