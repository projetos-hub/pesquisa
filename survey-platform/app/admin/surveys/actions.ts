'use server'

import {
  createSurvey as createSurveyAction,
  updateSurvey as updateSurveyAction,
} from './survey-meta-actions'
import {
  createQuestion as createQuestionAction,
  deleteQuestion as deleteQuestionAction,
  moveQuestion as moveQuestionAction,
  saveQuestionOptions as saveQuestionOptionsAction,
  toggleThankYouStep as toggleThankYouStepAction,
  toggleWelcomeStep as toggleWelcomeStepAction,
  updateQuestion as updateQuestionAction,
} from './question-actions'
import {
  deleteSurvey as deleteSurveyAction,
  duplicateSurvey as duplicateSurveyAction,
} from './survey-copy-delete-actions'

export async function createSurvey(formData: FormData) {
  return createSurveyAction(formData)
}

export async function updateSurvey(id: string, formData: FormData) {
  return updateSurveyAction(id, formData)
}

export async function createQuestion(surveyId: string, formData: FormData) {
  return createQuestionAction(surveyId, formData)
}

export async function updateQuestion(questionId: string, surveyId: string, formData: FormData) {
  return updateQuestionAction(questionId, surveyId, formData)
}

export async function saveQuestionOptions(questionId: string, surveyId: string, labels: string[]) {
  return saveQuestionOptionsAction(questionId, surveyId, labels)
}

export async function deleteQuestion(questionId: string, surveyId: string) {
  return deleteQuestionAction(questionId, surveyId)
}

export async function moveQuestion(questionId: string, surveyId: string, direction: 'up' | 'down') {
  return moveQuestionAction(questionId, surveyId, direction)
}

export async function toggleWelcomeStep(surveyId: string, enabled: boolean) {
  return toggleWelcomeStepAction(surveyId, enabled)
}

export async function toggleThankYouStep(surveyId: string, enabled: boolean) {
  return toggleThankYouStepAction(surveyId, enabled)
}

export async function duplicateSurvey(surveyId: string) {
  return duplicateSurveyAction(surveyId)
}

export async function deleteSurvey(surveyId: string) {
  return deleteSurveyAction(surveyId)
}
