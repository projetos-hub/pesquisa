import { describe, expect, it } from 'vitest'
import { applyStepPlaceholders } from '@/components/survey-engine/utils/applyStepPlaceholders'
import type { SurveyConfig } from '@/components/survey-engine/utils/types'

describe('applyStepPlaceholders', () => {
  it('replaces Mais program and team placeholders in welcome and question text', () => {
    const config: SurveyConfig = {
      id: 'mais-raiz-2026',
      titulo: 'Pesquisa {{programaMais}}',
      tipo_pesquisa: 'quantitativa',
      publico: ['responsavel'],
      steps: [
        {
          type: 'welcome',
          titulo: 'O {{programaMais}} quer ouvir a sua opiniao!',
          desc: 'Obrigado. Equipe {{equipeMarca}}',
        },
        {
          type: 'text',
          key: 'comentario',
          titulo: 'Sobre o {{programaMais}}',
          pergunta: 'O que voce sugere para o {{programaMais}}?',
          placeholder: 'Mensagem para a equipe {{equipeMarca}}',
        },
      ],
    }

    const rendered = applyStepPlaceholders(config, {
      programaMais: 'Mais Sarah Dawsey',
      equipeMarca: 'Sarah Dawsey',
    })

    expect(rendered.titulo).toBe('Pesquisa Mais Sarah Dawsey')
    expect(rendered.steps[0]).toMatchObject({
      titulo: 'O Mais Sarah Dawsey quer ouvir a sua opiniao!',
      desc: 'Obrigado. Equipe Sarah Dawsey',
    })
    expect(rendered.steps[1]).toMatchObject({
      titulo: 'Sobre o Mais Sarah Dawsey',
      pergunta: 'O que voce sugere para o Mais Sarah Dawsey?',
      placeholder: 'Mensagem para a equipe Sarah Dawsey',
    })
  })
})