'use server'

import { getFilterOptions as _getFilterOptions, fetchAllSurveys } from '@/lib/report-queries'

export async function getFilterOptions(surveyId: string) {
  return _getFilterOptions(surveyId)
}

export async function getAllSurveys() {
  return fetchAllSurveys()
}
