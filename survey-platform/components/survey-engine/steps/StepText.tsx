'use client'

import { useState } from 'react'
import type { TextStepDef } from '../utils/types'
import { textAlignClassName, textAlignStyle } from '../utils/textAlign'

interface StepTextProps {
  step: TextStepDef
  tipo: string
  onNext: (data: string) => void
  onBack: () => void
  isLast: boolean
  loading: boolean
}

export default function StepText({ step, tipo, onNext, onBack, isLast, loading }: StepTextProps) {
  const [txt, setTxt] = useState('')
  const [tentou, setTentou] = useState(false)
  const resolve = (l: string) => l.replace(/\{tipo\}/g, tipo)
  const ok = !step.obrigatorio || txt.trim().length > 0
  const textAlign = step.textAlign ?? 'left'
  const alignStyle = textAlignStyle(textAlign)
  const alignClassName = textAlignClassName(textAlign)

  function handleNext() {
    if (!ok) { setTentou(true); return }
    onNext(txt.trim())
  }

  return (
    <div className={alignClassName}>
      {!step.hideTitle && step.titulo !== step.pergunta && <p className="step-title" style={alignStyle}>{step.titulo}</p>}
      {step.desc && <p className="step-desc" style={alignStyle}>{step.desc}</p>}
      <div className="q-group">
        <p className="question-label" style={alignStyle}>{resolve(step.pergunta)}</p>
        <textarea
          className="text-area"
          aria-label={resolve(step.pergunta)}
          placeholder={step.placeholder || 'Digite aqui...'}
          value={txt}
          onChange={e => setTxt(e.target.value)}
        />
        {tentou && !ok && (
          <p role="alert" style={{ fontSize: '.85rem', color: '#e53e3e', marginTop: 4 }}>
            ⚠️ Este campo é obrigatório.
          </p>
        )}
      </div>
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
