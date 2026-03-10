import type { StepDef, SurveyConfig, Answers, Perfil } from './types'

/**
 * Retorna o identificador único de um step.
 * Migrado de pesquisa.html L.227–229 — lógica idêntica.
 */
export function stepId(step: StepDef): string {
  return step.key || step.type
}

/**
 * Filtra os steps ativos com base no perfil e nas respostas atuais.
 * Migrado de pesquisa.html L.219–225 — lógica idêntica.
 *
 * Regras:
 * - step.somentePara: exclui se o perfil não bate
 * - step.condicional: exclui se a função retorna false
 */
export function buildActiveSteps(
  survey: SurveyConfig,
  perfil: Perfil,
  answers: Answers
): StepDef[] {
  return survey.steps.filter(step => {
    if (step.somentePara && step.somentePara !== perfil) return false
    if (step.condicional && !step.condicional(answers)) return false
    return true
  })
}
