export type DispatchJobStatus = 'pending' | 'sending' | 'sent' | 'failed' | 'skipped'
export type DispatchFinalStatus = 'sent' | 'failed' | 'partial_failure'
export const MAX_DISPATCH_RETRY_COUNT = 3

export interface DispatchCloseDecision {
  shouldClose: boolean
  status?: DispatchFinalStatus
  completedJobs?: number
  failedJobs?: number
}

export function decideDispatchClose(jobStatuses: DispatchJobStatus[]): DispatchCloseDecision {
  if (jobStatuses.length === 0) return { shouldClose: false }

  const stillRunning = jobStatuses.some(status => status === 'pending' || status === 'sending')
  if (stillRunning) return { shouldClose: false }

  const sentCount = jobStatuses.filter(status => status === 'sent').length
  const failedCount = jobStatuses.filter(status => status === 'failed').length

  const status: DispatchFinalStatus =
    failedCount === 0 ? 'sent' :
    sentCount === 0 ? 'failed' : 'partial_failure'

  return {
    shouldClose: true,
    status,
    completedJobs: sentCount,
    failedJobs: failedCount,
  }
}

export function canRetryDispatchJob(status: DispatchJobStatus, retryCount: number): boolean {
  return status === 'failed' && retryCount < MAX_DISPATCH_RETRY_COUNT
}
