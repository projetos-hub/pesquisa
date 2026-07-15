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


  it('activates a linear block from a router answer', () => {
    const survey: SurveyConfig = {
      id: 'branching',
      titulo: 'Branching',
      tipo_pesquisa: 'qualitativa',
      publico: ['responsavel'],
      steps: [
        { type: 'welcome' },
        {
          type: 'radio',
          key: 'renovou',
          titulo: 'Renovou?',
          pergunta: 'Voce renovou?',
          opcoes: ['Sim', 'Nao'],
          branchFlow: {
            type: 'answer_routes',
            routes: [
              { value: 'Sim', blockId: 'fluxo-sim' },
              { value: 'Nao', blockId: 'fluxo-nao' },
            ],
          },
        },
        { type: 'text', key: 'motivo_sim', titulo: 'Sim', pergunta: '', flowBlockId: 'fluxo-sim' },
        { type: 'text', key: 'motivo_nao', titulo: 'Nao', pergunta: '', flowBlockId: 'fluxo-nao' },
        { type: 'thankyou' },
      ],
    }

    expect(buildActiveSteps(survey, 'responsavel', {}).map(stepId)).toEqual(['welcome', 'renovou', 'thankyou'])
    expect(buildActiveSteps(survey, 'responsavel', { renovou: 'Sim' }).map(stepId)).toEqual(['welcome', 'renovou', 'motivo_sim', 'thankyou'])
    expect(buildActiveSteps(survey, 'responsavel', { renovou: 'Nao' }).map(stepId)).toEqual(['welcome', 'renovou', 'motivo_nao', 'thankyou'])
  })


  it('routes by answer field for NPS router questions', () => {
    const survey: SurveyConfig = {
      id: 'nps-branching',
      titulo: 'NPS branching',
      tipo_pesquisa: 'quantitativa',
      publico: ['responsavel'],
      steps: [
        {
          type: 'nps',
          key: 'nps',
          branchFlow: {
            type: 'answer_routes',
            answerField: 'nps',
            routes: [
              { value: '10', blockId: 'promotor' },
              { value: '0', blockId: 'detrator' },
            ],
          },
        },
        { type: 'text', key: 'elogio', titulo: 'Elogio', pergunta: '', flowBlockId: 'promotor' },
        { type: 'text', key: 'critica', titulo: 'Critica', pergunta: '', flowBlockId: 'detrator' },
        { type: 'thankyou' },
      ],
    }

    expect(buildActiveSteps(survey, 'responsavel', { nps: { nps: 10 } }).map(stepId)).toEqual(['nps', 'elogio', 'thankyou'])
    expect(buildActiveSteps(survey, 'responsavel', { nps: { nps: 0 } }).map(stepId)).toEqual(['nps', 'critica', 'thankyou'])
  })

  it('includes role-specific steps for matching role', () => {
    const active = buildActiveSteps(baseSurvey(), 'aluno', {})

    expect(active.map(stepId)).toEqual(['welcome', 'nps', 'aluno_texto', 'thankyou'])
  })
})
