'use client'

import { useState, useTransition, useRef } from 'react'
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
  { value: 'text',        label: 'Texto livre',         icon: '📝', desc: 'Campo de texto aberto' },
  { value: 'radio',       label: 'Múltipla escolha',    icon: '⭕', desc: 'Seleciona uma opção' },
  { value: 'checkbox',    label: 'Caixas de seleção',   icon: '☑️', desc: 'Seleciona várias opções' },
  { value: 'scale',       label: 'Escala linear (1–5)', icon: '⭐', desc: 'Nota de 1 a 5' },
  { value: 'nps',         label: 'NPS (0–10)',           icon: '📊', desc: 'Recomendação 0 a 10' },
  { value: 'file_upload', label: 'Envio de arquivo',    icon: '📎', desc: 'Upload de documento' },
]

const HAS_OPTIONS  = ['radio', 'checkbox', 'scale']
const HAS_PERGUNTA = ['radio', 'checkbox', 'text', 'file_upload']

const inputStyle: React.CSSProperties = {
  width: '100%', border: '1px solid #e2e8f0', borderRadius: 6,
  padding: '8px 10px', fontSize: '.875rem', boxSizing: 'border-box',
}

function typeLabel(type: string) { return QUESTION_TYPES.find(t => t.value === type)?.label ?? type }
function typeIcon(type: string)  { return QUESTION_TYPES.find(t => t.value === type)?.icon  ?? '❓' }

