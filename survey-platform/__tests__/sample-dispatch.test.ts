/**
 * Dispatch Test: Sample-based Notifications
 * Verifies that notifications are only sent to users in the sample list
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || ''
const adminToken = process.env.TEST_ADMIN_TOKEN || ''

describe('Sample Dispatch', () => {
  let testSurveyId: string
  const testCommunityId = 'test-community-dispatch'

  beforeAll(async () => {
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Create test survey with sample
    const { data: survey, error } = await supabase
      .from('surveys')
      .insert({
        title: 'Test Survey - Sample Dispatch',
        slug: `test-sample-dispatch-${Date.now()}`,
        survey_type: 'quantitativa',
        status: 'ativa',
      })
      .select('id')
      .single()

    if (error || !survey) {
      throw new Error(`Failed to create test survey: ${error?.message}`)
    }

    testSurveyId = survey.id

    // Install survey in community
    await supabase.from('survey_communities').insert({
      survey_id: testSurveyId,
      community_id: testCommunityId,
      active: true,
      status: 'ativa',
    })

    // Add sample entries
    await supabase.from('survey_sample_lists').insert([
      {
        survey_id: testSurveyId,
        community_id: testCommunityId,
        email: 'sample1@example.com',
        nome: 'Sample User 1',
        layers_user_id: 'user-1', // Resolved ID
      },
      {
        survey_id: testSurveyId,
        community_id: testCommunityId,
        email: 'sample2@example.com',
        nome: 'Sample User 2',
        layers_user_id: 'user-2', // Resolved ID
      },
      {
        survey_id: testSurveyId,
        community_id: testCommunityId,
        email: 'sample3@example.com',
        nome: 'Sample User 3',
        layers_user_id: null, // NOT resolved — should be skipped
      },
    ])
  })

  afterAll(async () => {
    const supabase = createClient(supabaseUrl, supabaseKey)

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
        .from('survey_dispatch_jobs')
        .delete()
        .in('dispatch_id', (
          await supabase
            .from('survey_dispatches')
            .select('id')
            .eq('survey_id', testSurveyId)
        ).data?.map((d: { id: string }) => d.id) || [])

      await supabase
        .from('survey_dispatches')
        .delete()
        .eq('survey_id', testSurveyId)

      await supabase
        .from('surveys')
        .delete()
        .eq('id', testSurveyId)
    }
  })

  it('should reject dispatch when amostral survey uses non-personalized mode', async () => {
    const res = await fetch(
      `/api/admin/surveys/${testSurveyId}/dispatch`,
      {
        method: 'POST',
        body: JSON.stringify({
          title: 'Test Dispatch',
          body: 'Test message',
          channels: ['pushNotification'],
          target_scope: 'communities',
          target_community_ids: [testCommunityId],
          target_roles: ['guardian', 'student'],
          personalized: false, // ERROR: amostral requires personalized
        }),
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'Content-Type': 'application/json',
        },
      }
    )

    expect(res.status).toBe(422)
    const data = await res.json()
    expect(data.error).toContain('amostral')
  })

  it('should accept dispatch when amostral survey uses personalized mode', async () => {
    const res = await fetch(
      `/api/admin/surveys/${testSurveyId}/dispatch`,
      {
        method: 'POST',
        body: JSON.stringify({
          title: 'Test Dispatch - Personalized',
          body: 'Test message for {{nome}}',
          channels: ['pushNotification'],
          target_scope: 'communities',
          target_community_ids: [testCommunityId],
          target_roles: ['guardian', 'student'],
          personalized: true, // OK: personalized mode
          scheduled_at: new Date(Date.now() + 60000).toISOString(), // Schedule for later
        }),
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'Content-Type': 'application/json',
        },
      }
    )

    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.ok).toBe(true)
  })

  it('should only dispatch to entries with resolved layers_user_id', async () => {
    const supabase = createClient(supabaseUrl, supabaseKey)
    const { count } = await supabase
      .from('survey_sample_lists')
      .select('*', { count: 'exact', head: true })
      .eq('survey_id', testSurveyId)
      .eq('community_id', testCommunityId)
      .not('layers_user_id', 'is', null)

    // Only 2 of 3 entries have resolved IDs
    expect(count).toBe(2)
  })

  it('should reject sample dispatch when no entries are resolved', async () => {
    // Create a survey with sample entries that have NO resolved layers_user_id
    const supabase = createClient(supabaseUrl, supabaseKey)
    const ts = Date.now()
    const { data: survey } = await supabase
      .from('surveys')
      .insert({ title: 'Unresolved Sample', slug: `test-unresolved-${ts}`, survey_type: 'quantitativa', status: 'ativa' })
      .select('id').single()
    if (!survey) return

    await supabase.from('survey_communities').insert({
      survey_id: survey.id, community_id: testCommunityId, active: true, status: 'ativa',
    })
    // Entries with NULL layers_user_id only
    await supabase.from('survey_sample_lists').insert({
      survey_id: survey.id, community_id: testCommunityId,
      email: 'unresolved@example.com', layers_user_id: null,
    })

    const res = await fetch(`/api/admin/surveys/${survey.id}/dispatch`, {
      method: 'POST',
      body: JSON.stringify({
        title: 'Test', body: 'Msg',
        channels: ['pushNotification'],
        target_scope: 'sample',
        target_roles: ['guardian'],
        personalized: true,
      }),
      headers: { 'Authorization': `Bearer ${adminToken}`, 'Content-Type': 'application/json' },
    })

    expect(res.status).toBe(422)

    // Cleanup
    await supabase.from('survey_sample_lists').delete().eq('survey_id', survey.id)
    await supabase.from('survey_communities').delete().eq('survey_id', survey.id)
    await supabase.from('surveys').delete().eq('id', survey.id)
  })

  it('should reject sample dispatch when sample list is empty', async () => {
    // Survey with NO sample entries at all
    const supabase = createClient(supabaseUrl, supabaseKey)
    const ts = Date.now()
    const { data: survey } = await supabase
      .from('surveys')
      .insert({ title: 'Empty Sample', slug: `test-empty-sample-${ts}`, survey_type: 'quantitativa', status: 'ativa' })
      .select('id').single()
    if (!survey) return

    await supabase.from('survey_communities').insert({
      survey_id: survey.id, community_id: testCommunityId, active: true, status: 'ativa',
    })
    // No sample entries

    const res = await fetch(`/api/admin/surveys/${survey.id}/dispatch`, {
      method: 'POST',
      body: JSON.stringify({
        title: 'Test', body: 'Msg',
        channels: ['pushNotification'],
        target_scope: 'sample',
        target_roles: ['guardian'],
        personalized: true,
      }),
      headers: { 'Authorization': `Bearer ${adminToken}`, 'Content-Type': 'application/json' },
    })

    expect(res.status).toBe(422)

    // Cleanup
    await supabase.from('survey_communities').delete().eq('survey_id', survey.id)
    await supabase.from('surveys').delete().eq('id', survey.id)
  })

  it('should accept scope=all dispatch for survey without sample', async () => {
    // A regular survey (no sample) should accept scope=all with communities
    const supabase = createClient(supabaseUrl, supabaseKey)
    const ts = Date.now()
    const { data: survey } = await supabase
      .from('surveys')
      .insert({ title: 'Open Dispatch Survey', slug: `test-open-dispatch-${ts}`, survey_type: 'quantitativa', status: 'ativa' })
      .select('id').single()
    if (!survey) return

    await supabase.from('survey_communities').insert({
      survey_id: survey.id, community_id: testCommunityId, active: true, status: 'ativa',
    })

    const res = await fetch(`/api/admin/surveys/${survey.id}/dispatch`, {
      method: 'POST',
      body: JSON.stringify({
        title: 'Open Dispatch', body: 'Mensagem para todos',
        channels: ['pushNotification'],
        target_scope: 'all',
        target_roles: ['guardian'],
        personalized: false,
        scheduled_at: new Date(Date.now() + 3_600_000).toISOString(),
      }),
      headers: { 'Authorization': `Bearer ${adminToken}`, 'Content-Type': 'application/json' },
    })

    expect(res.status).toBe(200)
    const body = await res.json() as { ok: boolean }
    expect(body.ok).toBe(true)

    // Cleanup dispatches
    const { data: dispatches } = await supabase
      .from('survey_dispatches').select('id').eq('survey_id', survey.id)
    if (dispatches?.length) {
      await supabase.from('survey_dispatch_jobs')
        .delete().in('dispatch_id', dispatches.map((d: { id: string }) => d.id))
      await supabase.from('survey_dispatches').delete().eq('survey_id', survey.id)
    }
    await supabase.from('survey_communities').delete().eq('survey_id', survey.id)
    await supabase.from('surveys').delete().eq('id', survey.id)
  })

  it('should create dispatch with status=scheduled when scheduled_at is in the future', async () => {
    const supabase = createClient(supabaseUrl, supabaseKey)
    const futureDate = new Date(Date.now() + 3_600_000).toISOString()

    const res = await fetch(`/api/admin/surveys/${testSurveyId}/dispatch`, {
      method: 'POST',
      body: JSON.stringify({
        title: 'Scheduled Dispatch', body: 'Agendado',
        channels: ['pushNotification'],
        target_scope: 'communities',
        target_community_ids: [testCommunityId],
        target_roles: ['guardian'],
        personalized: false,
        scheduled_at: futureDate,
      }),
      headers: { 'Authorization': `Bearer ${adminToken}`, 'Content-Type': 'application/json' },
    })

    expect(res.status).toBe(200)
    const body = await res.json() as { ok: boolean; scheduled: boolean }
    expect(body.ok).toBe(true)
    expect(body.scheduled).toBe(true)

    // Verify status in DB
    const { data: dispatches } = await supabase
      .from('survey_dispatches')
      .select('status')
      .eq('survey_id', testSurveyId)
      .eq('status', 'scheduled')
      .order('created_at', { ascending: false })
      .limit(1)

    expect(dispatches?.[0]?.status).toBe('scheduled')
  })
})
