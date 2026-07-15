'use client'

import { useState } from 'react'
import type { NPSStepDef } from '../utils/types'
import { textAlignClassName, textAlignStyle } from '../utils/textAlign'
import OptionBtn from '../../ui/OptionBtn'

interface StepNPSProps {
  step: NPSStepDef
  tipo: string
  onNext: (data: { nps: number; participa_bilingue?: string }) => void
  onBack: () => void
}

export default function StepNPS({ step, tipo, onNext, onBack }: StepNPSProps) {
  const [nps, setNps] = useState<number | null>(null)
  const [bil, setBil] = useState<string | null>(null)
  const [tentou, setTentou] = useState(false)
  const perguntaBilingue = step.perguntaBilingue || false
  const ok = nps !== null && (!perguntaBilingue || bil !== null)
  const order = step.order ?? 'desc'
  const scores = order === 'asc' ? [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10] : [10, 9, 8, 7, 6, 5, 4, 3, 2, 1, 0]
  const lowLabel = step.lowLabel ?? 'Nada provavel'
  const highLabel = step.highLabel ?? 'Extremamente provavel'
  const hintLabels = order === 'asc' ? [lowLabel, highLabel] : [highLabel, lowLabel]
  const textAlign = step.textAlign ?? 'left'
  const alignStyle = textAlignStyle(textAlign)
  const alignClassName = textAlignClassName(textAlign)

  function handleNext() {
    if (!ok) { setTentou(true); return }
    onNext({ nps: nps!, ...(perguntaBilingue ? { participa_bilingue: bil! } : {}) })
  }

  return (
    <div className={alignClassName}>
      <p className="step-title" style={alignStyle}>{step.titulo ?? `Qual a probabilidade de recomendar a ${tipo} a um amigo ou colega?`}</p>
      {step.desc && <p className="step-desc" style={alignStyle}>{step.desc}</p>}
      <div className="nps-row">
        {scores.map(n => (
          <button
            key={n}
            type="button"
            className={`nps-btn${nps === n ? ' sel' : ''}`}
            aria-pressed={nps === n}
            aria-label={`Nota ${n}`}
            onClick={() => setNps(n)}
          >
            {n}
          </button>
        ))}
      </div>
      <div className="nps-hint">
        <span>{hintLabels[0]}</span>
        <span>{hintLabels[1]}</span>
      </div>
      {perguntaBilingue && (
        <div className="q-group" style={{ marginTop: 28 }}>
          <p className="question-label" style={alignStyle}>Você faz parte do programa bilíngue?</p>
          <div className="option-list">
            {['Sim', 'Não'].map(op => (
              <OptionBtn key={op} label={op} selected={bil === op} onClick={() => setBil(op)} />
            ))}
          </div>
        </div>
      )}
      {tentou && !ok && (
        <p role="alert" style={{ color: '#e53e3e', fontSize: '.85rem', marginBottom: 8, textAlign: 'right' }}>
          ⚠️ Responda todas as perguntas para continuar.
        </p>
      )}
      <div className="btn-row">
        <button type="button" className="btn btn-secondary" onClick={onBack}>← Voltar</button>
        <button
          type="button"
          className="btn btn-primary"
          disabled={false}
          style={!ok ? { opacity: 0.6, cursor: 'not-allowed' } : undefined}
          onClick={handleNext}
        >
          Próximo →
        </button>
      </div>
    </div>
  )
}

