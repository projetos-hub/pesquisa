'use client'

import type React from 'react'
import type { MutableRefObject } from 'react'

import type { QuestionFormActions, QuestionFormState, QuestionRow } from './useQuestionForm'
import { HAS_OPTIONS, HAS_PERGUNTA, QUESTION_TYPES } from './question-editor-utils'

type QuestionForm = QuestionFormState & QuestionFormActions

const inputStyle: React.CSSProperties = {
  width: '100%',
  border: '1px solid #e2e8f0',
  borderRadius: 6,
  padding: '8px 10px',
  fontSize: '.875rem',
  boxSizing: 'border-box',
}

interface QuestionEditorFormProps {
  isEdit: boolean
  form: QuestionForm
  questions: QuestionRow[]
  editingMetadataId: string | null
  optionRefs: MutableRefObject<(HTMLInputElement | null)[]>
  isPending: boolean
  canAdd: boolean
  onAdd: () => void
  onUpdateMetadata: () => void
  onReset: () => void
  onUpdateOption: (idx: number, val: string) => void
  onRemoveOption: (idx: number) => void
  onAddOptionRow: (focusIdx?: number) => void
  onOptionKeyDown: (e: React.KeyboardEvent<HTMLInputElement>, idx: number) => void
}

export function ThankYouEditorForm({ onReset }: { onReset: () => void }) {
  return (
    <div style={{ border: '2px solid #667eea', borderRadius: 10, padding: 20, marginTop: 12, background: '#fff' }}>
      <h4 style={{ fontWeight: 600, color: '#2d3748', marginBottom: 4, marginTop: 0 }}>🙏 Tela de agradecimento</h4>
      <p style={{ fontSize: '.82rem', color: '#718096', marginTop: 0, marginBottom: 16 }}>
        A mensagem de agradecimento padrão é configurada em <strong>Configurações da pesquisa</strong> (seção acima).
        Para mensagens por escola, use <strong>Comunidades → Identidade Visual</strong>.
      </p>
      <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
        <button onClick={onReset}
          style={{ background: '#f7fafc', color: '#4a5568', border: '1px solid #e2e8f0', borderRadius: 8, padding: '9px 20px', cursor: 'pointer', fontSize: '.875rem' }}>
          Fechar
        </button>
      </div>
    </div>
  )
}

