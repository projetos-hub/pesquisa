export type SurveyLifecycleStatus = 'rascunho' | 'ativa' | 'pausada' | 'encerrada' | 'nao_aberta'

interface SurveyStatusInput {
  status?: string | null
  open_date?: string | null
  close_date?: string | null
}

function parseDate(value?: string | null): Date | null {
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

export function getEffectiveSurveyStatus(
  input: SurveyStatusInput,
  now: Date = new Date(),
): SurveyLifecycleStatus {
  const status = (input.status ?? 'rascunho') as SurveyLifecycleStatus
  const closeDate = parseDate(input.close_date)
  if (closeDate && closeDate <= now) return 'encerrada'

  if (status === 'rascunho' || status === 'pausada' || status === 'encerrada') {
    return status
  }

  const openDate = parseDate(input.open_date)
  if (openDate && openDate > now) return 'nao_aberta'

  return status
}

export function isEffectivelyOpen(input: SurveyStatusInput, now: Date = new Date()): boolean {
  return getEffectiveSurveyStatus(input, now) === 'ativa'
}
