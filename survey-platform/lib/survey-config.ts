import type {
  SurveyConfig,
  SurveySettings,
  SurveyInstallation,
  StepDef,
  StepSection,
  Perfil,
  TipoPesquisa,
  Answers,
  ConditionalDef,
  BranchFlowDef,
} from '@/components/survey-engine/utils/types'

// ─── Tipos para rows do banco ─────────────────────────────────────────────────

export interface SurveyRow {
  id: string
  slug: string
  title: string
  survey_type: string
  target_roles: string[]
  status?: string
  settings: Record<string, unknown>
}

export interface InstallationRow {
  status: string
  open_date: string | null
  close_date: string | null
  theme: Record<string, unknown>
  settings: Record<string, unknown>
}

export interface QuestionTextOverride {
  title?: string
  description?: string
  pergunta?: string
}

export interface SurveyContentOverrides {
  questions?: Record<string, QuestionTextOverride>
  thankyou?: {
    message?: string
  }
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

function asContentOverrides(settings: Record<string, unknown> | undefined): SurveyContentOverrides {
  return (settings?.contentOverrides ?? {}) as SurveyContentOverrides
}

function applyQuestionTextOverride(
  q: QuestionRow,
  overrides: SurveyContentOverrides
): QuestionRow {
  const byKey = q.key ? overrides.questions?.[q.key] : undefined
  const byType = overrides.questions?.[q.type]
  const override = byKey ?? byType

  if (!override) return q

  const settings = { ...(q.settings ?? {}) }
  if (typeof override.pergunta === 'string') {
    settings.pergunta = override.pergunta
  }

  return {
    ...q,
    title: typeof override.title === 'string' ? override.title : q.title,
    description: typeof override.description === 'string' ? override.description : q.description,
    settings,
  }
}

// ─── Helpers internos ─────────────────────────────────────────────────────────

/** Campos de base compartilhados por todos os steps */
function baseFields(q: QuestionRow) {
  const flowBlockId = typeof q.settings?.flowBlockId === 'string' ? q.settings.flowBlockId.trim() : ''
  const flowBlockLabel = typeof q.settings?.flowBlockLabel === 'string' ? q.settings.flowBlockLabel.trim() : ''
  const branchFlow = q.settings?.branchFlow as BranchFlowDef | undefined

  return {
    ...(q.conditional_on ? { conditional_on: q.conditional_on } : {}),
    ...(q.only_for_roles?.[0] ? { somentePara: q.only_for_roles[0] as Perfil } : {}),
    ...(flowBlockId ? { flowBlockId } : {}),
    ...(flowBlockLabel ? { flowBlockLabel } : {}),
    ...(branchFlow?.type === 'answer_routes' ? { branchFlow } : {}),
    ...(q.settings?.textAlign ? { textAlign: q.settings.textAlign as StepDef['textAlign'] } : {}),
  }
}

// ─── Strategy map: um builder por tipo de question ───────────────────────────
// CC de rowsToConfig cai de 14 para ~4 com esta abordagem.

function parseScaleValues(value: unknown): number[] | null {
  if (!Array.isArray(value)) return null

  const values = value
    .map(item => typeof item === 'number' ? item : Number(item))
    .filter(item => Number.isInteger(item))

  return values.length >= 2 ? values : null
}

function scaleFields(q: QuestionRow) {
  const scaleValues = parseScaleValues(q.settings?.scaleValues)
  if (!scaleValues) {
    throw new Error(`Pergunta de escala sem settings.scaleValues: ${q.key}`)
  }

  return {
    scaleValues,
    ...(typeof q.settings?.scaleHighLabel === 'string' ? { scaleHighLabel: q.settings.scaleHighLabel } : {}),
    ...(typeof q.settings?.scaleLowLabel === 'string' ? { scaleLowLabel: q.settings.scaleLowLabel } : {}),
  }
}
type StepBuilder = (q: QuestionRow, opts: OptionRow[]) => StepDef

const STEP_BUILDERS: Record<string, StepBuilder> = {
  welcome: (q) => ({
    type: 'welcome',
    ...(q.title       ? { titulo: q.title }       : {}),
    ...(q.description ? { desc:   q.description } : {}),
    ...baseFields(q),
  }),

  nps: (q) => ({
    type: 'nps',
    key: q.key,
    ...(q.title       ? { titulo: q.title }       : {}),
    ...(q.description ? { desc:   q.description } : {}),
    perguntaBilingue: (q.settings?.perguntaBilingue as boolean) ?? false,
    ...(q.settings?.order === 'asc' || q.settings?.order === 'desc' ? { order: q.settings.order as 'asc' | 'desc' } : {}),
    ...(typeof q.settings?.lowLabel === 'string' ? { lowLabel: q.settings.lowLabel as string } : {}),
    ...(typeof q.settings?.highLabel === 'string' ? { highLabel: q.settings.highLabel as string } : {}),
    ...baseFields(q),
  }),

  scale: (q, opts) => ({
    type: 'scale',
    key: q.key,
    titulo: q.title,
    ...(q.description ? { desc: q.description } : {}),
    perguntas: opts.map(o => o.label),
    ...scaleFields(q),
    ...baseFields(q),
  }),

  scale_sections: (q, opts) => {
    // Monta seções respeitando a ordem de inserção das options
    const sectionOrder: string[] = []
    const sectionMap = new Map<string, { titulo: string; perguntas: string[] }>()
    for (const opt of opts) {
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
      ...scaleFields(q),
      ...baseFields(q),
    }
  },

  radio: (q, opts) => ({
    type: 'radio',
    key: q.key,
    titulo: q.title,
    ...(q.description ? { desc: q.description } : {}),
    pergunta: (q.settings?.pergunta as string) ?? '',
    opcoes: opts.map(o => o.label),
    obrigatorio: q.required,
    ...baseFields(q),
  }),

  text: (q) => ({
    type: 'text',
    key: q.key,
    titulo: q.title,
    ...(q.description ? { desc: q.description } : {}),
    pergunta: (q.settings?.pergunta as string) ?? '',
    ...(q.settings?.placeholder ? { placeholder: q.settings.placeholder as string } : {}),
    obrigatorio: q.required,
    ...baseFields(q),
  }),

  checkbox: (q, opts) => ({
    type: 'checkbox',
    key: q.key,
    titulo: q.title,
    ...(q.description ? { desc: q.description } : {}),
    pergunta: (q.settings?.pergunta as string) ?? '',
    opcoes: opts.map(o => o.label),
    obrigatorio: q.required,
    ...(q.settings?.minSelecoes ? { minSelecoes: q.settings.minSelecoes as number } : {}),
    ...(q.settings?.maxSelecoes ? { maxSelecoes: q.settings.maxSelecoes as number } : {}),
    ...(typeof q.settings?.sortOptions === 'boolean' ? { sortOptions: q.settings.sortOptions as boolean } : {}),
    ...baseFields(q),
  }),

  file_upload: (q) => ({
    type: 'file_upload',
    key: q.key,
    titulo: q.title,
    ...(q.description ? { desc: q.description } : {}),
    pergunta: (q.settings?.pergunta as string) ?? '',
    ...(q.settings?.accept ? { accept: q.settings.accept as string } : {}),
    obrigatorio: q.required,
    ...baseFields(q),
  }),

  thankyou: (q) => ({
    type: 'thankyou',
    ...baseFields(q),
  }),
}

/** Fallback para tipos desconhecidos: não quebra a engine */
function buildDefaultStep(q: QuestionRow): StepDef {
  return { type: 'text', key: q.key, titulo: q.title, pergunta: '', ...baseFields(q) }
}

// ─── DB rows → SurveyConfig ───────────────────────────────────────────────────
//
// Ordem de precedência do theme (menor → maior prioridade):
//   1. survey.settings.theme  (padrão global da pesquisa)
//   2. installation.theme     (override por comunidade)
//
// O theme final é sempre propagado tanto em settings quanto em installation
// para garantir que SurveyRunner acesse via qualquer dos dois caminhos.

export function rowsToConfig(
  survey: SurveyRow,
  questions: QuestionRow[],
  options: OptionRow[],
  installation?: InstallationRow
): SurveyConfig {
  const contentOverrides = asContentOverrides(installation?.settings)
  const effectiveQuestions = questions.map(q => applyQuestionTextOverride(q, contentOverrides))

  // Converte cada question em StepDef usando o strategy map
  const steps: StepDef[] = [...effectiveQuestions]
    .sort((a, b) => a.order_index - b.order_index)
    .map((q): StepDef => {
      const qOptions = options
        .filter(o => o.question_id === q.id)
        .sort((a, b) => a.order_index - b.order_index)

      const builder = STEP_BUILDERS[q.type] ?? buildDefaultStep
      return builder(q, qOptions)
    })

  // Merge de theme: surveyTheme é base, installationTheme sobrescreve
  // Sempre propagado — nunca perdido por installation vazia ou ausente
  const surveyTheme = (survey.settings as { theme?: Record<string, unknown> })?.theme ?? {}
  const installTheme = installation?.theme ?? {}
  const mergedTheme: Record<string, unknown> = {
    ...surveyTheme,
    ...installTheme,
    ...(contentOverrides.thankyou?.message ? { thankyouMessage: contentOverrides.thankyou.message } : {}),
  }

  const mergedSettings: SurveySettings = {
    ...(survey.settings ?? {}),
    ...(installation?.settings ?? {}),
    // theme final com prioridade correta
    ...(Object.keys(mergedTheme).length > 0 ? { theme: mergedTheme } : {}),
  } as SurveySettings

  const inst: SurveyInstallation | undefined = installation
    ? {
        status: installation.status as SurveyInstallation['status'],
        ...(installation.open_date  ? { open_date:  installation.open_date }  : {}),
        ...(installation.close_date ? { close_date: installation.close_date } : {}),
        // Sempre inclui o theme mergeado — nunca retorna installation sem theme
        theme: mergedTheme as SurveyInstallation['theme'],
      }
    : undefined

  return {
    id: survey.slug,
    titulo: survey.title,
    tipo_pesquisa: survey.survey_type as TipoPesquisa,
    publico: survey.target_roles as Perfil[],
    steps,
    settings: mergedSettings,
    ...(inst ? { installation: inst } : {}),
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
      // Spec desconhecida: step sempre visível (fail-open intencional)
      // ATENÇÃO: adicionar novo case aqui ao criar novos tipos de conditional
      condicional = () => true
    }

    return { ...step, condicional }
  })

  return { ...config, steps }
}

