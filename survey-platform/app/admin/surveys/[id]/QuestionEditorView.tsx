'use client'

import type React from 'react'
import type { MutableRefObject } from 'react'

import { QuestionCard } from './QuestionCard'
import { QuestionEditorForm, ThankYouEditorForm } from './QuestionEditorForm'
import type { QuestionFormActions, QuestionFormState, QuestionRow } from './useQuestionForm'

type QuestionForm = QuestionFormState & QuestionFormActions

interface QuestionEditorViewProps {
  error: string | null
  success: string | null
  hasWelcome: boolean
  hasThankYou: boolean
  isPending: boolean
  sorted: QuestionRow[]
  questions: QuestionRow[]
  showAdd: boolean
  editingId: string | null
  editingMetadataId: string | null
  optionsText: string
  canAdd: boolean
  form: QuestionForm
  optionRefs: MutableRefObject<(HTMLInputElement | null)[]>
  onToggleWelcome: () => void
  onToggleThankYou: () => void
  onOpenAdd: () => void
  onResetForm: () => void
  onStartEditMetadata: (q: QuestionRow) => void
  onDelete: (questionId: string) => void
  onMove: (questionId: string, direction: 'up' | 'down') => void
  onSetOptionsText: (value: string) => void
  onSetEditingId: (value: string | null) => void
  onClearEditingMetadata: () => void
  onSaveOptions: (questionId: string) => void
  onAdd: () => void
  onUpdateMetadata: () => void
  onUpdateOption: (idx: number, val: string) => void
  onRemoveOption: (idx: number) => void
  onAddOptionRow: (focusIdx?: number) => void
  onOptionKeyDown: (e: React.KeyboardEvent<HTMLInputElement>, idx: number) => void
}

export function QuestionEditorView(props: QuestionEditorViewProps) {
  const {
    error, success, hasWelcome, hasThankYou, isPending, sorted, questions,
    showAdd, editingId, editingMetadataId, optionsText, canAdd, form, optionRefs,
  } = props

  const formProps = {
    form,
    questions,
    editingMetadataId,
    optionRefs,
    isPending,
    canAdd,
    onAdd: props.onAdd,
    onUpdateMetadata: props.onUpdateMetadata,
    onReset: props.onResetForm,
    onUpdateOption: props.onUpdateOption,
    onRemoveOption: props.onRemoveOption,
    onAddOptionRow: props.onAddOptionRow,
    onOptionKeyDown: props.onOptionKeyDown,
  }

  return (
    <div>
      {error && <div style={{ background: '#fff5f5', border: '1px solid #fed7d7', color: '#c53030', borderRadius: 8, padding: '10px 14px', marginBottom: 12, fontSize: '.875rem' }}>⚠️ {error}</div>}
      {success && <div style={{ background: '#f0fff4', border: '1px solid #c6f6d5', color: '#276749', borderRadius: 8, padding: '10px 14px', marginBottom: 12, fontSize: '.875rem' }}>✓ {success}</div>}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
        <SpecialStepToggle active={hasWelcome} icon="👋" label="Boas-vindas" activeText="ativa" inactiveText="off" onClick={props.onToggleWelcome} isPending={isPending} />
        <SpecialStepToggle active={hasThankYou} icon="🙏" label="Agradecimento" activeText="ativo" inactiveText="off" onClick={props.onToggleThankYou} isPending={isPending} />
      </div>

      {sorted.length === 0 && !showAdd && (
        <p style={{ color: '#a0aec0', fontSize: '.9rem', textAlign: 'center', padding: '24px 0' }}>
          Nenhuma pergunta adicionada ainda.
        </p>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {sorted.map((q, idx) => (
          <div key={q.id}>
            {editingMetadataId === q.id ? (
              q.type === 'thankyou'
                ? <ThankYouEditorForm onReset={props.onResetForm} />
                : <QuestionEditorForm isEdit {...formProps} />
            ) : (
              <QuestionCard
                q={q}
                idx={idx}
                total={sorted.length}
                isPending={isPending}
                isEditingOptions={editingId === q.id}
                optionsText={optionsText}
                hideMetadataAction={!!editingId}
                onMove={props.onMove}
                onDelete={props.onDelete}
                onStartEditMetadata={props.onStartEditMetadata}
                onSetOptionsText={props.onSetOptionsText}
                onSetEditingId={props.onSetEditingId}
                onClearEditingMetadata={props.onClearEditingMetadata}
                onSaveOptions={props.onSaveOptions}
              />
            )}
          </div>
        ))}
      </div>

      {showAdd ? (
        <QuestionEditorForm isEdit={false} {...formProps} />
      ) : (
        <button onClick={props.onOpenAdd}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            width: '100%',
            marginTop: 12,
            padding: '10px 16px',
            border: '2px dashed #cbd5e0',
            borderRadius: 10,
            background: 'none',
            cursor: 'pointer',
            color: '#718096',
            fontSize: '.9rem',
          }}>
          <span style={{ fontSize: '1.2rem' }}>+</span> Adicionar pergunta
        </button>
      )}
    </div>
  )
}

function SpecialStepToggle({
  active,
  icon,
  label,
  activeText,
  inactiveText,
  onClick,
  isPending,
}: {
  active: boolean
  icon: string
  label: string
  activeText: string
  inactiveText: string
  onClick: () => void
  isPending: boolean
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', borderRadius: 8, background: active ? '#f0fff4' : '#f7fafc', border: `1px solid ${active ? '#c6f6d5' : '#e2e8f0'}` }}>
      <span style={{ fontSize: '1.1rem' }}>{icon}</span>
      <span style={{ fontSize: '.875rem', color: '#2d3748', flex: 1 }}>
        {label} {active ? <strong style={{ color: '#276749' }}>{activeText}</strong> : <span style={{ color: '#a0aec0' }}>{inactiveText}</span>}
      </span>
      <button onClick={onClick} disabled={isPending}
        style={{
          fontSize: '.8rem',
          padding: '5px 10px',
          borderRadius: 6,
          border: '1px solid',
          cursor: 'pointer',
          background: active ? '#fff5f5' : '#667eea',
          color: active ? '#c53030' : '#fff',
          borderColor: active ? '#fed7d7' : '#667eea',
        }}>
        {active ? 'Remover' : 'Ativar'}
      </button>
    </div>
  )
}
