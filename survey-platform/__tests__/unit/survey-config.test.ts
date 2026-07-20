import { describe, expect, it } from 'vitest'
import { applyConditionals, rowsToConfig } from '@/lib/survey-config'
import type {
  InstallationRow,
  OptionRow,
  QuestionRow,
  SurveyRow,
} from '@/lib/survey-config'
import type { ScaleStepDef, SurveyConfig, TextStepDef } from '@/components/survey-engine/utils/types'

function surveyRow(overrides: Partial<SurveyRow> = {}): SurveyRow {
  return {
    id: 'survey-id',
    slug: 'csat',
    title: 'CSAT',
    survey_type: 'quantitativa',
    target_roles: ['responsavel'],
    status: 'ativa',
    settings: {
      theme: {
        primaryColor: '#111111',
        secondaryColor: '#222222',
        thankyouMessage: 'Obrigado',
      },
    },
    ...overrides,
  }
}

function questionRow(overrides: Partial<QuestionRow>): QuestionRow {
  return {
    id: overrides.id ?? 'q1',
    survey_id: 'survey-id',
    order_index: overrides.order_index ?? 0,
    type: overrides.type ?? 'text',
    key: overrides.key ?? 'comentario',
    title: overrides.title ?? 'Comentario',
    description: overrides.description ?? null,
    required: overrides.required ?? false,
    only_for_roles: overrides.only_for_roles ?? null,
    conditional_on: overrides.conditional_on ?? null,
    settings: overrides.settings ?? {},
  }
}

function optionRow(overrides: Partial<OptionRow>): OptionRow {
  return {
    question_id: overrides.question_id ?? 'q1',
    order_index: overrides.order_index ?? 0,
    label: overrides.label ?? 'Opcao',
    value: overrides.value ?? 'opt_0',
    section_key: overrides.section_key ?? null,
    section_title: overrides.section_title ?? null,
  }
}

