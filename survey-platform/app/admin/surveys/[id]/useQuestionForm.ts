'use client'

import { useState } from 'react'

export interface QuestionRow {
  id: string
  order_index: number
  type: string
  key: string
  title: string
  description: string | null
  required: boolean
  settings: Record<string, unknown>
  options: { id: string; order_index: number; label: string }[]
}

export interface QuestionFormState {
  formType: string
  formTitle: string
  formKey: string
  keyEdited: boolean
  formDesc: string
  formPergunta: string
  formPlaceholder: string
  formAccept: string
  formRequired: boolean
  formOptions: string[]
  formCorrectAnswer: string
  formQuizMode: boolean
  formTextAlign: 'left' | 'center' | 'right' | 'justify'
  formScaleValues: string
  formScaleHighLabel: string
  formScaleLowLabel: string
  formFlowBlockId: string
  formFlowBlockLabel: string
  formBranchEnabled: boolean
  formBranchRoutes: Record<string, string>
}

export interface QuestionFormActions {
  setFormType: (v: string) => void
  setFormTitle: (v: string) => void
  setFormKey: (v: string) => void
  setKeyEdited: (v: boolean) => void
  setFormDesc: (v: string) => void
  setFormPergunta: (v: string) => void
  setFormPlaceholder: (v: string) => void
  setFormAccept: (v: string) => void
  setFormRequired: (v: boolean) => void
  setFormOptions: React.Dispatch<React.SetStateAction<string[]>>
  setFormCorrectAnswer: (v: string) => void
  setFormQuizMode: (v: boolean) => void
  setFormTextAlign: (v: 'left' | 'center' | 'right' | 'justify') => void
  setFormScaleValues: (v: string) => void
  setFormScaleHighLabel: (v: string) => void
  setFormScaleLowLabel: (v: string) => void
  setFormFlowBlockId: (v: string) => void
  setFormFlowBlockLabel: (v: string) => void
  setFormBranchEnabled: (v: boolean) => void
  setFormBranchRoutes: React.Dispatch<React.SetStateAction<Record<string, string>>>
  handleTitleChange: (val: string) => void
  startEditMetadata: (q: QuestionRow) => void
  resetForm: () => void
  buildFormData: () => FormData
}

function formatScaleValues(value: unknown): string {
  if (!Array.isArray(value)) return ''
  return value
    .map(item => typeof item === 'number' ? item : Number(item))
    .filter(item => Number.isInteger(item))
    .join(', ')
}
function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 40)
}

/**
 * Hook que centraliza todo o estado e handlers do formulário de pergunta.
 * Extrai 14 useState do QuestionEditor, reduzindo CC e isolando responsabilidade.
 */
