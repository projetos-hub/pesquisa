'use client'

import { useState, useTransition, useRef } from 'react'
import { createQuestion, updateQuestion, saveQuestionOptions, deleteQuestion, moveQuestion, toggleWelcomeStep, toggleThankYouStep } from '../actions'

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
  const [editingMetadataId, setEditingMetadataId] = useState<string | null>(null)
  const [optionsText, setOptionsText] = useState('')
  const [isPending, startTransition]  = useTransition()
  const [error, setError]   = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // ── Formulário de pergunta (novo/editar) ────────────────────────────────────
  const [formType, setFormType]           = useState('text')
  const [formTitle, setFormTitle]         = useState('')
  const [formKey, setFormKey]             = useState('')
  const [keyEdited, setKeyEdited]       = useState(false)
  const [formDesc, setFormDesc]           = useState('')
  const [formPergunta, setFormPergunta]   = useState('')
  const [formPlaceholder, setFormPlaceholder] = useState('')
  const [formAccept, setFormAccept]       = useState('')
  const [formRequired, setFormRequired]   = useState(true)
  const [formOptions, setFormOptions]         = useState<string[]>(['', ''])
  const [formCorrectAnswer, setFormCorrectAnswer] = useState<string>('')
  const [formQuizMode, setFormQuizMode]       = useState(false)
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
    setFormTitle(val)
    if (!keyEdited) setFormKey(slugify(val))
  }

  function resetForm() {
    setFormKey(''); setFormTitle(''); setFormDesc(''); setFormPergunta('')
    setFormPlaceholder(''); setFormAccept(''); setFormOptions(['', ''])
    setFormCorrectAnswer(''); setFormQuizMode(false); setFormRequired(true); setKeyEdited(false)
    setShowAdd(false); setEditingMetadataId(null)
  }

  function updateOption(idx: number, val: string) {
    setFormOptions(prev => prev.map((o, i) => i === idx ? val : o))
  }

  function removeOption(idx: number) {
    setFormOptions(prev => {
      const removed = prev[idx]
      if (removed && removed === formCorrectAnswer) setFormCorrectAnswer('')
      return prev.filter((_, i) => i !== idx)
    })
  }

  function addOptionRow(focusIdx?: number) {
    setFormOptions(prev => {
      const next = [...prev, '']
      const idx = focusIdx ?? next.length - 1
      setTimeout(() => optionRefs.current[idx]?.focus(), 0)
      return next
    })
  }

  function handleOptionKeyDown(e: React.KeyboardEvent<HTMLInputElement>, idx: number) {
    if (e.key !== 'Enter') return
    e.preventDefault()
    if (idx < formOptions.length - 1) {
      optionRefs.current[idx + 1]?.focus()
    } else {
      addOptionRow(formOptions.length)
    }
  }

  async function handleAdd() {
    if (!formKey.trim()) { notify('Preencha a key da pergunta.', true); return }
    if (!formTitle.trim()) { notify('Preencha o título da pergunta.', true); return }

    const fd = new FormData()
    fd.set('type', formType)
    fd.set('key', formKey)
    fd.set('title', formTitle)
    fd.set('description', formDesc)
    fd.set('required', String(formRequired))
    fd.set('pergunta', formPergunta)
    fd.set('placeholder', formPlaceholder)
    fd.set('accept', formAccept)
    if (formCorrectAnswer) fd.set('correctAnswer', formCorrectAnswer)

    startTransition(async () => {
      const res = await createQuestion(surveyId, fd)
      if (res.error) { notify(res.error, true); return }

      // Salva opções imediatamente se existirem
      const labels = formOptions.map(o => o.trim()).filter(Boolean)
      if (res.id && HAS_OPTIONS.includes(formType) && labels.length > 0) {
        await saveQuestionOptions(res.id, surveyId, labels)
      }

      notify('Pergunta adicionada!')
      resetForm()

      // Atualiza lista localmente (sem reload)
      const newQ: QuestionRow = {
        id:          res.id ?? Math.random().toString(),
        order_index: questions.length,
        type:        formType,
        key:         formKey,
        title:       formTitle,
        description: formDesc || null,
        required:    formRequired,
        settings:    {
          pergunta: formPergunta,
          placeholder: formPlaceholder,
          accept: formAccept,
          correctAnswer: formCorrectAnswer
        },
        options:     labels.map((label, i) => ({ id: `${i}`, order_index: i, label })),
      }
      setQuestions(prev => [...prev, newQ])
    })
  }

  async function handleUpdateMetadata() {
    if (!editingMetadataId) return
    if (!formKey.trim()) { notify('Preencha a key da pergunta.', true); return }
    if (!formTitle.trim()) { notify('Preencha o título da pergunta.', true); return }

    const fd = new FormData()
    fd.set('type', formType)
    fd.set('key', formKey)
    fd.set('title', formTitle)
    fd.set('description', formDesc)
    fd.set('required', String(formRequired))
    fd.set('pergunta', formPergunta)
    fd.set('placeholder', formPlaceholder)
    fd.set('accept', formAccept)
    if (formCorrectAnswer) fd.set('correctAnswer', formCorrectAnswer)

    startTransition(async () => {
      const res = await updateQuestion(editingMetadataId, surveyId, fd)
      if (res.error) { notify(res.error, true); return }

      notify('Pergunta atualizada!')
      
      setQuestions(prev => prev.map(q => q.id === editingMetadataId ? {
        ...q,
        type: formType,
        key: formKey,
        title: formTitle,
        description: formDesc || null,
        required: formRequired,
        settings: {
          ...q.settings,
          pergunta: formPergunta,
          placeholder: formPlaceholder,
          accept: formAccept,
          correctAnswer: formCorrectAnswer
        }
      } : q))

      resetForm()
    })
  }

  function startEditMetadata(q: QuestionRow) {
    setEditingMetadataId(q.id)
    setShowAdd(false)
    setEditingId(null)

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
    setKeyEdited(true)
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
  const hasWelcome  = questions.some(q => q.type === 'welcome')
  const hasThankYou = questions.some(q => q.type === 'thankyou')

  async function handleToggleWelcome() {
    startTransition(async () => {
      const res = await toggleWelcomeStep(surveyId, !hasWelcome)
      if (res.error) { notify(res.error, true); return }
      if (!hasWelcome) {
        const newQ: QuestionRow = { id: Math.random().toString(), order_index: 0, type: 'welcome', key: 'welcome', title: 'Boas-vindas', description: null, required: false, settings: {}, options: [] }
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
        const newQ: QuestionRow = { id: Math.random().toString(), order_index: questions.length, type: 'thankyou', key: 'thankyou', title: 'Agradecimento', description: null, required: false, settings: {}, options: [] }
        setQuestions(prev => [...prev, newQ])
        notify('Tela de agradecimento adicionada.')
      } else {
        setQuestions(prev => prev.filter(q => q.type !== 'thankyou'))
        notify('Tela de agradecimento removida.')
      }
    })
  }

  const renderForm = (isEdit: boolean) => (
    <div style={{ border: `2px ${isEdit ? 'solid' : 'dashed'} #667eea`, borderRadius: 10, padding: 20, marginTop: 12, background: isEdit ? '#fff' : '#f8f9ff' }}>
      <h4 style={{ fontWeight: 600, color: '#2d3748', marginBottom: 16, marginTop: 0 }}>{isEdit ? 'Editar pergunta' : 'Nova pergunta'}</h4>

      <div style={{ display: 'grid', gap: 14 }}>
        {/* Tipo */}
        <div>
          <label style={{ fontSize: '.85rem', fontWeight: 500, color: '#4a5568', display: 'block', marginBottom: 6 }}>Tipo</label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))', gap: 6 }}>
            {QUESTION_TYPES.map(t => (
              <button key={t.value} onClick={() => { setFormType(t.value); if (!isEdit) setFormOptions(['', '']) }}
                style={{
                  padding: '8px 12px', textAlign: 'left', cursor: 'pointer',
                  border: `2px solid ${formType === t.value ? '#667eea' : '#e2e8f0'}`,
                  borderRadius: 8,
                  background: formType === t.value ? '#667eea15' : '#fff',
                  color: formType === t.value ? '#553c9a' : '#4a5568',
                  fontWeight: formType === t.value ? 600 : 400,
                }}>
                <div style={{ fontSize: '.85rem' }}>{t.icon} {t.label}</div>
                <div style={{ fontSize: '.73rem', color: formType === t.value ? '#553c9a99' : '#a0aec0', marginTop: 2 }}>{t.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Título */}
        <div>
          <label style={{ fontSize: '.85rem', fontWeight: 500, color: '#4a5568', display: 'block', marginBottom: 4 }}>
            Título <span style={{ color: '#e53e3e' }}>*</span>
          </label>
          <input value={formTitle} onChange={e => handleTitleChange(e.target.value)}
            placeholder="Ex: Satisfação geral" style={inputStyle} autoFocus />
          {formKey && (
            <div style={{ marginTop: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: '.75rem', color: '#a0aec0' }}>ID: </span>
              <input
                value={formKey}
                onChange={e => { setFormKey(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_')); setKeyEdited(true) }}
                style={{ fontSize: '.75rem', color: '#718096', fontFamily: 'monospace', background: 'none', border: 'none', borderBottom: '1px dashed #cbd5e0', padding: '0 2px', width: `${Math.max(formKey.length, 10)}ch` }}
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
          <input value={formDesc} onChange={e => setFormDesc(e.target.value)}
            placeholder="Instrução ou contexto para o respondente" style={inputStyle} />
        </div>

        {/* Texto da pergunta */}
        {HAS_PERGUNTA.includes(formType) && (
          <div>
            <label style={{ fontSize: '.85rem', fontWeight: 500, color: '#4a5568', display: 'block', marginBottom: 4 }}>
              Texto da pergunta <span style={{ color: '#a0aec0', fontWeight: 400 }}>— use {'{tipo}'} para substituir pelo tipo de unidade</span>
            </label>
            <input value={formPergunta} onChange={e => setFormPergunta(e.target.value)}
              placeholder="Ex: Como você avalia a {tipo}?" style={inputStyle} />
          </div>
        )}

        {/* Placeholder (só texto) */}
        {formType === 'text' && (
          <div>
            <label style={{ fontSize: '.85rem', fontWeight: 500, color: '#4a5568', display: 'block', marginBottom: 4 }}>
              Placeholder <span style={{ color: '#a0aec0', fontWeight: 400 }}>(opcional)</span>
            </label>
            <input value={formPlaceholder} onChange={e => setFormPlaceholder(e.target.value)}
              placeholder="Ex: Escreva sua sugestão aqui..." style={inputStyle} />
          </div>
        )}

        {/* Tipos de arquivo aceitos (só file_upload) */}
        {formType === 'file_upload' && (
          <div>
            <label style={{ fontSize: '.85rem', fontWeight: 500, color: '#4a5568', display: 'block', marginBottom: 4 }}>
              Tipos de arquivo aceitos <span style={{ color: '#a0aec0', fontWeight: 400 }}>(opcional, ex: .pdf,.jpg,.png)</span>
            </label>
            <input value={formAccept} onChange={e => setFormAccept(e.target.value)}
              placeholder=".pdf,.jpg,.png" style={inputStyle} />
          </div>
        )}

        {/* Opções (radio, checkbox, scale) - Apenas para NOVO. Para existente tem o editor de opções separado. */}
        {!isEdit && HAS_OPTIONS.includes(formType) && (
          <div>
            <label style={{ fontSize: '.85rem', fontWeight: 500, color: '#4a5568', display: 'block', marginBottom: 6 }}>
              Opções de resposta <span style={{ color: '#e53e3e' }}>*</span>
            </label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {formOptions.map((opt, idx) => (
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
                  {formOptions.length > 1 && (
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
          </div>
        )}

        {/* Modo quiz — só múltipla escolha */}
        {formType === 'radio' && (
          <div>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: '.875rem', color: '#4a5568' }}>
              <input type="checkbox" checked={formQuizMode} onChange={e => { setFormQuizMode(e.target.checked); if (!e.target.checked) setFormCorrectAnswer('') }} />
              Modo quiz — esta pergunta tem uma resposta certa
            </label>
          </div>
        )}
        {formType === 'radio' && formQuizMode && (isEdit ? true : formOptions.some(o => o.trim())) && (
          <div style={{ marginTop: 4, padding: '10px 12px', background: '#fffbeb', border: '1px solid #fbd38d', borderRadius: 8 }}>
            <label style={{ fontSize: '.82rem', fontWeight: 500, color: '#744210', display: 'block', marginBottom: 6 }}>
              Qual é a resposta correta?
            </label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {(isEdit ? questions.find(q => q.id === editingMetadataId)?.options.map(o => o.label) || [] : formOptions.filter(o => o.trim())).map(opt => (
                <label key={opt} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: '.85rem', color: '#2d3748' }}>
                  <input
                    type="radio"
                    name="correctAnswer"
                    checked={formCorrectAnswer === opt}
                    onChange={() => setFormCorrectAnswer(opt)}
                  />
                  {opt}
                </label>
              ))}
              {formCorrectAnswer && (
                <button onClick={() => setFormCorrectAnswer('')}
                  style={{ alignSelf: 'flex-start', marginTop: 4, fontSize: '.75rem', color: '#e53e3e', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                  Limpar seleção
                </button>
              )}
            </div>
          </div>
        )}

        {/* Obrigatório */}
        <div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: '.875rem', color: '#4a5568' }}>
            <input type="checkbox" checked={formRequired} onChange={e => setFormRequired(e.target.checked)} />
            Pergunta obrigatória
          </label>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
        <button onClick={isEdit ? handleUpdateMetadata : handleAdd} disabled={isPending || !canAdd}
          style={{
            background: !canAdd ? '#e2e8f0' : '#667eea',
            color: !canAdd ? '#a0aec0' : '#fff',
            border: 'none', borderRadius: 8, padding: '9px 20px',
            cursor: !canAdd ? 'not-allowed' : 'pointer',
            fontWeight: 600, fontSize: '.875rem',
          }}>
          {isPending ? 'Salvando…' : (isEdit ? 'Atualizar pergunta' : 'Adicionar pergunta')}
        </button>
        <button onClick={resetForm}
          style={{ background: '#fff', color: '#4a5568', border: '1px solid #e2e8f0', borderRadius: 8, padding: '9px 20px', cursor: 'pointer', fontSize: '.875rem' }}>
          Cancelar
        </button>
      </div>
    </div>
  )

  return (
    <div>
      {/* Notificações */}
      {error   && <div style={{ background: '#fff5f5', border: '1px solid #fed7d7', color: '#c53030', borderRadius: 8, padding: '10px 14px', marginBottom: 12, fontSize: '.875rem' }}>⚠️ {error}</div>}
      {success && <div style={{ background: '#f0fff4', border: '1px solid #c6f6d5', color: '#276749', borderRadius: 8, padding: '10px 14px', marginBottom: 12, fontSize: '.875rem' }}>✓ {success}</div>}

      {/* Toggles: tela de boas-vindas e agradecimento */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', borderRadius: 8, background: hasWelcome ? '#f0fff4' : '#f7fafc', border: `1px solid ${hasWelcome ? '#c6f6d5' : '#e2e8f0'}` }}>
          <span style={{ fontSize: '1.1rem' }}>👋</span>
          <span style={{ fontSize: '.875rem', color: '#2d3748', flex: 1 }}>
            Boas-vindas {hasWelcome ? <strong style={{ color: '#276749' }}>ativa</strong> : <span style={{ color: '#a0aec0' }}>off</span>}
          </span>
          <button onClick={handleToggleWelcome} disabled={isPending}
            style={{ fontSize: '.8rem', padding: '5px 10px', borderRadius: 6, border: '1px solid', cursor: 'pointer',
              background: hasWelcome ? '#fff5f5' : '#667eea', color: hasWelcome ? '#c53030' : '#fff',
              borderColor: hasWelcome ? '#fed7d7' : '#667eea' }}>
            {hasWelcome ? 'Remover' : 'Ativar'}
          </button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', borderRadius: 8, background: hasThankYou ? '#f0fff4' : '#f7fafc', border: `1px solid ${hasThankYou ? '#c6f6d5' : '#e2e8f0'}` }}>
          <span style={{ fontSize: '1.1rem' }}>🙏</span>
          <span style={{ fontSize: '.875rem', color: '#2d3748', flex: 1 }}>
            Agradecimento {hasThankYou ? <strong style={{ color: '#276749' }}>ativo</strong> : <span style={{ color: '#a0aec0' }}>off</span>}
          </span>
          <button onClick={handleToggleThankYou} disabled={isPending}
            style={{ fontSize: '.8rem', padding: '5px 10px', borderRadius: 6, border: '1px solid', cursor: 'pointer',
              background: hasThankYou ? '#fff5f5' : '#667eea', color: hasThankYou ? '#c53030' : '#fff',
              borderColor: hasThankYou ? '#fed7d7' : '#667eea' }}>
            {hasThankYou ? 'Remover' : 'Ativar'}
          </button>
        </div>
      </div>

      {/* Lista de perguntas */}
      {sorted.length === 0 && !showAdd && (
        <p style={{ color: '#a0aec0', fontSize: '.9rem', textAlign: 'center', padding: '24px 0' }}>
          Nenhuma pergunta adicionada ainda.
        </p>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {sorted.map((q, idx) => (
          <div key={q.id}>
            {editingMetadataId === q.id ? (
              renderForm(true)
            ) : (
              <div style={{ border: '1px solid #e2e8f0', borderRadius: 10, padding: '14px 16px', background: '#fff' }}>
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
                              onClick={() => { setOptionsText(q.options.map(o => o.label).join('\n')); setEditingId(q.id); setEditingMetadataId(null) }}
                              style={{ fontSize: '.78rem', color: '#667eea', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                              Editar opções →
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                    
                    {!editingId && (
                      <div style={{ marginTop: 8 }}>
                        <button
                          onClick={() => startEditMetadata(q)}
                          style={{ fontSize: '.78rem', color: '#667eea', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                          Editar metadados →
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Excluir */}
                  <button onClick={() => handleDelete(q.id)} disabled={isPending}
                    style={{ color: '#e53e3e', background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.1rem', padding: '0 4px', flexShrink: 0 }}
                    title="Excluir pergunta">🗑</button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Formulário: adicionar pergunta */}
      {showAdd ? (
        renderForm(false)
      ) : (
        <button onClick={() => { setShowAdd(true); setEditingMetadataId(null); setEditingId(null); setFormType('text'); setFormTitle(''); setFormKey(''); setFormDesc(''); setFormRequired(true); setFormPergunta(''); setFormPlaceholder(''); setFormAccept(''); setFormCorrectAnswer(''); setKeyEdited(false); }}
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