describe('rowsToConfig', () => {
  it('maps survey metadata and merges installation theme over survey theme', () => {
    const installation: InstallationRow = {
      status: 'ativa',
      open_date: '2026-06-01T00:00:00.000Z',
      close_date: null,
      theme: {
        primaryColor: '#ffffff',
        logo: 'https://example.com/logo.svg',
      },
      settings: {
        indicacao_links: { qi: 'https://example.com/qi' },
      },
    }

    const config = rowsToConfig(
      surveyRow(),
      [questionRow({ type: 'text', key: 'comentario', title: 'Comentario' })],
      [],
      installation
    )

    expect(config.id).toBe('csat')
    expect(config.titulo).toBe('CSAT')
    expect(config.publico).toEqual(['responsavel'])
    expect(config.installation?.status).toBe('ativa')
    expect(config.installation?.open_date).toBe('2026-06-01T00:00:00.000Z')
    expect(config.settings?.theme).toEqual({
      primaryColor: '#ffffff',
      secondaryColor: '#222222',
      thankyouMessage: 'Obrigado',
      logo: 'https://example.com/logo.svg',
    })
    expect(config.installation?.theme).toEqual(config.settings?.theme)
    expect(config.settings?.indicacao_links).toEqual({ qi: 'https://example.com/qi' })
  })

  it('sorts questions and maps scale options by order_index', () => {
    const questions = [
      questionRow({ id: 'q2', order_index: 2, type: 'text', key: 'final', title: 'Final' }),
      questionRow({ id: 'q1', order_index: 1, type: 'scale', key: 'pedagogico', title: 'Pedagogico', settings: { scaleValues: [1, 2, 3, 4, 5] } }),
    ]
    const options = [
      optionRow({ question_id: 'q1', order_index: 1, label: 'Acompanhamento' }),
      optionRow({ question_id: 'q1', order_index: 0, label: 'Didatica' }),
    ]

    const config = rowsToConfig(surveyRow(), questions, options)

    expect(config.steps.map(step => step.key ?? step.type)).toEqual(['pedagogico', 'final'])
    expect(config.steps[0]).toMatchObject({
      type: 'scale',
      key: 'pedagogico',
      titulo: 'Pedagogico',
      perguntas: ['Didatica', 'Acompanhamento'],
    })
  })

  it('maps scale_sections preserving section and option order', () => {
    const config = rowsToConfig(
      surveyRow(),
      [questionRow({ id: 'q1', type: 'scale_sections', key: 'bilingue', title: 'Bilingue', settings: { scaleValues: [1, 2, 3, 4, 5] } })],
      [
        optionRow({ question_id: 'q1', order_index: 0, label: 'Speaking', section_key: 'oral', section_title: 'Oral' }),
        optionRow({ question_id: 'q1', order_index: 1, label: 'Listening', section_key: 'oral', section_title: 'Oral' }),
        optionRow({ question_id: 'q1', order_index: 2, label: 'Writing', section_key: 'written', section_title: 'Written' }),
      ]
    )

    const step = config.steps[0] as ScaleStepDef
    expect(step.secoes).toEqual([
      { key: 'oral', titulo: 'Oral', perguntas: ['Speaking', 'Listening'] },
      { key: 'written', titulo: 'Written', perguntas: ['Writing'] },
    ])
  })

  it('falls back unknown question types to a text step', () => {
    const config = rowsToConfig(
      surveyRow(),
      [questionRow({ type: 'matrix', key: 'custom', title: 'Custom' })],
      []
    )

    expect(config.steps[0]).toEqual({
      type: 'text',
      key: 'custom',
      titulo: 'Custom',
      pergunta: '',
    })
  })

  it('keeps only the first role from only_for_roles as current engine contract', () => {
    const config = rowsToConfig(
      surveyRow(),
      [questionRow({ only_for_roles: ['aluno', 'responsavel'] })],
      []
    )

    expect(config.steps[0].somentePara).toBe('aluno')
  })

  it('applies community content overrides without changing the base survey', () => {
    const installation: InstallationRow = {
      status: 'ativa',
      open_date: null,
      close_date: null,
      theme: {},
      settings: {
        contentOverrides: {
          questions: {
            comentario: {
              title: 'Comentario para SAP',
              pergunta: 'Conte sua percepcao sobre a rematricula',
            },
          },
          thankyou: {
            message: 'Obrigado, {{nomeEscola}} recebeu sua resposta.',
          },
        },
      },
    }

    const config = rowsToConfig(
      surveyRow(),
      [questionRow({ type: 'text', key: 'comentario', title: 'Comentario padrao', settings: { pergunta: 'Pergunta padrao' } })],
      [],
      installation
    )

    const step = config.steps[0] as TextStepDef
    expect(step.titulo).toBe('Comentario para SAP')
    expect(step.pergunta).toBe('Conte sua percepcao sobre a rematricula')
    expect(config.settings?.theme?.thankyouMessage).toBe('Obrigado, {{nomeEscola}} recebeu sua resposta.')
  })
})

describe('applyConditionals', () => {
  it('rebuilds answer_field_equals conditionals', () => {
    const config = rowsToConfig(
      surveyRow(),
      [
        questionRow({
          type: 'text',
          key: 'bilingue',
          title: 'Bilingue',
          conditional_on: {
            type: 'answer_field_equals',
            answerKey: 'nps',
            field: 'participa_bilingue',
            value: 'Sim',
          },
        }),
      ],
      []
    )

    const withConditionals = applyConditionals(config)
    const step = withConditionals.steps[0] as TextStepDef

    expect(step.condicional?.({ nps: { participa_bilingue: 'Sim' } })).toBe(true)
    expect(step.condicional?.({ nps: { participa_bilingue: 'Nao' } })).toBe(false)
  })

  it('keeps unknown conditional specs visible by current fail-open contract', () => {
    const config: SurveyConfig = {
      id: 'csat',
      titulo: 'CSAT',
      tipo_pesquisa: 'quantitativa',
      publico: ['responsavel'],
      steps: [
        {
          type: 'text',
          key: 'custom',
          titulo: 'Custom',
          pergunta: '',
          conditional_on: {
            type: 'unknown',
            answerKey: 'x',
            field: 'y',
            value: 'z',
          } as never,
        },
      ],
    }

    const withConditionals = applyConditionals(config)
    const step = withConditionals.steps[0] as TextStepDef

    expect(step.condicional?.({})).toBe(true)
  })
})
