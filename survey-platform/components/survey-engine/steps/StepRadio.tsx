'use client'

import { useState } from 'react'
import type { RadioStepDef } from '../utils/types'
import OptionBtn from '../../ui/OptionBtn'

interface StepRadioProps {
  step: RadioStepDef
  tipo: string
  onNext: (data: string) => void
  onBack: () => void
  isLast: boolean
  loading: boolean
}

export default function StepRadio({ step, tipo, onNext, onBack, isLast, loading }: StepRadioProps) {
  const [ans, setAns] = useState<string | null>(null)
  const [tentou, setTentou] = useState(false)
  const resolve = (l: string) => l.replace(/\{tipo\}/g, tipo)
  const opcoes = step.opcoes
  const textAlign = step.textAlign ?? 'left'

  function handleNext() {
    if (!ans) { setTentou(true); return }
    onNext(ans)
  }

  return (
    <div>
      <p className="step-title" style={{ textAlign }}>{step.titulo}</p>
      {step.desc && <p className="step-desc" style={{ textAlign }}>{step.desc}</p>}
      <div className="q-group">
        <p className="question-label" style={{ textAlign }}>{resolve(step.pergunta)}</p>
        <div className="option-list">
          {opcoes.map(op => (
            <OptionBtn key={op} label={resolve(op)} selected={ans === op} onClick={() => setAns(op)} />
          ))}
        </div>
      </div>
      {tentou && !ans && (
        <p role="alert" style={{ color: '#e53e3e', fontSize: '.85rem', marginBottom: 8, textAlign: 'right' }}>
          ⚠️ Selecione uma opção para continuar.
        </p>
      )}
      <div className="btn-row">
        <button type="button" className="btn btn-secondary" onClick={onBack}>← Voltar</button>
        <button
          type="button"
          className="btn btn-primary"
          disabled={loading}
          style={!ans && !loading ? { opacity: 0.6, cursor: 'not-allowed' } : undefined}
          onClick={handleNext}
        >
          {loading ? 'Enviando…' : isLast ? 'Enviar pesquisa ✓' : 'Próximo →'}
        </button>
      </div>
    </div>
  )
}
