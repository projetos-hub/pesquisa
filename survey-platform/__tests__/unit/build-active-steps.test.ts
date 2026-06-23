import { describe, expect, it } from 'vitest'
import { buildActiveSteps, stepId } from '@/components/survey-engine/utils/buildActiveSteps'
import type { SurveyConfig } from '@/components/survey-engine/utils/types'

function baseSurvey(): SurveyConfig {
  return {
    id: 'csat',
    titulo: 'CSAT',
    tipo_pesquisa: 'quantitativa',
    publico: ['responsavel', 'aluno'],
    steps: [
      { type: 'welcome' },
      { type: 'nps', key: 'nps' },
      { type: 'scale', key: 'bilingue', titulo: 'Bilingue', condicional: answers => {
        const nps = answers.nps as { participa_bilingue?: string } | undefined
        return nps?.participa_bilingue === 'Sim'
      } },
      { type: 'text', key: 'aluno_texto', titulo: 'Aluno', pergunta: '', somentePara: 'aluno' },
      { type: 'thankyou' },
    ],
  }
}

describe('stepId', () => {
  it('uses key when available and type otherwise', () => {
    expect(stepId({ type: 'welcome' })).toBe('welcome')
    expect(stepId({ type: 'text', key: 'comentario', titulo: 'Comentario', pergunta: '' })).toBe('comentario')
  })
})

describe('buildActiveSteps', () => {
  it('keeps unconditional steps and filters steps from another role', () => {
    const active = buildActiveSteps(baseSurvey(), 'responsavel', {})

    expect(active.map(stepId)).toEqual(['welcome', 'nps', 'thankyou'])
  })

  it('includes conditional steps when their condition matches answers', () => {
    const active = buildActiveSteps(baseSurvey(), 'responsavel', {
      nps: { participa_bilingue: 'Sim' },
    })

    expect(active.map(stepId)).toEqual(['welcome', 'nps', 'bilingue', 'thankyou'])
  })

  it('keeps navigation order stable as conditional steps appear or disappear', () => {
    const withoutConditional = buildActiveSteps(baseSurvey(), 'responsavel', {})
    const withConditional = buildActiveSteps(baseSurvey(), 'responsavel', {
      nps: { participa_bilingue: 'Sim' },
    })

    expect(withoutConditional.map(stepId).slice(1)).toEqual(['nps', 'thankyou'])
    expect(withConditional.map(stepId).slice(1)).toEqual(['nps', 'bilingue', 'thankyou'])
    expect(withConditional[withConditional.findIndex(step => stepId(step) === 'bilingue') - 1]?.type).toBe('nps')
    expect(withConditional[withConditional.findIndex(step => stepId(step) === 'bilingue') + 1]?.type).toBe('thankyou')
  })

  it('includes role-specific steps for matching role', () => {
    const active = buildActiveSteps(baseSurvey(), 'aluno', {})

    expect(active.map(stepId)).toEqual(['welcome', 'nps', 'aluno_texto', 'thankyou'])
  })
})
