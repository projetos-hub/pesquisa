import type {
  SurveyConfig,
  StepDef,
  StepSection,
  Perfil,
  TipoPesquisa,
  Answers,
  ConditionalDef,
} from '@/components/survey-engine/utils/types'

// ─── Tipos para rows do banco ─────────────────────────────────────────────────

export interface SurveyRow {
  id: string
  slug: string
  title: string
  survey_type: string
  target_roles: string[]
}

export interface QuestionRow {
  id: string
  survey_id: string
  order_index: number
  type: string
  key: string
  title: string
  description: string | null
  required: boolean
  only_for_roles: string[] | null
  conditional_on: ConditionalDef | null
  settings: Record<string, unknown>
}

export interface OptionRow {
  question_id: string
  order_index: number
  label: string
  value: string
  section_key: string | null
  section_title: string | null
}

// ─── DB rows → SurveyConfig (com conditional_on, sem condicional fn) ──────────
//
// condicional é uma função JS e não pode ser serializada em JSON.
// rowsToConfig() monta o config com conditional_on (JSONB) em cada step.
// applyConditionals() converte conditional_on → condicional function no cliente.

export function rowsToConfig(
  survey: SurveyRow,
  questions: QuestionRow[],
  options: OptionRow[]
): SurveyConfig {
  const steps: StepDef[] = [...questions]
    .sort((a, b) => a.order_index - b.order_index)
    .map((q): StepDef => {
      const qOptions = options
        .filter(o => o.question_id === q.id)
        .sort((a, b) => a.order_index - b.order_index)

      const base = {
        ...(q.conditional_on ? { conditional_on: q.conditional_on } : {}),
        ...(q.only_for_roles?.[0] ? { somentePara: q.only_for_roles[0] as Perfil } : {}),
      }

      switch (q.type) {
        case 'welcome':
          return { type: 'welcome', ...base }

        case 'nps':
          return {
            type: 'nps',
            key: q.key,
            perguntaBilingue: (q.settings?.perguntaBilingue as boolean) ?? false,
            ...base,
          }

        case 'scale':
          return {
            type: 'scale',
            key: q.key,
            titulo: q.title,
            ...(q.description ? { desc: q.description } : {}),
            perguntas: qOptions.map(o => o.label),
            ...base,
          }

        case 'scale_sections': {
          // Monta seções respeitando a ordem de inserção das options
          const sectionOrder: string[] = []
          const sectionMap = new Map<string, { titulo: string; perguntas: string[] }>()
          for (const opt of qOptions) {
            if (!opt.section_key || !opt.section_title) continue
            if (!sectionMap.has(opt.section_key)) {
              sectionOrder.push(opt.section_key)
              sectionMap.set(opt.section_key, { titulo: opt.section_title, perguntas: [] })
            }
            sectionMap.get(opt.section_key)!.perguntas.push(opt.label)
          }
          const secoes: StepSection[] = sectionOrder.map(key => ({
            key,
            titulo: sectionMap.get(key)!.titulo,
            perguntas: sectionMap.get(key)!.perguntas,
          }))
          return {
            type: 'scale',
            key: q.key,
            titulo: q.title,
            ...(q.description ? { desc: q.description } : {}),
            secoes,
            ...base,
          }
        }

        case 'radio':
          return {
            type: 'radio',
            key: q.key,
            titulo: q.title,
            ...(q.description ? { desc: q.description } : {}),
            pergunta: (q.settings?.pergunta as string) ?? '',
            opcoes: qOptions.map(o => o.label),
            obrigatorio: q.required,
            ...base,
          }

        case 'text':
          return {
            type: 'text',
            key: q.key,
            titulo: q.title,
            ...(q.description ? { desc: q.description } : {}),
            pergunta: (q.settings?.pergunta as string) ?? '',
            ...(q.settings?.placeholder ? { placeholder: q.settings.placeholder as string } : {}),
            obrigatorio: q.required,
            ...base,
          }

        case 'thankyou':
          return { type: 'thankyou', ...base }

        default:
          // Tipo desconhecido: retorna como text vazio para não quebrar a engine
          return { type: 'text', key: q.key, titulo: q.title, pergunta: '', ...base }
      }
    })

  return {
    id: survey.slug,
    titulo: survey.title,
    tipo_pesquisa: survey.survey_type as TipoPesquisa,
    publico: survey.target_roles as Perfil[],
    steps,
  }
}

// ─── Reconstrói condicional functions a partir dos conditional_on specs ────────
//
// Chamado no cliente (SurveyRunner) após o fetch da API.
// Garante que buildActiveSteps() receba funções JS válidas.

export function applyConditionals(config: SurveyConfig): SurveyConfig {
  const steps: StepDef[] = config.steps.map(step => {
    const spec = step.conditional_on
    if (!spec) return step

    let condicional: (answers: Answers) => boolean

    if (spec.type === 'answer_field_equals') {
      condicional = (answers: Answers): boolean => {
        const answer = answers[spec.answerKey] as Record<string, unknown> | undefined
        return answer?.[spec.field] === spec.value
      }
    } else {
      // Spec desconhecida: step sempre visível
      condicional = () => true
    }

    return { ...step, condicional }
  })

  return { ...config, steps }
}
