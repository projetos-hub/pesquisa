import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import ThankYou from '@/components/survey-engine/steps/ThankYou'

function renderThankYou(props: Partial<React.ComponentProps<typeof ThankYou>> = {}) {
  return renderToStaticMarkup(React.createElement(ThankYou, {
    nps: 9,
    perfil: 'responsavel',
    nomeAluno: 'Pedro',
    school: 'escola',
    tipo: 'Escola Raiz',
    indicacaoLinks: { escola: 'https://indicacao.example' },
    ...props,
  }))
}

describe('ThankYou rendering', () => {
  it('renders promoter responsible message with referral link', () => {
    const html = renderThankYou({ nps: 9, perfil: 'responsavel' })

    expect(html).toContain('https://indicacao.example')
    expect(html).toContain('Pedro')
  })

  it('renders neutral responsible message without referral link', () => {
    const html = renderThankYou({ nps: 8, perfil: 'responsavel' })

    expect(html).not.toContain('https://indicacao.example')
    expect(html).toContain('Pedro')
  })

  it('renders detractor responsible message without referral link', () => {
    const html = renderThankYou({ nps: 6, perfil: 'responsavel' })

    expect(html).not.toContain('https://indicacao.example')
    expect(html).toContain('Pedro')
  })

  it('renders student message without referral link', () => {
    const html = renderThankYou({ nps: 10, perfil: 'aluno' })

    expect(html).not.toContain('https://indicacao.example')
    expect(html).toContain('Obrigado')
  })

  it('renders custom thank-you message with interpolation', () => {
    const html = renderThankYou({
      theme: {
        nomeEscola: 'Raiz',
        thankyouMessage: 'Mensagem para {{nomeAluno}} na {{nomeEscola}}',
      },
    })

    expect(html).toContain('Mensagem para Pedro na Raiz')
  })
})
