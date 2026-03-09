import { useState } from 'react'

const INGLES_TODO_DIA = [
  'Qualidade geral do programa e materiais didáticos',
  'Integração do inglês com outras áreas do conhecimento (CLIL)',
  'Desenvolvimento das habilidades e interesse pelo aprendizado do inglês',
]

const TURNO_INTEGRAL = [
  'Qualidade geral do projeto e atividades complementares',
  'Quantidade e diversidade das aulas e horas dedicadas ao inglês',
  'Uso dos espaços da escola para imersão no inglês',
]

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

export default function BilingualStep({ onNext, onBack }) {
  const [ingles, setIngles] = useState({})
  const [turno, setTurno] = useState({})

  const allFilled =
    INGLES_TODO_DIA.every((_, i) => ingles[i] != null) &&
    TURNO_INTEGRAL.every((_, i) => turno[i] != null)

  return (
    <div>
      <p className="step-title">Programa Bilíngue</p>
      <p className="step-desc">Avalie os aspectos do programa bilíngue da escola.</p>

      <p className="section-divider">Inglês Todo Dia</p>
      {INGLES_TODO_DIA.map((label, i) => (
        <ScaleRow
          key={i}
          label={label}
          value={ingles[i]}
          onChange={v => setIngles(prev => ({ ...prev, [i]: v }))}
        />
      ))}

      <p className="section-divider">Turno Integral Bilíngue</p>
      {TURNO_INTEGRAL.map((label, i) => (
        <ScaleRow
          key={i}
          label={label}
          value={turno[i]}
          onChange={v => setTurno(prev => ({ ...prev, [i]: v }))}
        />
      ))}

      <div className="btn-row">
        <button className="btn btn-secondary" onClick={onBack}>← Voltar</button>
        <button
          className="btn btn-primary"
          disabled={!allFilled}
          onClick={() => onNext({ ingles_todo_dia: ingles, turno_integral: turno })}
        >
          Próximo →
        </button>
      </div>
    </div>
  )
}
