export type ExistingSubmissionState = 'complete_duplicate' | 'incomplete_retry' | 'missing'

export function classifyExistingSubmission(responseCount: number | null | undefined): ExistingSubmissionState {
  if (responseCount === null || responseCount === undefined) return 'missing'
  return responseCount > 0 ? 'complete_duplicate' : 'incomplete_retry'
}
