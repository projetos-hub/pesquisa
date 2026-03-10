'use client'

import { useState } from 'react'
import type { NPSStepDef } from '../utils/types'
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
  const perguntaBilingue = step.perguntaBilingue || false
  const ok = nps !== null && (!perguntaBilingue || bil !== null)

  return (
    <div>
      <p className="step-title">Recomendação</p>
      <p className="step-desc">Qual a probabilidade de recomendar a {tipo} a um amigo ou colega?</p>
      <div className="nps-hint"><span>Muito improvável</span><span>Muito provável</span></div>
      <div className="nps-row">
        {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => (
          <button
            key={n}
            className={`nps-btn${nps === n ? ' sel' : ''}`}
            onClick={() => setNps(n)}
          >
            {n}
          </button>
        ))}
      </div>
      {perguntaBilingue && (
        <div className="q-group" style={{ marginTop: 28 }}>
          <p className="question-label">Você faz parte do programa bilíngue?</p>
          <div className="option-list">
            {['Sim', 'Não'].map(op => (
              <OptionBtn key={op} label={op} selected={bil === op} onClick={() => setBil(op)} />
            ))}
          </div>
        </div>
      )}
      <div className="btn-row">
        <button className="btn btn-secondary" onClick={onBack}>← Voltar</button>
        <button
          className="btn btn-primary"
          disabled={!ok}
          onClick={() => onNext({ nps: nps!, ...(perguntaBilingue ? { participa_bilingue: bil! } : {}) })}
        >
          Próximo →
        </button>
      </div>
    </div>
  )
}
