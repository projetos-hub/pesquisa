'use client'

import { useState } from 'react'
import type { RadioStepDef } from '../utils/types'
import { textAlignClassName, textAlignStyle } from '../utils/textAlign'
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
  const alignStyle = textAlignStyle(textAlign)
  const alignClassName = textAlignClassName(textAlign)

  function handleNext() {
    if (!ans) { setTentou(true); return }
    onNext(ans)
  }

  return (
    <div className={alignClassName}>
      {!step.hideTitle && <p className="step-title" style={alignStyle}>{step.titulo}</p>}
      {step.desc && <p className="step-desc" style={alignStyle}>{step.desc}</p>}
      <div className="q-group">
        <p className="question-label" style={alignStyle}>{resolve(step.pergunta)}</p>
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
