import type { QuestionRow } from './useQuestionForm'

export const QUESTION_TYPES = [
  { value: 'text', label: 'Texto livre', icon: '📝', desc: 'Campo de texto aberto' },
  { value: 'radio', label: 'Múltipla escolha', icon: '⭕', desc: 'Seleciona uma opção' },
  { value: 'checkbox', label: 'Caixas de seleção', icon: '☑️', desc: 'Seleciona várias opções' },
  { value: 'scale', label: 'Escala linear', icon: '*', desc: 'Notas configuraveis' },
  { value: 'nps', label: 'NPS (0–10)', icon: '📊', desc: 'Recomendação 0 a 10' },
  { value: 'file_upload', label: 'Envio de arquivo', icon: '📎', desc: 'Upload de documento' },
]

export const HAS_OPTIONS = new Set(['radio', 'checkbox', 'scale'])
export const BRANCHABLE_TYPES = new Set(['radio', 'checkbox', 'nps'])
export const HAS_PERGUNTA = new Set(['radio', 'checkbox', 'text', 'file_upload'])

export function getBranchRouteOptions(type: string, options: string[]): string[] {
  if (type === 'nps') return ['10', '9', '8', '7', '6', '5', '4', '3', '2', '1', '0']
  if (type === 'radio' || type === 'checkbox') return options
  return []
}
export function typeLabel(type: string) {
  if (type === 'thankyou') return 'Agradecimento'
  if (type === 'welcome') return 'Boas-vindas'
  return QUESTION_TYPES.find(t => t.value === type)?.label ?? type
}

export function typeIcon(type: string) {
  if (type === 'thankyou') return '🙏'
  if (type === 'welcome') return '👋'
  return QUESTION_TYPES.find(t => t.value === type)?.icon ?? '❓'
}

export function parseOptionLabels(optionsText: string): string[] {
  return optionsText.split('\n').map(label => label.trim()).filter(Boolean)
}

export function parseScaleValues(scaleValues: string): number[] {
  return scaleValues
    .split(/[\s,;]+/)
    .map(value => Number(value.trim()))
    .filter(value => Number.isInteger(value))
}
export function buildQuestionOptions(labels: string[]): QuestionRow['options'] {
  return labels.map((label, i) => ({ id: `${i}`, order_index: i, label }))
}

export function moveQuestionLocally(
  questions: QuestionRow[],
  questionId: string,
  direction: 'up' | 'down'
): QuestionRow[] {
  const list = [...questions]
  const idx = list.findIndex(q => q.id === questionId)
  const swap = direction === 'up' ? idx - 1 : idx + 1
  if (idx < 0 || swap < 0 || swap >= list.length) return list

  ;[list[idx].order_index, list[swap].order_index] = [list[swap].order_index, list[idx].order_index]
  return [...list].sort((a, b) => a.order_index - b.order_index)
}

export function applyQuestionMetadata(
  questions: QuestionRow[],
  questionId: string,
  metadata: {
    type: string
    key: string
    title: string
    description: string
    required: boolean
    pergunta: string
    placeholder: string
    accept: string
    correctAnswer: string
    textAlign: string
    scaleValues: string
    scaleHighLabel: string
    scaleLowLabel: string
    flowBlockId: string
    flowBlockLabel: string
    branchEnabled: boolean
    branchRoutes: Record<string, string>
  }
): QuestionRow[] {
  return questions.map(q => q.id === questionId
    ? {
        ...q,
        type: metadata.type,
        key: metadata.key,
        title: metadata.title,
        description: metadata.description || null,
        required: metadata.required,
        settings: {
          ...q.settings,
          pergunta: metadata.pergunta,
          placeholder: metadata.placeholder,
          accept: metadata.accept,
          correctAnswer: metadata.correctAnswer,
          textAlign: metadata.textAlign,
          ...(metadata.type === 'scale' || metadata.type === 'scale_sections' ? {
            scaleValues: parseScaleValues(metadata.scaleValues),
            scaleHighLabel: metadata.scaleHighLabel,
            scaleLowLabel: metadata.scaleLowLabel,
          } : {}),
          flowBlockId: metadata.flowBlockId,
          flowBlockLabel: metadata.flowBlockLabel,
          branchFlow: metadata.branchEnabled ? {
            type: 'answer_routes',
            ...(metadata.type === 'nps' ? { answerField: 'nps' } : {}),
            routes: Object.entries(metadata.branchRoutes)
              .filter(([, blockId]) => blockId.trim())
              .map(([value, blockId]) => ({ value, blockId: blockId.trim() })),
          } : undefined,
        },
      }
    : q
  )
}
