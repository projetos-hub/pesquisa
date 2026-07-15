import type { StepDef, SurveyConfig, Answers, Perfil, BranchFlowDef } from './types'

/**
 * Retorna o identificador unico de um step.
 * Migrado de pesquisa.html L.227-229 - logica identica.
 */
export function stepId(step: StepDef): string {
  return step.key || step.type
}

function answerValue(answer: unknown, flow: BranchFlowDef): unknown {
  if (!flow.answerField) return answer
  if (answer && typeof answer === 'object' && !Array.isArray(answer)) {
    return (answer as Record<string, unknown>)[flow.answerField]
  }
  return undefined
}

function routeMatches(answer: unknown, expectedValue: string): boolean {
  if (Array.isArray(answer)) return answer.some(item => String(item) === expectedValue)
  return String(answer) === expectedValue
}

function resolveBranchBlock(flow: BranchFlowDef, answer: unknown): string | null {
  const value = answerValue(answer, flow)
  const match = flow.routes.find(route => routeMatches(value, route.value))
  return match?.blockId || flow.defaultBlockId || null
}

function stepIsVisible(step: StepDef, perfil: Perfil, answers: Answers): boolean {
  if (step.somentePara && step.somentePara !== perfil) return false
  if (step.condicional && !step.condicional(answers)) return false
  return true
}

/**
 * Filtra os steps ativos com base no perfil, respostas atuais e blocos de fluxo.
 *
 * Regras:
 * - step.somentePara: exclui se o perfil nao bate
 * - step.condicional: exclui se a funcao retorna false
 * - step.flowBlockId: inclui apenas quando um roteador anterior ativou o bloco
 * - step.branchFlow: quando respondido, ativa o bloco de destino correspondente
 */
export function buildActiveSteps(
  survey: SurveyConfig,
  perfil: Perfil,
  answers: Answers
): StepDef[] {
  const activeBlocks = new Set<string>(['main'])
  const activeSteps: StepDef[] = []

  for (const step of survey.steps) {
    if (!stepIsVisible(step, perfil, answers)) continue

    const blockId = step.flowBlockId?.trim()
    if (blockId && !activeBlocks.has(blockId)) continue

    activeSteps.push(step)

    if (step.branchFlow) {
      const answer = answers[stepId(step)]
      if (answer !== undefined) {
        const targetBlock = resolveBranchBlock(step.branchFlow, answer)
        if (targetBlock) activeBlocks.add(targetBlock)
      }
    }
  }

  return activeSteps
}
