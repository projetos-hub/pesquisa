'use client'

import { useState, useTransition } from 'react'
import { createQuestion, saveQuestionOptions, deleteQuestion, moveQuestion } from '../actions'

interface QuestionRow {
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

interface QuestionEditorProps {
  surveyId: string
  questions: QuestionRow[]
}

const QUESTION_TYPES = [
  { value: 'text',        label: 'Texto livre',        icon: '📝' },
  { value: 'radio',       label: 'Múltipla escolha',   icon: '⭕' },
  { value: 'checkbox',    label: 'Caixas de seleção',  icon: '☑️' },
  { value: 'scale',       label: 'Escala linear (1–5)', icon: '⭐' },
  { value: 'nps',         label: 'NPS (0–10)',          icon: '📊' },
  { value: 'file_upload', label: 'Envio de arquivo',   icon: '📎' },
]

const HAS_OPTIONS = ['radio', 'checkbox', 'scale']
const HAS_PERGUNTA = ['radio', 'checkbox', 'text', 'file_upload']

function typeLabel(type: string) {
  return QUESTION_TYPES.find(t => t.value === type)?.label ?? type
}

function typeIcon(type: string) {
  return QUESTION_TYPES.find(t => t.value === type)?.icon ?? '❓'
}

export default function QuestionEditor({ surveyId, questions: initialQuestions }: QuestionEditorProps) {
  const [questions, setQuestions] = useState<QuestionRow[]>(initialQuestions)
  const [showAdd, setShowAdd] = useState(false)
  const [editingOptions, setEditingOptions] = useState<string | null>(null)
  const [optionsText, setOptionsText] = useState('')
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // Add form state
  const [addType, setAddType] = useState('text')
  const [addKey, setAddKey] = useState('')
  const [addTitle, setAddTitle] = useState('')
  const [addDesc, setAddDesc] = useState('')
  const [addPergunta, setAddPergunta] = useState('')
  const [addPlaceholder, setAddPlaceholder] = useState('')
  const [addAccept, setAddAccept] = useState('')
  const [addRequired, setAddRequired] = useState(true)

  function notify(msg: string, isError = false) {
    if (isError) { setError(msg); setSuccess(null) }
    else { setSuccess(msg); setError(null) }
    setTimeout(() => { setError(null); setSuccess(null) }, 4000)
  }

  async function handleAdd() {
    const fd = new FormData()
    fd.set('type', addType)
    fd.set('key', addKey)
    fd.set('title', addTitle)
    fd.set('description', addDesc)
    fd.set('required', String(addRequired))
    fd.set('pergunta', addPergunta)
    fd.set('placeholder', addPlaceholder)
    fd.set('accept', addAccept)

    startTransition(async () => {
      const res = await createQuestion(surveyId, fd)
      if (res.error) { notify(res.error, true); return }
      notify('Pergunta adicionada!')
      setShowAdd(false)
      setAddKey(''); setAddTitle(''); setAddDesc(''); setAddPergunta('')
      setAddPlaceholder(''); setAddAccept('')
      // Reload to get new question with id
      window.location.reload()
    })
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
      // Re-sort locally
      setQuestions(prev => {
        const list = [...prev]
        const idx = list.findIndex(q => q.id === questionId)
        const swapIdx = direction === 'up' ? idx - 1 : idx + 1
        if (swapIdx < 0 || swapIdx >= list.length) return list
        ;[list[idx].order_index, list[swapIdx].order_index] = [list[swapIdx].order_index, list[idx].order_index]
        return [...list].sort((a, b) => a.order_index - b.order_index)
      })
    })
  }

  async function handleSaveOptions(questionId: string) {
    const labels = optionsText.split('\n').map(l => l.trim()).filter(Boolean)
    startTransition(async () => {
      const res = await saveQuestionOptions(questionId, surveyId, labels)
      if (res.error) { notify(res.error, true); return }
      notify('Opções salvas!')
      setEditingOptions(null)
      setQuestions(prev => prev.map(q => q.id === questionId
        ? { ...q, options: labels.map((label, i) => ({ id: `${i}`, order_index: i, label })) }
        : q
      ))
    })
  }

  function startEditOptions(q: QuestionRow) {
    setOptionsText(q.options.map(o => o.label).join('\n'))
    setEditingOptions(q.id)
  }

  const sorted = [...questions].sort((a, b) => a.order_index - b.order_index)

  return (
    <div>
      {/* Notifications */}
      {error   && <div style={{ background: '#fff5f5', border: '1px solid #fed7d7', color: '#c53030', borderRadius: 8, padding: '10px 14px', marginBottom: 12, fontSize: '.875rem' }}>⚠️ {error}</div>}
      {success && <div style={{ background: '#f0fff4', border: '1px solid #c6f6d5', color: '#276749', borderRadius: 8, padding: '10px 14px', marginBottom: 12, fontSize: '.875rem' }}>✓ {success}</div>}

      {/* Question list */}
      {sorted.length === 0 && !showAdd && (
        <p style={{ color: '#a0aec0', fontSize: '.9rem', textAlign: 'center', padding: '24px 0' }}>
          Nenhuma pergunta adicionada ainda.
        </p>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {sorted.map((q, idx) => (
          <div key={q.id} style={{ border: '1px solid #e2e8f0', borderRadius: 10, padding: '14px 16px', background: '#fff' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
              {/* Reorder */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2, paddingTop: 2 }}>
                <button
                  onClick={() => handleMove(q.id, 'up')}
                  disabled={idx === 0 || isPending}
                  style={{ background: 'none', border: 'none', cursor: idx === 0 ? 'default' : 'pointer', color: idx === 0 ? '#e2e8f0' : '#718096', fontSize: '.8rem', padding: '0 4px' }}
                >▲</button>
                <button
                  onClick={() => handleMove(q.id, 'down')}
                  disabled={idx === sorted.length - 1 || isPending}
                  style={{ background: 'none', border: 'none', cursor: idx === sorted.length - 1 ? 'default' : 'pointer', color: idx === sorted.length - 1 ? '#e2e8f0' : '#718096', fontSize: '.8rem', padding: '0 4px' }}
                >▼</button>
              </div>

              {/* Icon + content */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <span style={{ fontSize: '1.1rem' }}>{typeIcon(q.type)}</span>
                  <span style={{ fontWeight: 600, color: '#2d3748', fontSize: '.95rem' }}>{q.title}</span>
                  {q.required && <span style={{ fontSize: '.7rem', background: '#fed7d7', color: '#c53030', borderRadius: 4, padding: '1px 6px' }}>obrigatório</span>}
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '.78rem', color: '#718096', background: '#f7fafc', border: '1px solid #e2e8f0', borderRadius: 4, padding: '2px 8px' }}>
                    {typeLabel(q.type)}
                  </span>
                  <span style={{ fontSize: '.78rem', color: '#a0aec0', fontFamily: 'monospace' }}>key: {q.key}</span>
                </div>
                {q.description && (
                  <p style={{ fontSize: '.82rem', color: '#718096', marginTop: 4, marginBottom: 0 }}>{q.description}</p>
                )}

                {/* Options preview / edit */}
                {HAS_OPTIONS.includes(q.type) && (
                  <div style={{ marginTop: 8 }}>
                    {editingOptions === q.id ? (
                      <div>
                        <p style={{ fontSize: '.8rem', color: '#4a5568', marginBottom: 4 }}>Uma opção por linha:</p>
                        <textarea
                          value={optionsText}
                          onChange={e => setOptionsText(e.target.value)}
                          rows={5}
                          style={{ width: '100%', fontSize: '.85rem', border: '1px solid #e2e8f0', borderRadius: 6, padding: '8px', fontFamily: 'inherit', resize: 'vertical' }}
                        />
                        <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                          <button
                            onClick={() => handleSaveOptions(q.id)}
                            disabled={isPending}
                            style={{ fontSize: '.8rem', background: '#667eea', color: '#fff', border: 'none', borderRadius: 6, padding: '6px 14px', cursor: 'pointer' }}
                          >Salvar opções</button>
                          <button
                            onClick={() => setEditingOptions(null)}
                            style={{ fontSize: '.8rem', background: '#f7fafc', color: '#4a5568', border: '1px solid #e2e8f0', borderRadius: 6, padding: '6px 14px', cursor: 'pointer' }}
                          >Cancelar</button>
                        </div>
                      </div>
                    ) : (
                      <div>
                        {q.options.length > 0 ? (
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 4 }}>
                            {q.options.slice(0, 5).map(o => (
                              <span key={o.id} style={{ fontSize: '.75rem', background: '#ebf4ff', color: '#3182ce', borderRadius: 4, padding: '2px 8px' }}>{o.label}</span>
                            ))}
                            {q.options.length > 5 && (
                              <span style={{ fontSize: '.75rem', color: '#a0aec0' }}>+{q.options.length - 5} mais</span>
                            )}
                          </div>
                        ) : (
                          <p style={{ fontSize: '.8rem', color: '#e53e3e', marginBottom: 4 }}>⚠️ Sem opções definidas</p>
                        )}
                        <button
                          onClick={() => startEditOptions(q)}
                          style={{ fontSize: '.78rem', color: '#667eea', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                        >
                          Editar opções →
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Delete */}
              <button
                onClick={() => handleDelete(q.id)}
                disabled={isPending}
                style={{ color: '#e53e3e', background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.1rem', padding: '0 4px', flexShrink: 0 }}
                title="Excluir pergunta"
              >🗑</button>
            </div>
          </div>
        ))}
      </div>

      {/* Add question form */}
      {showAdd ? (
        <div style={{ border: '2px dashed #667eea', borderRadius: 10, padding: 20, marginTop: 12, background: '#f8f9ff' }}>
          <h4 style={{ fontWeight: 600, color: '#2d3748', marginBottom: 16, marginTop: 0 }}>Nova pergunta</h4>

          <div style={{ display: 'grid', gap: 12 }}>
            {/* Type */}
            <div>
              <label style={{ fontSize: '.85rem', fontWeight: 500, color: '#4a5568', display: 'block', marginBottom: 4 }}>Tipo</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 6 }}>
                {QUESTION_TYPES.map(t => (
                  <button
                    key={t.value}
                    onClick={() => setAddType(t.value)}
                    style={{
                      padding: '8px 12px',
                      border: `2px solid ${addType === t.value ? '#667eea' : '#e2e8f0'}`,
                      borderRadius: 8,
                      background: addType === t.value ? '#667eea15' : '#fff',
                      color: addType === t.value ? '#553c9a' : '#4a5568',
                      cursor: 'pointer',
                      fontSize: '.82rem',
                      textAlign: 'left',
                      fontWeight: addType === t.value ? 600 : 400,
                    }}
                  >
                    {t.icon} {t.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Key */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={{ fontSize: '.85rem', fontWeight: 500, color: '#4a5568', display: 'block', marginBottom: 4 }}>
                  Key <span style={{ color: '#a0aec0', fontWeight: 400 }}>(identificador único)</span>
                </label>
                <input
                  value={addKey}
                  onChange={e => setAddKey(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_'))}
                  placeholder="ex: satisfacao_geral"
                  style={{ width: '100%', border: '1px solid #e2e8f0', borderRadius: 6, padding: '8px 10px', fontSize: '.875rem', fontFamily: 'monospace', boxSizing: 'border-box' }}
                />
              </div>
              <div>
                <label style={{ fontSize: '.85rem', fontWeight: 500, color: '#4a5568', display: 'block', marginBottom: 4 }}>Título</label>
                <input
                  value={addTitle}
                  onChange={e => setAddTitle(e.target.value)}
                  placeholder="Título exibido no topo do step"
                  style={{ width: '100%', border: '1px solid #e2e8f0', borderRadius: 6, padding: '8px 10px', fontSize: '.875rem', boxSizing: 'border-box' }}
                />
              </div>
            </div>

            {/* Description */}
            <div>
              <label style={{ fontSize: '.85rem', fontWeight: 500, color: '#4a5568', display: 'block', marginBottom: 4 }}>Descrição <span style={{ color: '#a0aec0', fontWeight: 400 }}>(opcional)</span></label>
              <input
                value={addDesc}
                onChange={e => setAddDesc(e.target.value)}
                placeholder="Instrução ou contexto para o respondente"
                style={{ width: '100%', border: '1px solid #e2e8f0', borderRadius: 6, padding: '8px 10px', fontSize: '.875rem', boxSizing: 'border-box' }}
              />
            </div>

            {/* Pergunta (para tipos específicos) */}
            {HAS_PERGUNTA.includes(addType) && (
              <div>
                <label style={{ fontSize: '.85rem', fontWeight: 500, color: '#4a5568', display: 'block', marginBottom: 4 }}>
                  Texto da pergunta <span style={{ color: '#a0aec0', fontWeight: 400 }}>(use {'{tipo}'} para substituir pelo tipo de escola)</span>
                </label>
                <input
                  value={addPergunta}
                  onChange={e => setAddPergunta(e.target.value)}
                  placeholder="Ex: O que você pensa sobre a {tipo}?"
                  style={{ width: '100%', border: '1px solid #e2e8f0', borderRadius: 6, padding: '8px 10px', fontSize: '.875rem', boxSizing: 'border-box' }}
                />
              </div>
            )}

            {/* Placeholder (text only) */}
            {addType === 'text' && (
              <div>
                <label style={{ fontSize: '.85rem', fontWeight: 500, color: '#4a5568', display: 'block', marginBottom: 4 }}>Placeholder <span style={{ color: '#a0aec0', fontWeight: 400 }}>(opcional)</span></label>
                <input
                  value={addPlaceholder}
                  onChange={e => setAddPlaceholder(e.target.value)}
                  placeholder="Ex: Escreva sua sugestão aqui..."
                  style={{ width: '100%', border: '1px solid #e2e8f0', borderRadius: 6, padding: '8px 10px', fontSize: '.875rem', boxSizing: 'border-box' }}
                />
              </div>
            )}

            {/* Accept (file_upload only) */}
            {addType === 'file_upload' && (
              <div>
                <label style={{ fontSize: '.85rem', fontWeight: 500, color: '#4a5568', display: 'block', marginBottom: 4 }}>Tipos de arquivo aceitos <span style={{ color: '#a0aec0', fontWeight: 400 }}>(opcional, ex: .pdf,.jpg,.png)</span></label>
                <input
                  value={addAccept}
                  onChange={e => setAddAccept(e.target.value)}
                  placeholder=".pdf,.jpg,.png"
                  style={{ width: '100%', border: '1px solid #e2e8f0', borderRadius: 6, padding: '8px 10px', fontSize: '.875rem', boxSizing: 'border-box' }}
                />
              </div>
            )}

            {/* Required */}
            <div>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: '.875rem', color: '#4a5568' }}>
                <input type="checkbox" checked={addRequired} onChange={e => setAddRequired(e.target.checked)} />
                Pergunta obrigatória
              </label>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
            <button
              onClick={handleAdd}
              disabled={isPending || !addKey || !addTitle}
              style={{
                background: (!addKey || !addTitle) ? '#e2e8f0' : '#667eea',
                color: (!addKey || !addTitle) ? '#a0aec0' : '#fff',
                border: 'none', borderRadius: 8,
                padding: '9px 20px', cursor: (!addKey || !addTitle) ? 'not-allowed' : 'pointer',
                fontWeight: 600, fontSize: '.875rem',
              }}
            >
              {isPending ? 'Salvando…' : 'Adicionar pergunta'}
            </button>
            <button
              onClick={() => { setShowAdd(false); setAddKey(''); setAddTitle('') }}
              style={{ background: '#fff', color: '#4a5568', border: '1px solid #e2e8f0', borderRadius: 8, padding: '9px 20px', cursor: 'pointer', fontSize: '.875rem' }}
            >
              Cancelar
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setShowAdd(true)}
          style={{
            display: 'flex', alignItems: 'center', gap: 8,
            width: '100%', marginTop: 12,
            padding: '10px 16px',
            border: '2px dashed #cbd5e0', borderRadius: 10,
            background: 'none', cursor: 'pointer',
            color: '#718096', fontSize: '.9rem',
            transition: 'border-color .2s, color .2s',
          }}
        >
          <span style={{ fontSize: '1.2rem' }}>+</span> Adicionar pergunta
        </button>
      )}
    </div>
  )
}
