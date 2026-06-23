export interface SurveyQuestionRow {
  id: string
  key: string
}

export interface ResponseInsertRow {
  session_id: string
  question_id: string
  question_key: string
  value: unknown
}

export function buildQuestionMap(questions: SurveyQuestionRow[] | null | undefined): Map<string, string> {
  const questionMap = new Map<string, string>()

  for (const question of questions ?? []) {
    if (question.key) {
      questionMap.set(question.key, question.id)
    }
  }

  return questionMap
}

export function buildResponseRows(
  sessionId: string,
  answers: Record<string, unknown>,
  questionMap: Map<string, string>,
): ResponseInsertRow[] {
  return Object.entries(answers)
    .filter(([key]) => questionMap.has(key))
    .map(([key, value]) => ({
      session_id:   sessionId,
      question_id:  questionMap.get(key) as string,
      question_key: key,
      value,
    }))
}

export function hasOnlyUnknownAnswerKeys(
  answers: Record<string, unknown>,
  responseRows: ResponseInsertRow[],
): boolean {
  return Object.keys(answers).length > 0 && responseRows.length === 0
}
