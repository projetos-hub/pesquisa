'use client'

import { HAS_OPTIONS, typeIcon, typeLabel } from './question-editor-utils'
import type { QuestionRow } from './useQuestionForm'

interface QuestionCardProps {
  q: QuestionRow
  idx: number
  total: number
  isPending: boolean
  isEditingOptions: boolean
  optionsText: string
  hideMetadataAction: boolean
  onMove: (questionId: string, direction: 'up' | 'down') => void
  onDelete: (questionId: string) => void
  onStartEditMetadata: (q: QuestionRow) => void
  onSetOptionsText: (value: string) => void
  onSetEditingId: (value: string | null) => void
  onClearEditingMetadata: () => void
  onSaveOptions: (questionId: string) => void
}

export function QuestionCard({
  q,
  idx,
  total,
  isPending,
  isEditingOptions,
  optionsText,
  hideMetadataAction,
  onMove,
  onDelete,
  onStartEditMetadata,
  onSetOptionsText,
  onSetEditingId,
  onClearEditingMetadata,
  onSaveOptions,
}: QuestionCardProps) {
  return (
    <div style={{ border: '1px solid #e2e8f0', borderRadius: 10, padding: '14px 16px', background: '#fff' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2, paddingTop: 2 }}>
          <button onClick={() => onMove(q.id, 'up')} disabled={idx === 0 || isPending}
            style={{ background: 'none', border: 'none', cursor: idx === 0 ? 'default' : 'pointer', color: idx === 0 ? '#e2e8f0' : '#718096', fontSize: '.8rem', padding: '0 4px' }}>▲</button>
          <button onClick={() => onMove(q.id, 'down')} disabled={idx === total - 1 || isPending}
            style={{ background: 'none', border: 'none', cursor: idx === total - 1 ? 'default' : 'pointer', color: idx === total - 1 ? '#e2e8f0' : '#718096', fontSize: '.8rem', padding: '0 4px' }}>▼</button>
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <span style={{ fontSize: '1.1rem' }}>{typeIcon(q.type)}</span>
            <span style={{ fontWeight: 600, color: '#2d3748', fontSize: '.95rem' }}>{q.title}</span>
            {q.required && <span style={{ fontSize: '.7rem', background: '#fed7d7', color: '#c53030', borderRadius: 4, padding: '1px 6px' }}>obrigatório</span>}
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '.78rem', color: '#718096', background: '#f7fafc', border: '1px solid #e2e8f0', borderRadius: 4, padding: '2px 8px' }}>{typeLabel(q.type)}</span>
            <span style={{ fontSize: '.78rem', color: '#a0aec0', fontFamily: 'monospace' }}>key: {q.key}</span>
          </div>
          {q.description && <p style={{ fontSize: '.82rem', color: '#718096', marginTop: 4, marginBottom: 0 }}>{q.description}</p>}

          {HAS_OPTIONS.has(q.type) && (
            <div style={{ marginTop: 8 }}>
              {isEditingOptions ? (
                <OptionTextEditor
                  questionId={q.id}
                  optionsText={optionsText}
                  isPending={isPending}
                  onSetOptionsText={onSetOptionsText}
                  onSetEditingId={onSetEditingId}
                  onSaveOptions={onSaveOptions}
                />
              ) : (
                <OptionSummary
                  q={q}
                  onStart={() => {
                    onSetOptionsText(q.options.map(o => o.label).join('\n'))
                    onSetEditingId(q.id)
                    onClearEditingMetadata()
                  }}
                />
              )}
            </div>
          )}

          {!hideMetadataAction && (
            <div style={{ marginTop: 8 }}>
              <button
                onClick={() => onStartEditMetadata(q)}
                style={{ fontSize: '.78rem', color: '#667eea', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                Editar metadados →
              </button>
            </div>
          )}
        </div>

        <button onClick={() => onDelete(q.id)} disabled={isPending}
          style={{ color: '#e53e3e', background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.1rem', padding: '0 4px', flexShrink: 0 }}
          title="Excluir pergunta">🗑</button>
      </div>
    </div>
  )
}

function OptionTextEditor({
  questionId,
  optionsText,
  isPending,
  onSetOptionsText,
  onSetEditingId,
  onSaveOptions,
}: {
  questionId: string
  optionsText: string
  isPending: boolean
  onSetOptionsText: (value: string) => void
  onSetEditingId: (value: string | null) => void
  onSaveOptions: (questionId: string) => void
}) {
  return (
    <div>
      <p style={{ fontSize: '.8rem', color: '#4a5568', marginBottom: 4 }}>Uma opção por linha:</p>
      <textarea
        value={optionsText}
        onChange={e => onSetOptionsText(e.target.value)}
        rows={Math.max(4, optionsText.split('\n').length + 1)}
        style={{ width: '100%', fontSize: '.85rem', border: '1px solid #e2e8f0', borderRadius: 6, padding: '8px', fontFamily: 'inherit', resize: 'vertical', boxSizing: 'border-box' }}
      />
      <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
        <button onClick={() => onSaveOptions(questionId)} disabled={isPending}
          style={{ fontSize: '.8rem', background: '#667eea', color: '#fff', border: 'none', borderRadius: 6, padding: '6px 14px', cursor: 'pointer' }}>
          Salvar opções
        </button>
        <button onClick={() => onSetEditingId(null)}
          style={{ fontSize: '.8rem', background: '#f7fafc', color: '#4a5568', border: '1px solid #e2e8f0', borderRadius: 6, padding: '6px 14px', cursor: 'pointer' }}>
          Cancelar
        </button>
      </div>
    </div>
  )
}

function OptionSummary({ q, onStart }: { q: QuestionRow; onStart: () => void }) {
  return (
    <div>
      {q.options.length > 0 ? (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 4 }}>
          {q.options.slice(0, 6).map(option => (
            <span key={option.id} style={{ fontSize: '.75rem', background: '#ebf4ff', color: '#3182ce', borderRadius: 4, padding: '2px 8px' }}>{option.label}</span>
          ))}
          {q.options.length > 6 && <span style={{ fontSize: '.75rem', color: '#a0aec0' }}>+{q.options.length - 6} mais</span>}
        </div>
      ) : (
        <p style={{ fontSize: '.8rem', color: '#e53e3e', marginBottom: 4 }}>⚠️ Sem opções — clique em editar para adicionar</p>
      )}
      <button
        onClick={onStart}
        style={{ fontSize: '.78rem', color: '#667eea', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
        Editar opções →
      </button>
    </div>
  )
}
