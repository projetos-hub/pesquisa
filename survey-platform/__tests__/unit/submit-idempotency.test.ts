import { describe, expect, it } from 'vitest'
import { classifyExistingSubmission } from '@/lib/submit-idempotency'

describe('classifyExistingSubmission', () => {
  it('classifies an existing session with responses as complete duplicate', () => {
    expect(classifyExistingSubmission(1)).toBe('complete_duplicate')
    expect(classifyExistingSubmission(4)).toBe('complete_duplicate')
  })

  it('classifies an existing session without responses as retryable', () => {
    expect(classifyExistingSubmission(0)).toBe('incomplete_retry')
  })

  it('classifies unknown response counts as missing evidence', () => {
    expect(classifyExistingSubmission(null)).toBe('missing')
    expect(classifyExistingSubmission(undefined)).toBe('missing')
  })
})
