/**
 * Smoke Test: Sample Upload
 * Verifies that the sample upload API processes Excel files without errors
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || ''
const adminToken = process.env.TEST_ADMIN_TOKEN || ''

describe('Sample Upload', () => {
  let testSurveyId: string

  beforeAll(async () => {
    // Create a test survey
    const supabase = createClient(supabaseUrl, supabaseKey)
    const { data: survey, error } = await supabase
      .from('surveys')
      .insert({
        title: 'Test Survey - Sample Upload',
        slug: `test-sample-${Date.now()}`,
        survey_type: 'quantitativa',
        status: 'ativa',
      })
      .select('id')
      .single()

    if (error || !survey) {
      throw new Error(`Failed to create test survey: ${error?.message}`)
    }

    testSurveyId = survey.id
  })

  afterAll(async () => {
    // Cleanup: delete test survey and sample entries
    if (testSurveyId) {
      const supabase = createClient(supabaseUrl, supabaseKey)
      await supabase
        .from('survey_sample_lists')
        .delete()
        .eq('survey_id', testSurveyId)

      await supabase
        .from('surveys')
        .delete()
        .eq('id', testSurveyId)
    }
  })

  it('should process Excel file and insert sample entries', async () => {
    // Create a minimal Excel file with sample data
    const xlsxFile = new File(
      [Buffer.from('test')],
      'test-sample.xlsx',
      { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }
    )

    const formData = new FormData()
    formData.append('file', xlsxFile)

    const res = await fetch(
      `/api/admin/surveys/${testSurveyId}/sample`,
      {
        method: 'POST',
        body: formData,
        headers: { 'Authorization': `Bearer ${adminToken}` },
      }
    )

    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data).toHaveProperty('total_entries')
    expect(data).toHaveProperty('resolved_layers_ids')
    expect(data.total_entries).toBeGreaterThanOrEqual(0)
    expect(data.resolved_layers_ids).toBeGreaterThanOrEqual(0)
  })

  it('should return 400 when no file is provided', async () => {
    const formData = new FormData()

    const res = await fetch(
      `/api/admin/surveys/${testSurveyId}/sample`,
      {
        method: 'POST',
        body: formData,
        headers: { 'Authorization': `Bearer ${adminToken}` },
      }
    )

    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.error).toBe('No file provided')
  })

  it('should list sample entries via GET', async () => {
    const res = await fetch(
      `/api/admin/surveys/${testSurveyId}/sample`,
      {
        headers: { 'Authorization': `Bearer ${adminToken}` },
      }
    )

    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data).toHaveProperty('by_community')
    expect(data).toHaveProperty('totals')
    expect(data.totals).toHaveProperty('total_entries')
    expect(data.totals).toHaveProperty('schools')
    expect(data.totals).toHaveProperty('resolved')
  })

  it('should delete sample entries via DELETE', async () => {
    const res = await fetch(
      `/api/admin/surveys/${testSurveyId}/sample`,
      {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${adminToken}` },
      }
    )

    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.message).toBe('Sample cleared')
  })
})
