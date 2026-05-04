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
  const [tentou, setTentou] = useState(false)
  const perguntaBilingue = step.perguntaBilingue || false
  const ok = nps !== null && (!perguntaBilingue || bil !== null)

  function handleNext() {
    if (!ok) { setTentou(true); return }
    onNext({ nps: nps!, ...(perguntaBilingue ? { participa_bilingue: bil! } : {}) })
  }

  return (
    <div>
      <p className="step-title">{step.titulo ?? `Qual a probabilidade de recomendar a ${tipo} a um amigo ou colega?`}</p>
      {step.desc && <p className="step-desc">{step.desc}</p>}
      <div className="nps-row" style={{ alignItems: 'center' }}>
        <span style={{ fontSize: '.72rem', color: '#718096', whiteSpace: 'nowrap', marginRight: 4 }}>Extremamente provável</span>
        {[10, 9, 8, 7, 6, 5, 4, 3, 2, 1, 0].map(n => (
          <button
            key={n}
            className={`nps-btn${nps === n ? ' sel' : ''}`}
            onClick={() => setNps(n)}
          >
            {n}
          </button>
        ))}
        <span style={{ fontSize: '.72rem', color: '#718096', whiteSpace: 'nowrap', marginLeft: 4 }}>Nada provável</span>
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
      {tentou && !ok && (
        <p style={{ color: '#e53e3e', fontSize: '.85rem', marginBottom: 8, textAlign: 'right' }}>
          ⚠️ Responda todas as perguntas para continuar.
        </p>
      )}
      <div className="btn-row">
        <button className="btn btn-secondary" onClick={onBack}>← Voltar</button>
        <button
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
