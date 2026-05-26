/**
 * Security Test: Sample Gate on Submit Endpoint
 * Verifies that POST /api/surveys/[slug]/submit respects sample list
 * restrictions — cannot be bypassed by posting directly.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || ''

const COMMUNITY_ID   = 'test-submit-gate'
const EMAIL_IN       = 'in-sample@test.com'
const EMAIL_OUT      = 'outside-sample@test.com'
const DUMMY_ANSWERS  = { nps: 9 }

async function submit(slug: string, email: string, communityId = COMMUNITY_ID) {
  return fetch(`/api/surveys/${slug}/submit`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({
      communityId,
      userId:  `uid-test-${email}`,
      email,
      answers: DUMMY_ANSWERS,
    }),
  })
}

describe('Submit Sample Gate', () => {
  let sampledSlug:    string
  let openSlug:       string
  let sampledSurveyId: string
  let openSurveyId:    string
  const supabase = createClient(supabaseUrl, supabaseKey)

  beforeAll(async () => {
    const ts = Date.now()

    // Survey com amostra (restrita)
    const { data: s1, error: e1 } = await supabase
      .from('surveys')
      .insert({ title: 'Sampled Survey', slug: `test-sampled-${ts}`, survey_type: 'quantitativa', status: 'ativa' })
      .select('id, slug').single()
    if (e1 || !s1) throw new Error(`setup error: ${e1?.message}`)
    sampledSurveyId = s1.id
    sampledSlug     = s1.slug

    // Survey aberta (sem amostra)
    const { data: s2, error: e2 } = await supabase
      .from('surveys')
      .insert({ title: 'Open Survey', slug: `test-open-${ts}`, survey_type: 'quantitativa', status: 'ativa' })
      .select('id, slug').single()
    if (e2 || !s2) throw new Error(`setup error: ${e2?.message}`)
    openSurveyId = s2.id
    openSlug     = s2.slug

    // Instalar ambas na community de teste
    await supabase.from('survey_communities').insert([
      { survey_id: sampledSurveyId, community_id: COMMUNITY_ID, active: true, status: 'ativa' },
      { survey_id: openSurveyId,    community_id: COMMUNITY_ID, active: true, status: 'ativa' },
    ])

    // Adicionar entrada de amostra apenas para EMAIL_IN
    await supabase.from('survey_sample_lists').insert({
      survey_id:    sampledSurveyId,
      community_id: COMMUNITY_ID,
      email:        EMAIL_IN,
      nome:         'In Sample User',
    })
  })

  afterAll(async () => {
    // Limpar response_sessions criadas pelos testes
    await supabase.from('response_sessions').delete().in('survey_id', [sampledSurveyId, openSurveyId].filter(Boolean))
    await supabase.from('survey_sample_lists').delete().eq('survey_id', sampledSurveyId)
    await supabase.from('survey_communities').delete().in('survey_id', [sampledSurveyId, openSurveyId].filter(Boolean))
    await supabase.from('surveys').delete().in('id', [sampledSurveyId, openSurveyId].filter(Boolean))
  })

  it('permite submit quando email está na amostra', async () => {
    const res = await submit(sampledSlug, EMAIL_IN)
    // 200 = novo | 200 duplicate:true = já respondeu — ambos válidos
    expect(res.status).toBe(200)
  })

  it('bloqueia submit quando email NÃO está na amostra', async () => {
    const res = await submit(sampledSlug, EMAIL_OUT)
    expect(res.status).toBe(403)
    const body = await res.json() as { error: string }
    expect(body.error).toBe('not_in_sample')
  })

  it('bloqueia submit quando email está ausente e survey tem amostra', async () => {
    const res = await submit(sampledSlug, '')
    expect(res.status).toBe(403)
    const body = await res.json() as { error: string }
    expect(body.error).toBe('not_in_sample')
  })

  it('permite submit sem restrição quando survey não tem amostra', async () => {
    const res = await submit(openSlug, EMAIL_OUT)
    expect(res.status).toBe(200)
  })

  it('permite submit após amostra ser deletada (community sem entries)', async () => {
    // Deletar a amostra
    await supabase.from('survey_sample_lists').delete().eq('survey_id', sampledSurveyId)

    // Agora qualquer email deve passar
    const res = await submit(sampledSlug, EMAIL_OUT)
    expect(res.status).toBe(200)
  })
})