export function QuestionEditorForm({
  isEdit,
  form,
  questions,
  editingMetadataId,
  optionRefs,
  isPending,
  canAdd,
  onAdd,
  onUpdateMetadata,
  onReset,
  onUpdateOption,
  onRemoveOption,
  onAddOptionRow,
  onOptionKeyDown,
}: QuestionEditorFormProps) {
  return (
    <div style={{ border: `2px ${isEdit ? 'solid' : 'dashed'} #667eea`, borderRadius: 10, padding: 20, marginTop: 12, background: isEdit ? '#fff' : '#f8f9ff' }}>
      <h4 style={{ fontWeight: 600, color: '#2d3748', marginBottom: 16, marginTop: 0 }}>{isEdit ? 'Editar pergunta' : 'Nova pergunta'}</h4>

      <div style={{ display: 'grid', gap: 14 }}>
        <div>
          <label style={{ fontSize: '.85rem', fontWeight: 500, color: '#4a5568', display: 'block', marginBottom: 6 }}>Tipo</label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))', gap: 6 }}>
            {QUESTION_TYPES.map(t => (
              <button key={t.value} onClick={() => { form.setFormType(t.value); if (!isEdit) form.setFormOptions(['', '']) }}
                style={{
                  padding: '8px 12px',
                  textAlign: 'left',
                  cursor: 'pointer',
                  border: `2px solid ${form.formType === t.value ? '#667eea' : '#e2e8f0'}`,
                  borderRadius: 8,
                  background: form.formType === t.value ? '#667eea15' : '#fff',
                  color: form.formType === t.value ? '#553c9a' : '#4a5568',
                  fontWeight: form.formType === t.value ? 600 : 400,
                }}>
                <div style={{ fontSize: '.85rem' }}>{t.icon} {t.label}</div>
                <div style={{ fontSize: '.73rem', color: form.formType === t.value ? '#553c9a99' : '#a0aec0', marginTop: 2 }}>{t.desc}</div>
              </button>
            ))}
          </div>
        </div>

        <div>
          <label style={{ fontSize: '.85rem', fontWeight: 500, color: '#4a5568', display: 'block', marginBottom: 4 }}>
            Título <span style={{ color: '#e53e3e' }}>*</span>
          </label>
          <input value={form.formTitle} onChange={e => form.handleTitleChange(e.target.value)}
            placeholder="Ex: Satisfação geral" style={inputStyle} autoFocus />
          {form.formKey && (
            <div style={{ marginTop: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: '.75rem', color: '#a0aec0' }}>ID: </span>
              <input
                value={form.formKey}
                onChange={e => { form.setFormKey(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_')); form.setKeyEdited(true) }}
                style={{ fontSize: '.75rem', color: '#718096', fontFamily: 'monospace', background: 'none', border: 'none', borderBottom: '1px dashed #cbd5e0', padding: '0 2px', width: `${Math.max(form.formKey.length, 10)}ch` }}
                title="Identificador técnico — gerado automaticamente"
              />
            </div>
          )}
        </div>

        <div>
          <label style={{ fontSize: '.85rem', fontWeight: 500, color: '#4a5568', display: 'block', marginBottom: 4 }}>
            Descrição <span style={{ color: '#a0aec0', fontWeight: 400 }}>(opcional)</span>
          </label>
          {form.formType === 'welcome' ? (
            <textarea value={form.formDesc} onChange={e => form.setFormDesc(e.target.value)}
              placeholder="Texto de boas-vindas (suporta {{nome}}, {{nomeAluno}}, {{serie}}, {{nomeEscola}})"
              style={{ ...inputStyle, minHeight: '120px', fontFamily: 'inherit', resize: 'vertical' }} />
          ) : (
            <input value={form.formDesc} onChange={e => form.setFormDesc(e.target.value)}
              placeholder="Instrução ou contexto para o respondente" style={inputStyle} />
          )}
        </div>

        {HAS_PERGUNTA.has(form.formType) && (
          <div>
            <label style={{ fontSize: '.85rem', fontWeight: 500, color: '#4a5568', display: 'block', marginBottom: 4 }}>
              Texto da pergunta <span style={{ color: '#a0aec0', fontWeight: 400 }}>— use {'{tipo}'} para substituir pelo tipo de unidade</span>
            </label>
            <input value={form.formPergunta} onChange={e => form.setFormPergunta(e.target.value)}
              placeholder="Ex: Como você avalia a {tipo}?" style={inputStyle} />
          </div>
        )}

        {form.formType === 'text' && (
          <div>
            <label style={{ fontSize: '.85rem', fontWeight: 500, color: '#4a5568', display: 'block', marginBottom: 4 }}>
              Placeholder <span style={{ color: '#a0aec0', fontWeight: 400 }}>(opcional)</span>
            </label>
            <input value={form.formPlaceholder} onChange={e => form.setFormPlaceholder(e.target.value)}
              placeholder="Ex: Escreva sua sugestão aqui..." style={inputStyle} />
          </div>
        )}

        {form.formType === 'file_upload' && (
          <div>
            <label style={{ fontSize: '.85rem', fontWeight: 500, color: '#4a5568', display: 'block', marginBottom: 4 }}>
              Tipos de arquivo aceitos <span style={{ color: '#a0aec0', fontWeight: 400 }}>(opcional, ex: .pdf,.jpg,.png)</span>
            </label>
            <input value={form.formAccept} onChange={e => form.setFormAccept(e.target.value)}
              placeholder=".pdf,.jpg,.png" style={inputStyle} />
          </div>
        )}

        {!isEdit && HAS_OPTIONS.has(form.formType) && (
          <div>
            <label style={{ fontSize: '.85rem', fontWeight: 500, color: '#4a5568', display: 'block', marginBottom: 6 }}>
              Opções de resposta <span style={{ color: '#e53e3e' }}>*</span>
            </label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {form.formOptions.map((opt, idx) => (
                <div key={idx} style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  <span style={{ color: '#a0aec0', fontSize: '.8rem', minWidth: 20, textAlign: 'right' }}>{idx + 1}.</span>
                  <input
                    ref={el => { optionRefs.current[idx] = el }}
                    value={opt}
                    onChange={e => onUpdateOption(idx, e.target.value)}
                    onKeyDown={e => onOptionKeyDown(e, idx)}
                    placeholder={`Opção ${idx + 1}`}
                    style={{ ...inputStyle, flex: 1 }}
                  />
                  {form.formOptions.length > 1 && (
                    <button onClick={() => onRemoveOption(idx)}
                      style={{ background: 'none', border: 'none', color: '#e53e3e', cursor: 'pointer', fontSize: '1rem', padding: '0 4px', flexShrink: 0 }}
                      title="Remover opção">×</button>
                  )}
                </div>
              ))}
            </div>
            <button onClick={() => onAddOptionRow()}
              style={{ marginTop: 8, fontSize: '.82rem', color: '#667eea', background: 'none', border: '1px dashed #667eea', borderRadius: 6, padding: '5px 12px', cursor: 'pointer' }}>
              + Adicionar opção
            </button>
          </div>
        )}

        {form.formType === 'radio' && (
          <div>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: '.875rem', color: '#4a5568' }}>
              <input type="checkbox" checked={form.formQuizMode} onChange={e => { form.setFormQuizMode(e.target.checked); if (!e.target.checked) form.setFormCorrectAnswer('') }} />
              Modo quiz — esta pergunta tem uma resposta certa
            </label>
          </div>
        )}
        {form.formType === 'radio' && form.formQuizMode && (isEdit ? true : form.formOptions.some(o => o.trim())) && (
          <div style={{ marginTop: 4, padding: '10px 12px', background: '#fffbeb', border: '1px solid #fbd38d', borderRadius: 8 }}>
            <label style={{ fontSize: '.82rem', fontWeight: 500, color: '#744210', display: 'block', marginBottom: 6 }}>
              Qual é a resposta correta?
            </label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {(isEdit ? questions.find(q => q.id === editingMetadataId)?.options.map(o => o.label) || [] : form.formOptions.filter(o => o.trim())).map(opt => (
                <label key={opt} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: '.85rem', color: '#2d3748' }}>
                  <input type="radio" name="correctAnswer" checked={form.formCorrectAnswer === opt} onChange={() => form.setFormCorrectAnswer(opt)} />
                  {opt}
                </label>
              ))}
              {form.formCorrectAnswer && (
                <button onClick={() => form.setFormCorrectAnswer('')}
                  style={{ alignSelf: 'flex-start', marginTop: 4, fontSize: '.75rem', color: '#e53e3e', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                  Limpar seleção
                </button>
              )}
            </div>
          </div>
        )}

        <div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: '.875rem', color: '#4a5568' }}>
            <input type="checkbox" checked={form.formRequired} onChange={e => form.setFormRequired(e.target.checked)} />
            Pergunta obrigatória
          </label>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
        <button onClick={isEdit ? onUpdateMetadata : onAdd} disabled={isPending || !canAdd}
          style={{
            background: !canAdd ? '#e2e8f0' : '#667eea',
            color: !canAdd ? '#a0aec0' : '#fff',
            border: 'none',
            borderRadius: 8,
            padding: '9px 20px',
            cursor: !canAdd ? 'not-allowed' : 'pointer',
            fontWeight: 600,
            fontSize: '.875rem',
          }}>
          {isPending ? 'Salvando...' : (isEdit ? 'Atualizar pergunta' : 'Adicionar pergunta')}
        </button>
        <button onClick={onReset}
          style={{ background: '#fff', color: '#4a5568', border: '1px solid #e2e8f0', borderRadius: 8, padding: '9px 20px', cursor: 'pointer', fontSize: '.875rem' }}>
          Cancelar
        </button>
      </div>
    </div>
  )
}
