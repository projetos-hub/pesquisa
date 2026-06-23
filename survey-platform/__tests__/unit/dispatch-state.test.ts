import { describe, expect, it } from 'vitest'
import { canRetryDispatchJob, decideDispatchClose } from '@/lib/dispatch-state'

describe('decideDispatchClose', () => {
  it('keeps dispatch open while any job is pending or sending', () => {
    expect(decideDispatchClose(['sent', 'pending'])).toEqual({ shouldClose: false })
    expect(decideDispatchClose(['failed', 'sending'])).toEqual({ shouldClose: false })
  })

  it('does not close dispatches without jobs', () => {
    expect(decideDispatchClose([])).toEqual({ shouldClose: false })
  })

  it('closes as sent when all finished jobs succeeded or were skipped', () => {
    expect(decideDispatchClose(['sent', 'sent', 'skipped'])).toEqual({
      shouldClose: true,
      status: 'sent',
      completedJobs: 2,
      failedJobs: 0,
    })
  })

  it('closes as failed when every counted job failed', () => {
    expect(decideDispatchClose(['failed', 'failed'])).toEqual({
      shouldClose: true,
      status: 'failed',
      completedJobs: 0,
      failedJobs: 2,
    })
  })

  it('closes as partial failure when finished jobs mix sent and failed', () => {
    expect(decideDispatchClose(['sent', 'failed', 'skipped'])).toEqual({
      shouldClose: true,
      status: 'partial_failure',
      completedJobs: 1,
      failedJobs: 1,
    })
  })
})

describe('canRetryDispatchJob', () => {
  it('allows failed jobs below the retry limit', () => {
    expect(canRetryDispatchJob('failed', 0)).toBe(true)
    expect(canRetryDispatchJob('failed', 2)).toBe(true)
  })

  it('blocks non-failed jobs and failed jobs at the retry limit', () => {
    expect(canRetryDispatchJob('sent', 0)).toBe(false)
    expect(canRetryDispatchJob('sending', 0)).toBe(false)
    expect(canRetryDispatchJob('failed', 3)).toBe(false)
  })
})
