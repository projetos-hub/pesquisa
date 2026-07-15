'use client'

import { useState } from 'react'
import type { CheckboxStepDef } from '../utils/types'
import { textAlignClassName, textAlignStyle } from '../utils/textAlign'

interface StepCheckboxProps {
  step: CheckboxStepDef
  tipo: string
  onNext: (data: string[]) => void
  onBack: () => void
  isLast: boolean
  loading: boolean
}

export default function StepCheckbox({ step, tipo, onNext, onBack, isLast, loading }: StepCheckboxProps) {
  const [selected, setSelected] = useState<string[]>([])
  const [tentou, setTentou] = useState(false)
  const resolve = (l: string) => l.replace(/\{tipo\}/g, tipo)
  const textAlign = step.textAlign ?? 'left'
  const alignStyle = textAlignStyle(textAlign)
  const alignClassName = textAlignClassName(textAlign)

  const opcoes = step.sortOptions === false
    ? step.opcoes
    : [...step.opcoes].sort((a, b) => a.localeCompare(b, 'pt-BR'))
  const min = step.minSelecoes ?? (step.obrigatorio ? 1 : 0)
  const max = step.maxSelecoes ?? Infinity
  const ok = selected.length >= min

  function toggle(op: string) {
    setSelected(prev => {
      if (prev.includes(op)) return prev.filter(x => x !== op)
      if (prev.length >= max) return prev
      return [...prev, op]
    })
  }

  function handleNext() {
    if (!ok) { setTentou(true); return }
    onNext(selected)
  }

  return (
    <div className={alignClassName}>
      <p className="step-title" style={alignStyle}>{step.titulo}</p>
      {step.desc && <p className="step-desc" style={alignStyle}>{step.desc}</p>}
      <div className="q-group">
        <p className="question-label" style={alignStyle}>{resolve(step.pergunta)}</p>
        {step.maxSelecoes && (
          <p style={{ fontSize: '.8rem', color: '#718096', marginBottom: 8 }}>
            Selecione até {step.maxSelecoes} {step.maxSelecoes === 1 ? 'opção' : 'opções'}
          </p>
        )}
        <div className="option-list">
          {opcoes.map(op => {
            const sel = selected.includes(op)
            const disabled = !sel && selected.length >= max
            return (
              <button
                key={op}
                type="button"
                onClick={() => toggle(op)}
                disabled={disabled}
                aria-pressed={sel}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  width: '100%',
                  padding: '10px 14px',
                  marginBottom: 6,
                  border: `2px solid ${sel ? 'var(--color-primary, #667eea)' : '#e2e8f0'}`,
                  borderRadius: 8,
                  background: sel ? 'var(--color-primary, #667eea)15' : '#fff',
                  color: disabled ? '#a0aec0' : '#2d3748',
                  cursor: disabled ? 'not-allowed' : 'pointer',
                  textAlign: 'left',
                  fontSize: '.95rem',
                  transition: 'all .15s',
                }}
              >
                <span aria-hidden="true" style={{
                  width: 18, height: 18, minWidth: 18,
                  border: `2px solid ${sel ? 'var(--color-primary, #667eea)' : '#cbd5e0'}`,
                  borderRadius: 4,
                  background: sel ? 'var(--color-primary, #667eea)' : '#fff',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '.75rem', color: '#fff',
                }}>
                  {sel && '✓'}
                </span>
                {resolve(op)}
              </button>
            )
          })}
        </div>
      </div>
      {tentou && !ok && (
        <p role="alert" style={{ color: '#e53e3e', fontSize: '.85rem', marginBottom: 8, textAlign: 'right' }}>
          ⚠️ Selecione ao menos {min} {min === 1 ? 'opção' : 'opções'} para continuar.
        </p>
      )}
      <div className="btn-row">
        <button type="button" className="btn btn-secondary" onClick={onBack}>← Voltar</button>
        <button
          type="button"
          className="btn btn-primary"
          disabled={loading}
          style={!ok && !loading ? { opacity: 0.6, cursor: 'not-allowed' } : undefined}
          onClick={handleNext}
        >
          {loading ? 'Enviando…' : isLast ? 'Enviar pesquisa ✓' : 'Próximo →'}
        </button>
      </div>
    </div>
  )
}