export default function QuestionEditor({ surveyId, questions: initialQuestions }: QuestionEditorProps) {
  const [questions, setQuestions] = useState<QuestionRow[]>(initialQuestions)
  const [showAdd, setShowAdd]     = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [optionsText, setOptionsText] = useState('')
  const [isPending, startTransition]  = useTransition()
  const [error, setError]   = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // ── Formulário de nova pergunta ─────────────────────────────────────────────
  const [addType, setAddType]           = useState('text')
  const [addTitle, setAddTitle]         = useState('')
  const [addKey, setAddKey]             = useState('')
  const [keyEdited, setKeyEdited]       = useState(false)
  const [addDesc, setAddDesc]           = useState('')
  const [addPergunta, setAddPergunta]   = useState('')
  const [addPlaceholder, setAddPlaceholder] = useState('')
  const [addAccept, setAddAccept]       = useState('')
  const [addRequired, setAddRequired]   = useState(true)
  const [addOptions, setAddOptions]         = useState<string[]>(['', ''])
  const [addCorrectAnswer, setAddCorrectAnswer] = useState<string>('')
  const optionRefs = useRef<(HTMLInputElement | null)[]>([])

  function notify(msg: string, isError = false) {
    if (isError) { setError(msg); setSuccess(null) }
    else          { setSuccess(msg); setError(null) }
    setTimeout(() => { setError(null); setSuccess(null) }, 4000)
  }

  function slugify(text: string) {
    return text
      .toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // remove acentos
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .slice(0, 40)
  }

  function handleTitleChange(val: string) {
    setAddTitle(val)
    if (!keyEdited) setAddKey(slugify(val))
  }

  function resetForm() {
    setAddKey(''); setAddTitle(''); setAddDesc(''); setAddPergunta('')
    setAddPlaceholder(''); setAddAccept(''); setAddOptions(['', ''])
    setAddCorrectAnswer(''); setAddRequired(true); setKeyEdited(false); setShowAdd(false)
  }

  function updateOption(idx: number, val: string) {
    setAddOptions(prev => prev.map((o, i) => i === idx ? val : o))
  }

  function removeOption(idx: number) {
    setAddOptions(prev => {
      const removed = prev[idx]
      if (removed && removed === addCorrectAnswer) setAddCorrectAnswer('')
      return prev.filter((_, i) => i !== idx)
    })
  }

  function addOptionRow(focusIdx?: number) {
    setAddOptions(prev => {
      const next = [...prev, '']
      const idx = focusIdx ?? next.length - 1
      setTimeout(() => optionRefs.current[idx]?.focus(), 0)
      return next
    })
  }

  function handleOptionKeyDown(e: React.KeyboardEvent<HTMLInputElement>, idx: number) {
    if (e.key !== 'Enter') return
    e.preventDefault()
    if (idx < addOptions.length - 1) {
      optionRefs.current[idx + 1]?.focus()
    } else {
      addOptionRow(addOptions.length)
    }
  }

  async function handleAdd() {
    if (!addKey.trim()) { notify('Preencha a key da pergunta.', true); return }
    if (!addTitle.trim()) { notify('Preencha o título da pergunta.', true); return }

    const fd = new FormData()
    fd.set('type', addType)
    fd.set('key', addKey)
    fd.set('title', addTitle)
    fd.set('description', addDesc)
    fd.set('required', String(addRequired))
    fd.set('pergunta', addPergunta)
    fd.set('placeholder', addPlaceholder)
    fd.set('accept', addAccept)
    if (addCorrectAnswer) fd.set('correctAnswer', addCorrectAnswer)

    startTransition(async () => {
      const res = await createQuestion(surveyId, fd)
      if (res.error) { notify(res.error, true); return }

      // Salva opções imediatamente se existirem
      const labels = addOptions.map(o => o.trim()).filter(Boolean)
      if (res.id && HAS_OPTIONS.includes(addType) && labels.length > 0) {
        await saveQuestionOptions(res.id, surveyId, labels)
      }

      notify('Pergunta adicionada!')
      resetForm()

      // Atualiza lista localmente (sem reload)
      const newQ: QuestionRow = {
        id:          res.id ?? Math.random().toString(),
        order_index: questions.length,
        type:        addType,
        key:         addKey,
        title:       addTitle,
        description: addDesc || null,
        required:    addRequired,
        settings:    {},
        options:     labels.map((label, i) => ({ id: `${i}`, order_index: i, label })),
      }
      setQuestions(prev => [...prev, newQ])
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
      setQuestions(prev => {
        const list = [...prev]
        const idx  = list.findIndex(q => q.id === questionId)
        const swap = direction === 'up' ? idx - 1 : idx + 1
        if (swap < 0 || swap >= list.length) return list
        ;[list[idx].order_index, list[swap].order_index] = [list[swap].order_index, list[idx].order_index]
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
      setEditingId(null)
      setQuestions(prev => prev.map(q => q.id === questionId
        ? { ...q, options: labels.map((label, i) => ({ id: `${i}`, order_index: i, label })) }
        : q
      ))
    })
  }

  const sorted = [...questions].sort((a, b) => a.order_index - b.order_index)
  const canAdd = true

  return (
    <div>
      {/* Notificações */}
      {error   && <div style={{ background: '#fff5f5', border: '1px solid #fed7d7', color: '#c53030', borderRadius: 8, padding: '10px 14px', marginBottom: 12, fontSize: '.875rem' }}>⚠️ {error}</div>}
      {success && <div style={{ background: '#f0fff4', border: '1px solid #c6f6d5', color: '#276749', borderRadius: 8, padding: '10px 14px', marginBottom: 12, fontSize: '.875rem' }}>✓ {success}</div>}

      {/* Lista de perguntas */}
      {sorted.length === 0 && !showAdd && (
        <p style={{ color: '#a0aec0', fontSize: '.9rem', textAlign: 'center', padding: '24px 0' }}>
          Nenhuma pergunta adicionada ainda.
        </p>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {sorted.map((q, idx) => (
          <div key={q.id} style={{ border: '1px solid #e2e8f0', borderRadius: 10, padding: '14px 16px', background: '#fff' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
              {/* Reordenar */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2, paddingTop: 2 }}>
                <button onClick={() => handleMove(q.id, 'up')} disabled={idx === 0 || isPending}
                  style={{ background: 'none', border: 'none', cursor: idx === 0 ? 'default' : 'pointer', color: idx === 0 ? '#e2e8f0' : '#718096', fontSize: '.8rem', padding: '0 4px' }}>▲</button>
                <button onClick={() => handleMove(q.id, 'down')} disabled={idx === sorted.length - 1 || isPending}
                  style={{ background: 'none', border: 'none', cursor: idx === sorted.length - 1 ? 'default' : 'pointer', color: idx === sorted.length - 1 ? '#e2e8f0' : '#718096', fontSize: '.8rem', padding: '0 4px' }}>▼</button>
              </div>

              {/* Conteúdo */}
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

                {/* Opções (editar) */}
                {HAS_OPTIONS.includes(q.type) && (
                  <div style={{ marginTop: 8 }}>
                    {editingId === q.id ? (
                      <div>
                        <p style={{ fontSize: '.8rem', color: '#4a5568', marginBottom: 4 }}>Uma opção por linha:</p>
                        <textarea
                          value={optionsText}
                          onChange={e => setOptionsText(e.target.value)}
                          rows={Math.max(4, optionsText.split('\n').length + 1)}
                          style={{ width: '100%', fontSize: '.85rem', border: '1px solid #e2e8f0', borderRadius: 6, padding: '8px', fontFamily: 'inherit', resize: 'vertical', boxSizing: 'border-box' }}
                        />
                        <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                          <button onClick={() => handleSaveOptions(q.id)} disabled={isPending}
                            style={{ fontSize: '.8rem', background: '#667eea', color: '#fff', border: 'none', borderRadius: 6, padding: '6px 14px', cursor: 'pointer' }}>
                            Salvar opções
                          </button>
                          <button onClick={() => setEditingId(null)}
                            style={{ fontSize: '.8rem', background: '#f7fafc', color: '#4a5568', border: '1px solid #e2e8f0', borderRadius: 6, padding: '6px 14px', cursor: 'pointer' }}>
                            Cancelar
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div>
                        {q.options.length > 0 ? (
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 4 }}>
                            {q.options.slice(0, 6).map(o => (
                              <span key={o.id} style={{ fontSize: '.75rem', background: '#ebf4ff', color: '#3182ce', borderRadius: 4, padding: '2px 8px' }}>{o.label}</span>
                            ))}
                            {q.options.length > 6 && <span style={{ fontSize: '.75rem', color: '#a0aec0' }}>+{q.options.length - 6} mais</span>}
                          </div>
                        ) : (
                          <p style={{ fontSize: '.8rem', color: '#e53e3e', marginBottom: 4 }}>⚠️ Sem opções — clique em editar para adicionar</p>
                        )}
                        <button
                          onClick={() => { setOptionsText(q.options.map(o => o.label).join('\n')); setEditingId(q.id) }}
                          style={{ fontSize: '.78rem', color: '#667eea', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                          Editar opções →
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Excluir */}
              <button onClick={() => handleDelete(q.id)} disabled={isPending}
                style={{ color: '#e53e3e', background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.1rem', padding: '0 4px', flexShrink: 0 }}
                title="Excluir pergunta">🗑</button>
            </div>
          </div>
        ))}
      </div>

      {/* Formulário: adicionar pergunta */}
      {showAdd ? (
        <div style={{ border: '2px dashed #667eea', borderRadius: 10, padding: 20, marginTop: 12, background: '#f8f9ff' }}>
          <h4 style={{ fontWeight: 600, color: '#2d3748', marginBottom: 16, marginTop: 0 }}>Nova pergunta</h4>

          <div style={{ display: 'grid', gap: 14 }}>
            {/* Tipo */}
            <div>
              <label style={{ fontSize: '.85rem', fontWeight: 500, color: '#4a5568', display: 'block', marginBottom: 6 }}>Tipo</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))', gap: 6 }}>
                {QUESTION_TYPES.map(t => (
                  <button key={t.value} onClick={() => { setAddType(t.value); setAddOptions(['', '']) }}
                    style={{
                      padding: '8px 12px', textAlign: 'left', cursor: 'pointer',
                      border: `2px solid ${addType === t.value ? '#667eea' : '#e2e8f0'}`,
                      borderRadius: 8,
                      background: addType === t.value ? '#667eea15' : '#fff',
                      color: addType === t.value ? '#553c9a' : '#4a5568',
                      fontWeight: addType === t.value ? 600 : 400,
                    }}>
                    <div style={{ fontSize: '.85rem' }}>{t.icon} {t.label}</div>
                    <div style={{ fontSize: '.73rem', color: addType === t.value ? '#553c9a99' : '#a0aec0', marginTop: 2 }}>{t.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Título */}
            <div>
              <label style={{ fontSize: '.85rem', fontWeight: 500, color: '#4a5568', display: 'block', marginBottom: 4 }}>
                Título <span style={{ color: '#e53e3e' }}>*</span>
              </label>
              <input value={addTitle} onChange={e => handleTitleChange(e.target.value)}
                placeholder="Ex: Satisfação geral" style={inputStyle} autoFocus />
              {addKey && (
                <div style={{ marginTop: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: '.75rem', color: '#a0aec0' }}>ID: </span>
                  <input
                    value={addKey}
                    onChange={e => { setAddKey(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_')); setKeyEdited(true) }}
                    style={{ fontSize: '.75rem', color: '#718096', fontFamily: 'monospace', background: 'none', border: 'none', borderBottom: '1px dashed #cbd5e0', padding: '0 2px', width: `${Math.max(addKey.length, 10)}ch` }}
                    title="Identificador técnico — gerado automaticamente"
                  />
                </div>
              )}
            </div>

            {/* Descrição */}
            <div>
              <label style={{ fontSize: '.85rem', fontWeight: 500, color: '#4a5568', display: 'block', marginBottom: 4 }}>
                Descrição <span style={{ color: '#a0aec0', fontWeight: 400 }}>(opcional)</span>
              </label>
              <input value={addDesc} onChange={e => setAddDesc(e.target.value)}
                placeholder="Instrução ou contexto para o respondente" style={inputStyle} />
            </div>

            {/* Texto da pergunta */}
            {HAS_PERGUNTA.includes(addType) && (
              <div>
                <label style={{ fontSize: '.85rem', fontWeight: 500, color: '#4a5568', display: 'block', marginBottom: 4 }}>
                  Texto da pergunta <span style={{ color: '#a0aec0', fontWeight: 400 }}>— use {'{tipo}'} para substituir pelo tipo de unidade</span>
                </label>
                <input value={addPergunta} onChange={e => setAddPergunta(e.target.value)}
                  placeholder="Ex: Como você avalia a {tipo}?" style={inputStyle} />
              </div>
            )}

            {/* Placeholder (só texto) */}
            {addType === 'text' && (
              <div>
                <label style={{ fontSize: '.85rem', fontWeight: 500, color: '#4a5568', display: 'block', marginBottom: 4 }}>
                  Placeholder <span style={{ color: '#a0aec0', fontWeight: 400 }}>(opcional)</span>
                </label>
                <input value={addPlaceholder} onChange={e => setAddPlaceholder(e.target.value)}
                  placeholder="Ex: Escreva sua sugestão aqui..." style={inputStyle} />
              </div>
            )}

            {/* Tipos de arquivo aceitos (só file_upload) */}
            {addType === 'file_upload' && (
              <div>
                <label style={{ fontSize: '.85rem', fontWeight: 500, color: '#4a5568', display: 'block', marginBottom: 4 }}>
                  Tipos de arquivo aceitos <span style={{ color: '#a0aec0', fontWeight: 400 }}>(opcional, ex: .pdf,.jpg,.png)</span>
                </label>
                <input value={addAccept} onChange={e => setAddAccept(e.target.value)}
                  placeholder=".pdf,.jpg,.png" style={inputStyle} />
              </div>
            )}

            {/* Opções (radio, checkbox, scale) */}
            {HAS_OPTIONS.includes(addType) && (
              <div>
                <label style={{ fontSize: '.85rem', fontWeight: 500, color: '#4a5568', display: 'block', marginBottom: 6 }}>
                  Opções de resposta <span style={{ color: '#e53e3e' }}>*</span>
                </label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {addOptions.map((opt, idx) => (
                    <div key={idx} style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                      <span style={{ color: '#a0aec0', fontSize: '.8rem', minWidth: 20, textAlign: 'right' }}>{idx + 1}.</span>
                      <input
                        ref={el => { optionRefs.current[idx] = el }}
                        value={opt}
                        onChange={e => updateOption(idx, e.target.value)}
                        onKeyDown={e => handleOptionKeyDown(e, idx)}
                        placeholder={`Opção ${idx + 1}`}
                        style={{ ...inputStyle, flex: 1 }}
                      />
                      {addOptions.length > 1 && (
                        <button onClick={() => removeOption(idx)}
                          style={{ background: 'none', border: 'none', color: '#e53e3e', cursor: 'pointer', fontSize: '1rem', padding: '0 4px', flexShrink: 0 }}
                          title="Remover opção">✕</button>
                      )}
                    </div>
                  ))}
                </div>
                <button onClick={() => addOptionRow()}
                  style={{ marginTop: 8, fontSize: '.82rem', color: '#667eea', background: 'none', border: '1px dashed #667eea', borderRadius: 6, padding: '5px 12px', cursor: 'pointer' }}>
                  + Adicionar opção
                </button>

                {/* Resposta correta (só múltipla escolha) */}
                {addType === 'radio' && addOptions.some(o => o.trim()) && (
                  <div style={{ marginTop: 12, padding: '10px 12px', background: '#fffbeb', border: '1px solid #fbd38d', borderRadius: 8 }}>
                    <label style={{ fontSize: '.82rem', fontWeight: 500, color: '#744210', display: 'block', marginBottom: 6 }}>
                      Resposta correta <span style={{ fontWeight: 400, color: '#975a16' }}>(opcional)</span>
                    </label>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      {addOptions.filter(o => o.trim()).map(opt => (
                        <label key={opt} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: '.85rem', color: '#2d3748' }}>
                          <input
                            type="radio"
                            name="correctAnswer"
                            checked={addCorrectAnswer === opt}
                            onChange={() => setAddCorrectAnswer(opt)}
                          />
                          {opt}
                        </label>
                      ))}
                      {addCorrectAnswer && (
                        <button onClick={() => setAddCorrectAnswer('')}
                          style={{ alignSelf: 'flex-start', marginTop: 4, fontSize: '.75rem', color: '#e53e3e', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                          Remover resposta correta
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Obrigatório */}
            <div>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: '.875rem', color: '#4a5568' }}>
                <input type="checkbox" checked={addRequired} onChange={e => setAddRequired(e.target.checked)} />
                Pergunta obrigatória
              </label>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
            <button onClick={handleAdd} disabled={isPending || !canAdd}
              style={{
                background: !canAdd ? '#e2e8f0' : '#667eea',
                color: !canAdd ? '#a0aec0' : '#fff',
                border: 'none', borderRadius: 8, padding: '9px 20px',
                cursor: !canAdd ? 'not-allowed' : 'pointer',
                fontWeight: 600, fontSize: '.875rem',
              }}>
              {isPending ? 'Salvando…' : 'Adicionar pergunta'}
            </button>
            <button onClick={resetForm}
              style={{ background: '#fff', color: '#4a5568', border: '1px solid #e2e8f0', borderRadius: 8, padding: '9px 20px', cursor: 'pointer', fontSize: '.875rem' }}>
              Cancelar
            </button>
          </div>
        </div>
      ) : (
        <button onClick={() => setShowAdd(true)}
          style={{
            display: 'flex', alignItems: 'center', gap: 8, width: '100%', marginTop: 12,
            padding: '10px 16px', border: '2px dashed #cbd5e0', borderRadius: 10,
            background: 'none', cursor: 'pointer', color: '#718096', fontSize: '.9rem',
          }}>
          <span style={{ fontSize: '1.2rem' }}>+</span> Adicionar pergunta
        </button>
      )}
    </div>
  )
}
