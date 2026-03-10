// ─── Tipos de perfil e pesquisa ───────────────────────────────────────────────
export type Perfil = 'responsavel' | 'aluno'
export type TipoPesquisa = 'quantitativa' | 'qualitativa'
export type SurveyStatus = 'aberta' | 'nao_aberta' | 'encerrada'

// ─── Respostas ────────────────────────────────────────────────────────────────
export type Answers = Record<string, unknown>

// ─── Spec serializável de condicional (trafega em JSON entre API e cliente) ───
export interface ConditionalDef {
  type: 'answer_field_equals'
  answerKey: string
  field: string
  value: string
}

// ─── Seção de escala (bilíngue etc.) ─────────────────────────────────────────
export interface StepSection {
  key: string
  titulo: string
  perguntas: string[]
}

// ─── Definições de step ───────────────────────────────────────────────────────
interface BaseStep {
  somentePara?: Perfil
  condicional?: (answers: Answers) => boolean
  conditional_on?: ConditionalDef   // spec serializável — reconstruído por applyConditionals()
}

export interface WelcomeStepDef extends BaseStep {
  type: 'welcome'
  key?: string
}

export interface NPSStepDef extends BaseStep {
  type: 'nps'
  key: string
  perguntaBilingue?: boolean
}

export interface ScaleStepDef extends BaseStep {
  type: 'scale'
  key: string
  titulo: string
  desc?: string
  perguntas?: string[]
  secoes?: StepSection[]
}

export interface RadioStepDef extends BaseStep {
  type: 'radio'
  key: string
  titulo: string
  desc?: string
  pergunta: string
  opcoes: string[]
  obrigatorio?: boolean
}

export interface TextStepDef extends BaseStep {
  type: 'text'
  key: string
  titulo: string
  desc?: string
  pergunta: string
  placeholder?: string
  obrigatorio?: boolean
}

export interface ThankYouStepDef extends BaseStep {
  type: 'thankyou'
  key?: string
}

export type StepDef =
  | WelcomeStepDef
  | NPSStepDef
  | ScaleStepDef
  | RadioStepDef
  | TextStepDef
  | ThankYouStepDef

// ─── Config de pesquisa ───────────────────────────────────────────────────────
export interface SurveyConfig {
  id: string
  titulo: string
  tipo_pesquisa: TipoPesquisa
  publico: Perfil[]
  steps: StepDef[]
}

// ─── Contexto de sessão ───────────────────────────────────────────────────────
export interface SurveyContext {
  userId: string
  communityId: string
  session: string
  surveyId: string
  onda: string
  openDate: string
  closeDate: string
  status: SurveyStatus
  school: string
  tipo: string
  nome: string
  perfil: Perfil
  nomeAluno: string
  serie: string
}

// ─── Resposta NPS ─────────────────────────────────────────────────────────────
export interface NPSAnswer {
  nps: number
  participa_bilingue?: string
}
