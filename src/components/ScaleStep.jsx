import { useState } from 'react'

function ScaleRow({ label, value, onChange }) {
  return (
    <div className="scale-group">
      <p className="scale-label">{label}</p>
      <div className="scale-buttons">
        {[1, 2, 3, 4, 5].map(n => (
          <button
            key={n}
            className={`scale-btn${value === n ? ' selected' : ''}`}
            onClick={() => onChange(n)}
          >
            {n}
          </button>
        ))}
      </div>
      <div className="scale-hint"><span>Ruim</span><span>Excelente</span></div>
    </div>
  )
}

export default function ScaleStep({ titulo, descricao, aspectos, stepKey, onNext, onBack, isLast, loading }) {
  const [ratings, setRatings] = useState({})

  const allFilled = aspectos.every((_, i) => ratings[i] != null)

  function buildAnswer() {
    return aspectos.reduce((acc, label, i) => {
      acc[label] = ratings[i]
      return acc
    }, {})
  }

  return (
    <div>
      <p className="step-title">{titulo}</p>
      <p className="step-desc">{descricao}</p>

      {aspectos.map((label, i) => (
        <ScaleRow
          key={i}
          label={label}
          value={ratings[i]}
          onChange={v => setRatings(prev => ({ ...prev, [i]: v }))}
        />
      ))}

      <div className="btn-row">
        <button className="btn btn-secondary" onClick={onBack}>← Voltar</button>
        <button
          className="btn btn-primary"
          disabled={!allFilled || loading}
          onClick={() => onNext(buildAnswer())}
        >
          {loading ? 'Enviando...' : isLast ? 'Enviar pesquisa ✓' : 'Próximo →'}
        </button>
      </div>
    </div>
  )
}
