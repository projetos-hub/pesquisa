import { renderPlaceholders } from '@/lib/placeholders/render'
import type {
  BranchFlowDef,
  CheckboxStepDef,
  FileUploadStepDef,
  NPSStepDef,
  RadioStepDef,
  ScaleStepDef,
  StepDef,
  SurveyConfig,
  TextStepDef,
  WelcomeStepDef,
} from './types'

export type StepPlaceholderVars = Record<string, string | undefined>

function renderText(value: string | undefined, vars: StepPlaceholderVars): string | undefined {
  return value ? renderPlaceholders(value, vars) : value
}

function renderBranchFlow(flow: BranchFlowDef | undefined, vars: StepPlaceholderVars): BranchFlowDef | undefined {
  if (!flow) return flow
  return {
    ...flow,
    routes: flow.routes.map(route => ({
      ...route,
      value: renderPlaceholders(route.value, vars),
      blockLabel: renderText(route.blockLabel, vars),
    })),
    defaultBlockId: flow.defaultBlockId,
  }
}

function renderBase<T extends StepDef>(step: T, vars: StepPlaceholderVars): T {
  return {
    ...step,
    flowBlockLabel: renderText(step.flowBlockLabel, vars),
    branchFlow: renderBranchFlow(step.branchFlow, vars),
  }
}

function renderStep(step: StepDef, vars: StepPlaceholderVars): StepDef {
  const base = renderBase(step, vars)

  switch (base.type) {
    case 'welcome': {
      const s = base as WelcomeStepDef
      return { ...s, titulo: renderText(s.titulo, vars), desc: renderText(s.desc, vars) }
    }
    case 'nps': {
      const s = base as NPSStepDef
      return {
        ...s,
        titulo: renderText(s.titulo, vars),
        desc: renderText(s.desc, vars),
        lowLabel: renderText(s.lowLabel, vars),
        highLabel: renderText(s.highLabel, vars),
      }
    }
    case 'scale': {
      const s = base as ScaleStepDef
      return {
        ...s,
        titulo: renderPlaceholders(s.titulo, vars),
        desc: renderText(s.desc, vars),
        perguntas: s.perguntas?.map(item => renderPlaceholders(item, vars)),
        secoes: s.secoes?.map(section => ({
          ...section,
          titulo: renderPlaceholders(section.titulo, vars),
          perguntas: section.perguntas.map(item => renderPlaceholders(item, vars)),
        })),
      }
    }
    case 'radio': {
      const s = base as RadioStepDef
      return {
        ...s,
        titulo: renderPlaceholders(s.titulo, vars),
        desc: renderText(s.desc, vars),
        pergunta: renderPlaceholders(s.pergunta, vars),
        opcoes: s.opcoes.map(item => renderPlaceholders(item, vars)),
      }
    }
    case 'text': {
      const s = base as TextStepDef
      return {
        ...s,
        titulo: renderPlaceholders(s.titulo, vars),
        desc: renderText(s.desc, vars),
        pergunta: renderPlaceholders(s.pergunta, vars),
        placeholder: renderText(s.placeholder, vars),
      }
    }
    case 'checkbox': {
      const s = base as CheckboxStepDef
      return {
        ...s,
        titulo: renderPlaceholders(s.titulo, vars),
        desc: renderText(s.desc, vars),
        pergunta: renderPlaceholders(s.pergunta, vars),
        opcoes: s.opcoes.map(item => renderPlaceholders(item, vars)),
      }
    }
    case 'file_upload': {
      const s = base as FileUploadStepDef
      return {
        ...s,
        titulo: renderPlaceholders(s.titulo, vars),
        desc: renderText(s.desc, vars),
        pergunta: renderPlaceholders(s.pergunta, vars),
      }
    }
    default:
      return base
  }
}

export function applyStepPlaceholders(config: SurveyConfig, vars: StepPlaceholderVars): SurveyConfig {
  return {
    ...config,
    titulo: renderPlaceholders(config.titulo, vars),
    steps: config.steps.map(step => renderStep(step, vars)),
  }
}