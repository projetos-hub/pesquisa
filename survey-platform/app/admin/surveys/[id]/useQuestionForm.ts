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
  handleTitleChange: (val: string) => void
  startEditMetadata: (q: QuestionRow) => void
  resetForm: () => void
  buildFormData: () => FormData
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
    setKeyEdited(true)
  }

  function resetForm() {
    setFormKey(''); setFormTitle(''); setFormDesc(''); setFormPergunta('')
    setFormPlaceholder(''); setFormAccept(''); setFormOptions(['', ''])
    setFormCorrectAnswer(''); setFormQuizMode(false); setFormRequired(true)
    setFormTextAlign('left')
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
    if (formCorrectAnswer) fd.set('correctAnswer', formCorrectAnswer)
    return fd
  }

  return {
    formType, formTitle, formKey, keyEdited,
    formDesc, formPergunta, formPlaceholder, formAccept,
    formRequired, formOptions, formCorrectAnswer, formQuizMode, formTextAlign,
    setFormType, setFormTitle, setFormKey, setKeyEdited,
    setFormDesc, setFormPergunta, setFormPlaceholder, setFormAccept,
    setFormRequired, setFormOptions, setFormCorrectAnswer, setFormQuizMode, setFormTextAlign,
    handleTitleChange, startEditMetadata, resetForm, buildFormData,
  }
}
