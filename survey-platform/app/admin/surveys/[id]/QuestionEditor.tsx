'use client'

import { useRef, useState, useTransition } from 'react'

import {
  createQuestion,
  deleteQuestion,
  moveQuestion,
  saveQuestionOptions,
  toggleThankYouStep,
  toggleWelcomeStep,
  updateQuestion,
} from '../actions'
import { QuestionEditorView } from './QuestionEditorView'
import {
  applyQuestionMetadata,
  buildQuestionOptions,
  HAS_OPTIONS,
  moveQuestionLocally,
  parseOptionLabels,
  parseScaleValues,
} from './question-editor-utils'
import { useQuestionForm } from './useQuestionForm'
import type { QuestionRow } from './useQuestionForm'

interface QuestionEditorProps {
  surveyId: string
  questions: QuestionRow[]
}

export default function QuestionEditor({ surveyId, questions: initialQuestions }: QuestionEditorProps) {
  const [questions, setQuestions] = useState<QuestionRow[]>(initialQuestions)
  const [showAdd, setShowAdd] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingMetadataId, setEditingMetadataId] = useState<string | null>(null)
  const [optionsText, setOptionsText] = useState('')
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const optionRefs = useRef<(HTMLInputElement | null)[]>([])

  const form = useQuestionForm(() => {
    setShowAdd(false)
    setEditingId(null)
  })

  function resetForm() {
    form.resetForm()
    setShowAdd(false)
    setEditingMetadataId(null)
  }

  function notify(msg: string, isError = false) {
    if (isError) {
      setError(msg)
      setSuccess(null)
    } else {
      setSuccess(msg)
      setError(null)
    }
    setTimeout(() => { setError(null); setSuccess(null) }, 4000)
  }

  function updateOption(idx: number, val: string) {
    form.setFormOptions(prev => prev.map((option, i) => i === idx ? val : option))
  }

  function removeOption(idx: number) {
    form.setFormOptions(prev => {
      const removed = prev[idx]
      if (removed && removed === form.formCorrectAnswer) form.setFormCorrectAnswer('')
      return prev.filter((_, i) => i !== idx)
    })
  }

  function addOptionRow(focusIdx?: number) {
    form.setFormOptions(prev => {
      const next = [...prev, '']
      const idx = focusIdx ?? next.length - 1
      setTimeout(() => optionRefs.current[idx]?.focus(), 0)
      return next
    })
  }

  function handleOptionKeyDown(e: React.KeyboardEvent<HTMLInputElement>, idx: number) {
    if (e.key !== 'Enter') return
    e.preventDefault()
    if (idx < form.formOptions.length - 1) optionRefs.current[idx + 1]?.focus()
    else addOptionRow(form.formOptions.length)
  }

  async function handleAdd() {
    if (!form.formKey.trim()) { notify('Preencha a key da pergunta.', true); return }
    if (!form.formTitle.trim()) { notify('Preencha o título da pergunta.', true); return }

    const fd = form.buildFormData()
    startTransition(async () => {
      const res = await createQuestion(surveyId, fd)
      if (res.error) { notify(res.error, true); return }

      const labels = form.formOptions.map(option => option.trim()).filter(Boolean)
      if (res.id && HAS_OPTIONS.has(form.formType) && labels.length > 0) {
        await saveQuestionOptions(res.id, surveyId, labels)
      }

      notify('Pergunta adicionada!')
      resetForm()

      setQuestions(prev => [...prev, {
        id: res.id ?? Math.random().toString(),
        order_index: questions.length,
        type: form.formType,
        key: form.formKey,
        title: form.formTitle,
        description: form.formDesc || null,
        required: form.formRequired,
        settings: {
          pergunta: form.formPergunta,
          placeholder: form.formPlaceholder,
          accept: form.formAccept,
          correctAnswer: form.formCorrectAnswer,
          textAlign: form.formTextAlign,
          ...(form.formHideTitle ? { hideTitle: true } : {}),
          ...(form.formType === 'scale' || form.formType === 'scale_sections' ? {
            scaleValues: parseScaleValues(form.formScaleValues),
            scaleHighLabel: form.formScaleHighLabel,
            scaleLowLabel: form.formScaleLowLabel,
          } : {}),
          flowBlockId: form.formFlowBlockId,
          flowBlockLabel: form.formFlowBlockLabel,
          branchFlow: form.formBranchEnabled ? {
            type: 'answer_routes',
            ...(form.formType === 'nps' ? { answerField: 'nps' } : {}),
            routes: Object.entries(form.formBranchRoutes)
              .filter(([, blockId]) => blockId.trim())
              .map(([value, blockId]) => ({ value, blockId: blockId.trim() })),
          } : undefined,
        },
        options: buildQuestionOptions(labels),
      }])
    })
  }

  async function handleUpdateMetadata() {
    if (!editingMetadataId) return
    if (!form.formKey.trim()) { notify('Preencha a key da pergunta.', true); return }
    if (!form.formTitle.trim()) { notify('Preencha o título da pergunta.', true); return }

    const fd = form.buildFormData()
    startTransition(async () => {
      const res = await updateQuestion(editingMetadataId, surveyId, fd)
      if (res.error) { notify(res.error, true); return }

      notify('Pergunta atualizada!')
      setQuestions(prev => applyQuestionMetadata(prev, editingMetadataId, {
        type: form.formType,
        key: form.formKey,
        title: form.formTitle,
        description: form.formDesc,
        required: form.formRequired,
        pergunta: form.formPergunta,
        placeholder: form.formPlaceholder,
        accept: form.formAccept,
        correctAnswer: form.formCorrectAnswer,
        textAlign: form.formTextAlign,
        hideTitle: form.formHideTitle,
        scaleValues: form.formScaleValues,
        scaleHighLabel: form.formScaleHighLabel,
        scaleLowLabel: form.formScaleLowLabel,
        flowBlockId: form.formFlowBlockId,
        flowBlockLabel: form.formFlowBlockLabel,
        branchEnabled: form.formBranchEnabled,
        branchRoutes: form.formBranchRoutes,
      }))
      resetForm()
    })
  }

  function startEditMetadata(q: QuestionRow) {
    setEditingMetadataId(q.id)
    setEditingId(null)
    form.startEditMetadata(q)
  }

  async function handleDelete(questionId: string) {
    if (!confirm('Excluir esta pergunta? As respostas existentes serão mantidas.')) return
    startTransition(async () => {
      const res = await deleteQuestion(questionId, surveyId)
      if (res.error) { notify(res.error, true); return }
      setQuestions(prev => prev.filter(q => q.id !== questionId))
      notify('Pergunta excluída.')
    })
  }

  async function handleMove(questionId: string, direction: 'up' | 'down') {
    startTransition(async () => {
      const res = await moveQuestion(questionId, surveyId, direction)
      if (res.error) { notify(res.error, true); return }
      setQuestions(prev => moveQuestionLocally(prev, questionId, direction))
    })
  }

  async function handleSaveOptions(questionId: string) {
    const labels = parseOptionLabels(optionsText)
    startTransition(async () => {
      const res = await saveQuestionOptions(questionId, surveyId, labels)
      if (res.error) { notify(res.error, true); return }
      notify('Opções salvas!')
      setEditingId(null)
      setQuestions(prev => prev.map(q => q.id === questionId
        ? { ...q, options: buildQuestionOptions(labels) }
        : q
      ))
    })
  }

  async function handleToggleWelcome() {
    startTransition(async () => {
      const res = await toggleWelcomeStep(surveyId, !hasWelcome)
      if (res.error) { notify(res.error, true); return }
      if (!hasWelcome) {
        const newQ: QuestionRow = { id: res.id ?? crypto.randomUUID(), order_index: 0, type: 'welcome', key: 'welcome', title: 'Boas-vindas', description: null, required: false, settings: {}, options: [] }
        setQuestions(prev => [newQ, ...prev.map(q => ({ ...q, order_index: q.order_index + 1 }))])
        notify('Tela de boas-vindas adicionada.')
      } else {
        setQuestions(prev => prev.filter(q => q.type !== 'welcome'))
        notify('Tela de boas-vindas removida.')
      }
    })
  }

  async function handleToggleThankYou() {
    startTransition(async () => {
      const res = await toggleThankYouStep(surveyId, !hasThankYou)
      if (res.error) { notify(res.error, true); return }
      if (!hasThankYou) {
        const newQ: QuestionRow = { id: res.id ?? crypto.randomUUID(), order_index: questions.length, type: 'thankyou', key: 'thankyou', title: 'Agradecimento', description: null, required: false, settings: {}, options: [] }
        setQuestions(prev => [...prev, newQ])
        notify('Tela de agradecimento adicionada.')
      } else {
        setQuestions(prev => prev.filter(q => q.type !== 'thankyou'))
        notify('Tela de agradecimento removida.')
      }
    })
  }

  function openAddForm() {
    setShowAdd(true)
    setEditingMetadataId(null)
    setEditingId(null)
    form.resetForm()
    form.setFormType('text')
  }

  const sorted = [...questions].sort((a, b) => a.order_index - b.order_index)
  const hasWelcome = questions.some(q => q.type === 'welcome')
  const hasThankYou = questions.some(q => q.type === 'thankyou')

  return (
    <QuestionEditorView
      error={error}
      success={success}
      hasWelcome={hasWelcome}
      hasThankYou={hasThankYou}
      isPending={isPending}
      sorted={sorted}
      questions={questions}
      showAdd={showAdd}
      editingId={editingId}
      editingMetadataId={editingMetadataId}
      optionsText={optionsText}
      canAdd
      form={form}
      optionRefs={optionRefs}
      onToggleWelcome={() => void handleToggleWelcome()}
      onToggleThankYou={() => void handleToggleThankYou()}
      onOpenAdd={openAddForm}
      onResetForm={resetForm}
      onStartEditMetadata={startEditMetadata}
      onDelete={questionId => void handleDelete(questionId)}
      onMove={(questionId, direction) => void handleMove(questionId, direction)}
      onSetOptionsText={setOptionsText}
      onSetEditingId={setEditingId}
      onClearEditingMetadata={() => setEditingMetadataId(null)}
      onSaveOptions={questionId => void handleSaveOptions(questionId)}
      onAdd={() => void handleAdd()}
      onUpdateMetadata={() => void handleUpdateMetadata()}
      onUpdateOption={updateOption}
      onRemoveOption={removeOption}
      onAddOptionRow={addOptionRow}
      onOptionKeyDown={handleOptionKeyDown}
    />
  )
}
