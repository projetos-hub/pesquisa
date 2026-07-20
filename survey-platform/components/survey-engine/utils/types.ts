// ─── Tipos de perfil e pesquisa ───────────────────────────────────────────────
export type Perfil = 'responsavel' | 'aluno' | 'colaborador'
export type TipoPesquisa = 'quantitativa' | 'qualitativa'
export type SurveyStatus = 'ativa' | 'nao_aberta' | 'encerrada' | 'pausada'
export type TextAlign = 'left' | 'center' | 'right' | 'justify'

// ─── Respostas ────────────────────────────────────────────────────────────────
export type Answers = Record<string, unknown>

// ─── Spec serializável de condicional (trafega em JSON entre API e cliente) ───
export interface ConditionalDef {
  type: 'answer_field_equals'
  answerKey: string
  field: string
  value: string
}

export interface BranchRouteDef {
  value: string
  blockId: string
  blockLabel?: string
}

export interface BranchFlowDef {
  type: 'answer_routes'
  answerField?: string
  routes: BranchRouteDef[]
  defaultBlockId?: string
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
  flowBlockId?: string
  flowBlockLabel?: string
  branchFlow?: BranchFlowDef
  textAlign?: TextAlign
  hideTitle?: boolean
}

export interface WelcomeStepDef extends BaseStep {
  type: 'welcome'
  key?: string
  titulo?: string
  desc?: string
}

export interface NPSStepDef extends BaseStep {
  type: 'nps'
  key: string
  perguntaBilingue?: boolean
  order?: 'asc' | 'desc'
  lowLabel?: string
  highLabel?: string
  titulo?: string
  desc?: string
}

export interface ScaleStepDef extends BaseStep {
  type: 'scale'
  key: string
  titulo: string
  desc?: string
  perguntas?: string[]
  secoes?: StepSection[]
  scaleValues: number[]
  scaleHighLabel?: string
  scaleLowLabel?: string
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

export interface CheckboxStepDef extends BaseStep {
  type: 'checkbox'
  key: string
  titulo: string
  desc?: string
  pergunta: string
  opcoes: string[]
  obrigatorio?: boolean
  minSelecoes?: number
  maxSelecoes?: number
  sortOptions?: boolean
}

export interface FileUploadStepDef extends BaseStep {
  type: 'file_upload'
  key: string
  titulo: string
  desc?: string
  pergunta: string
  accept?: string   // e.g. ".pdf,.jpg,.png"
  obrigatorio?: boolean
}

export type StepDef =
  | WelcomeStepDef
  | NPSStepDef
  | ScaleStepDef
  | RadioStepDef
  | TextStepDef
  | ThankYouStepDef
  | CheckboxStepDef
  | FileUploadStepDef

// ─── Tema visual por comunidade ───────────────────────────────────────────────
export interface SurveyTheme {
  primaryColor?: string
  secondaryColor?: string
  logo?: string
  nomeEscola?: string
  marca?: string
  unidade?: string
  programaMais?: string
  equipeMarca?: string
  welcomeMessage?: string
  thankyouMessage?: string
  welcomeTextAlign?: TextAlign
  thankyouTextAlign?: TextAlign
  indicacaoLink?: string
}

// ─── Config de pesquisa ───────────────────────────────────────────────────────
export interface SurveySettings {
  indicacao_links?: Record<string, string>
  theme?: SurveyTheme
}

// ─── Instalação da pesquisa por comunidade ────────────────────────────────────
export interface SurveyInstallation {
  status: 'ativa' | 'pausada' | 'encerrada' | 'nao_aberta'
  open_date?: string
  close_date?: string
  theme?: SurveyTheme
}

export interface SurveyConfig {
  id: string
  titulo: string
  tipo_pesquisa: TipoPesquisa
  publico: Perfil[]
  steps: StepDef[]
  settings?: SurveySettings
  installation?: SurveyInstallation
}

// ─── Contexto de sessão ───────────────────────────────────────────────────────
export interface SurveyContext {
  userId: string
  communityId: string
  accountId: string
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
  turma: string
  email: string
  layersMeta: Record<string, unknown>
}

// ─── Resposta NPS ─────────────────────────────────────────────────────────────
export interface NPSAnswer {
  nps: number
  participa_bilingue?: string
}

