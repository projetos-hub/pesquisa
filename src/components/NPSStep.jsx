import { useState } from 'react'

export default function NPSStep({ onNext, onBack }) {
  const [nps, setNps] = useState(null)
  const [bilingue, setBilingue] = useState(null)

  const isComplete = nps !== null && bilingue !== null

  return (
    <div>
      <p className="step-title">Recomendação</p>
      <p className="step-desc">
        Qual é a probabilidade de você recomendar a escola a um amigo ou colega?
      </p>

      <div className="nps-hint">
        <span>Muito improvável</span>
        <span>Muito provável</span>
      </div>
      <div className="nps-scale">
        {[1, 2, 3, 4, 5].map(n => (
          <button
            key={n}
            className={`nps-btn${nps === n ? ' selected' : ''}`}
            onClick={() => setNps(n)}
          >
            {n}
          </button>
        ))}
      </div>

      <div style={{ marginTop: 32 }}>
        <p style={{ fontWeight: 600, fontSize: '0.95rem', marginBottom: 10, color: '#333' }}>
          Você faz parte do programa bilíngue?
        </p>
        <div className="option-list">
          {['Sim', 'Não'].map(op => (
            <button
              key={op}
              className={`option-btn${bilingue === op ? ' selected' : ''}`}
              onClick={() => setBilingue(op)}
            >
              <span className="option-radio" />
              {op}
            </button>
          ))}
        </div>
      </div>

      <div className="btn-row">
        <button className="btn btn-secondary" onClick={onBack}>← Voltar</button>
        <button
          className="btn btn-primary"
          disabled={!isComplete}
          onClick={() => onNext({ nps, participa_bilingue: bilingue })}
        >
          Próximo →
        </button>
      </div>
    </div>
  )
}
