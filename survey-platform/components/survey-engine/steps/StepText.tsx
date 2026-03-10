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
  const resolve = (l: string) => l.replace(/\{tipo\}/g, tipo)
  const ok = !step.obrigatorio || txt.trim().length > 0

  return (
    <div>
      <p className="step-title">{step.titulo}</p>
      {step.desc && <p className="step-desc">{step.desc}</p>}
      <div className="q-group">
        <p className="question-label">{resolve(step.pergunta)}</p>
        <textarea
          className="text-area"
          placeholder={step.placeholder || 'Digite aqui...'}
          value={txt}
          onChange={e => setTxt(e.target.value)}
        />
        {step.obrigatorio && !txt.trim() && (
          <p style={{ fontSize: '.8rem', color: '#e53e3e', marginTop: 4 }}>Campo obrigatório</p>
        )}
      </div>
      <div className="btn-row">
        <button className="btn btn-secondary" onClick={onBack}>← Voltar</button>
        <button className="btn btn-primary" disabled={!ok || loading} onClick={() => onNext(txt.trim())}>
          {loading ? 'Enviando…' : isLast ? 'Enviar pesquisa ✓' : 'Próximo →'}
        </button>
      </div>
    </div>
  )
}