export function useQuestionForm(
  onEditStart: () => void
): QuestionFormState & QuestionFormActions {
  const [formType, setFormType]                 = useState('text')
  const [formTitle, setFormTitle]               = useState('')
  const [formKey, setFormKey]                   = useState('')
  const [keyEdited, setKeyEdited]             = useState(false)
  const [formDesc, setFormDesc]                 = useState('')
  const [formPergunta, setFormPergunta]         = useState('')
  const [formPlaceholder, setFormPlaceholder]   = useState('')
  const [formAccept, setFormAccept]             = useState('')
  const [formRequired, setFormRequired]         = useState(true)
  const [formOptions, setFormOptions]           = useState<string[]>(['', ''])
  const [formCorrectAnswer, setFormCorrectAnswer] = useState('')
  const [formQuizMode, setFormQuizMode]         = useState(false)
  const [formTextAlign, setFormTextAlign]       = useState<'left' | 'center' | 'right' | 'justify'>('left')
  const [formScaleValues, setFormScaleValues]   = useState('')
  const [formScaleHighLabel, setFormScaleHighLabel] = useState('')
  const [formScaleLowLabel, setFormScaleLowLabel] = useState('')
  const [formFlowBlockId, setFormFlowBlockId]   = useState('')
  const [formFlowBlockLabel, setFormFlowBlockLabel] = useState('')
  const [formBranchEnabled, setFormBranchEnabled] = useState(false)
  const [formBranchRoutes, setFormBranchRoutes] = useState<Record<string, string>>({})

  function handleTitleChange(val: string) {
    setFormTitle(val)
    if (!keyEdited) setFormKey(slugify(val))
  }

  function startEditMetadata(q: QuestionRow) {
    onEditStart()
    setFormType(q.type)
    setFormTitle(q.title)
    setFormKey(q.key)
    setFormDesc(q.description || '')
    setFormRequired(q.required)
    setFormPergunta((q.settings?.pergunta as string) || '')
    setFormPlaceholder((q.settings?.placeholder as string) || '')
    setFormAccept((q.settings?.accept as string) || '')
    setFormCorrectAnswer((q.settings?.correctAnswer as string) || '')
    setFormQuizMode(!!(q.settings?.correctAnswer as string))
    setFormTextAlign((q.settings?.textAlign as 'left' | 'center' | 'right' | 'justify') || 'left')
    setFormScaleValues(formatScaleValues(q.settings?.scaleValues))
    setFormScaleHighLabel((q.settings?.scaleHighLabel as string) || '')
    setFormScaleLowLabel((q.settings?.scaleLowLabel as string) || '')
    setFormFlowBlockId((q.settings?.flowBlockId as string) || '')
    setFormFlowBlockLabel((q.settings?.flowBlockLabel as string) || '')
    const branchFlow = q.settings?.branchFlow as { routes?: { value: string; blockId: string }[] } | undefined
    setFormBranchEnabled(branchFlow?.routes ? branchFlow.routes.length > 0 : false)
    setFormBranchRoutes(Object.fromEntries((branchFlow?.routes ?? []).map(route => [route.value, route.blockId])))
    setKeyEdited(true)
  }

  function resetForm() {
    setFormKey(''); setFormTitle(''); setFormDesc(''); setFormPergunta('')
    setFormPlaceholder(''); setFormAccept(''); setFormOptions(['', ''])
    setFormCorrectAnswer(''); setFormQuizMode(false); setFormRequired(true)
    setFormTextAlign('left')
    setFormScaleValues(''); setFormScaleHighLabel(''); setFormScaleLowLabel('')
    setFormFlowBlockId(''); setFormFlowBlockLabel(''); setFormBranchEnabled(false); setFormBranchRoutes({})
    setKeyEdited(false)
  }

  /** Constrói um FormData com os valores atuais — usado pelo handler de submit */
  function buildFormData(): FormData {
    const fd = new FormData()
    fd.set('type', formType)
    fd.set('key', formKey)
    fd.set('title', formTitle)
    fd.set('description', formDesc)
    fd.set('required', String(formRequired))
    fd.set('pergunta', formPergunta)
    fd.set('placeholder', formPlaceholder)
    fd.set('accept', formAccept)
    fd.set('textAlign', formTextAlign)
    if (formType === 'scale' || formType === 'scale_sections') {
      fd.set('scaleValues', formScaleValues)
      fd.set('scaleHighLabel', formScaleHighLabel)
      fd.set('scaleLowLabel', formScaleLowLabel)
    }
    if (formCorrectAnswer) fd.set('correctAnswer', formCorrectAnswer)
    if (formFlowBlockId.trim()) fd.set('flowBlockId', formFlowBlockId.trim())
    if (formFlowBlockLabel.trim()) fd.set('flowBlockLabel', formFlowBlockLabel.trim())
    if (formBranchEnabled) fd.set('branchRoutes', JSON.stringify(formBranchRoutes))
    return fd
  }

  return {
    formType, formTitle, formKey, keyEdited,
    formDesc, formPergunta, formPlaceholder, formAccept,
    formRequired, formOptions, formCorrectAnswer, formQuizMode, formTextAlign,
    formScaleValues, formScaleHighLabel, formScaleLowLabel,
    formFlowBlockId, formFlowBlockLabel, formBranchEnabled, formBranchRoutes,
    setFormType, setFormTitle, setFormKey, setKeyEdited,
    setFormDesc, setFormPergunta, setFormPlaceholder, setFormAccept,
    setFormRequired, setFormOptions, setFormCorrectAnswer, setFormQuizMode, setFormTextAlign,
    setFormScaleValues, setFormScaleHighLabel, setFormScaleLowLabel,
    setFormFlowBlockId, setFormFlowBlockLabel, setFormBranchEnabled, setFormBranchRoutes,
    handleTitleChange, startEditMetadata, resetForm, buildFormData,
  }
}
