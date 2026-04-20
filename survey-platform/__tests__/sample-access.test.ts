/**
 * Access Control Test: Sample Email Validation
 * Verifies that surveys with sample lists enforce email-based access control
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || ''

describe('Sample Access Control', () => {
  let testSurveyId: string
  let normalSurveyId: string
  const testCommunityId = 'test-community-sample'
  const testEmail = 'user@example.com'
  const outsiderEmail = 'outsider@example.com'

  beforeAll(async () => {
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Create amostral survey
    const { data: amostraQuest, error: amostraErr } = await supabase
      .from('surveys')
      .insert({
        title: 'Test Survey - Amostral',
        slug: `test-amostral-${Date.now()}`,
        survey_type: 'quantitativa',
        status: 'ativa',
      })
      .select('id')
      .single()

    if (amostraErr || !amostraQuest) {
      throw new Error(`Failed to create amostral survey: ${amostraErr?.message}`)
    }

    testSurveyId = amostraQuest.id

    // Create normal survey (no sample)
    const { data: normalQuest, error: normalErr } = await supabase
      .from('surveys')
      .insert({
        title: 'Test Survey - Normal',
        slug: `test-normal-${Date.now()}`,
        survey_type: 'quantitativa',
        status: 'ativa',
      })
      .select('id')
      .single()

    if (normalErr || !normalQuest) {
      throw new Error(`Failed to create normal survey: ${normalErr?.message}`)
    }

    normalSurveyId = normalQuest.id

    // Add test email to sample list for amostral survey
    await supabase.from('survey_sample_lists').insert({
      survey_id: testSurveyId,
      community_id: testCommunityId,
      email: testEmail,
      nome: 'Test User',
    })

    // Install both surveys in test community
    await supabase.from('survey_communities').insert([
      {
        survey_id: testSurveyId,
        community_id: testCommunityId,
        active: true,
        status: 'ativa',
      },
      {
        survey_id: normalSurveyId,
        community_id: testCommunityId,
        active: true,
        status: 'ativa',
      },
    ])
  })

  afterAll(async () => {
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Cleanup
    if (testSurveyId) {
      await supabase
        .from('survey_sample_lists')
        .delete()
        .eq('survey_id', testSurveyId)

      await supabase
        .from('survey_communities')
        .delete()
        .eq('survey_id', testSurveyId)

      await supabase
        .from('surveys')
        .delete()
        .eq('id', testSurveyId)
    }

    if (normalSurveyId) {
      await supabase
        .from('survey_communities')
        .delete()
        .eq('survey_id', normalSurveyId)

      await supabase
        .from('surveys')
        .delete()
        .eq('id', normalSurveyId)
    }
  })

  it('should allow access when email is in sample list', async () => {
    const amostraQuest = await fetch(
      `/api/surveys/test-amostral-?communityId=${testCommunityId}&email=${encodeURIComponent(testEmail)}`
    )

    expect(amostraQuest.status).toBe(200)
  })

  it('should deny access (403) when email is NOT in sample list', async () => {
    const res = await fetch(
      `/api/surveys/test-amostral-?communityId=${testCommunityId}&email=${encodeURIComponent(outsiderEmail)}`
    )

    expect(res.status).toBe(403)
    const data = await res.json()
    expect(data.error).toBe('not_in_sample')
  })

  it('should allow any email when survey has no sample list', async () => {
    const res = await fetch(
      `/api/surveys/test-normal-?communityId=${testCommunityId}&email=${encodeURIComponent(outsiderEmail)}`
    )

    // Should succeed because survey has no sample constraints
    expect(res.status).toBe(200)
  })

  it('should deny access when email is missing for sampled survey', async () => {
    const res = await fetch(
      `/api/surveys/test-amostral-?communityId=${testCommunityId}`
    )

    expect(res.status).toBe(403)
    const data = await res.json()
    expect(data.error).toBe('not_in_sample')
  })
})
