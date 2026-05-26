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

  function handleNext() {
    if (!ans) { setTentou(true); return }
    onNext(ans)
  }

  return (
    <div>
      <p className="step-title">{step.titulo}</p>
      {step.desc && <p className="step-desc">{step.desc}</p>}
      <div className="q-group">
        <p className="question-label">{resolve(step.pergunta)}</p>
        <div className="option-list">
          {opcoes.map(op => (
            <OptionBtn key={op} label={resolve(op)} selected={ans === op} onClick={() => setAns(op)} />
          ))}
        </div>
      </div>
      {tentou && !ans && (
        <p style={{ color: '#e53e3e', fontSize: '.85rem', marginBottom: 8, textAlign: 'right' }}>
          ⚠️ Selecione uma opção para continuar.
        </p>
      )}
      <div className="btn-row">
        <button className="btn btn-secondary" onClick={onBack}>← Voltar</button>
        <button
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
