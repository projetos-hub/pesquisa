'use client'

import { useState } from 'react'
import type { TextStepDef } from '../utils/types'

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

  function handleNext() {
    if (!ok) { setTentou(true); return }
    onNext(txt.trim())
  }

  return (
    <div>
      {step.titulo !== step.pergunta && <p className="step-title" style={{ textAlign }}>{step.titulo}</p>}
      {step.desc && <p className="step-desc" style={{ textAlign }}>{step.desc}</p>}
      <div className="q-group">
        <p className="question-label" style={{ textAlign }}>{resolve(step.pergunta)}</p>
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
