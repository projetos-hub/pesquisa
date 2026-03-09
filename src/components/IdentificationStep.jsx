import { useState } from 'react'

const PERGUNTAS = [
  {
    key: 'perfil',
    pergunta: 'Você é responsável ou estudante?',
    opcoes: ['Responsável', 'Estudante'],
  },
  {
    key: 'unidade',
    pergunta: 'Qual a sua unidade?',
    opcoes: ['Unidade A', 'Unidade B', 'Unidade C'],
  },
  {
    key: 'segmento',
    pergunta: 'Qual o segmento do estudante?',
    opcoes: ['Infantil', 'Fundamental', 'Médio'],
  },
]

export default function IdentificationStep({ onNext }) {
  const [answers, setAnswers] = useState({})

  const isComplete = PERGUNTAS.every(p => answers[p.key])

  function select(key, value) {
    setAnswers(prev => ({ ...prev, [key]: value }))
  }

  return (
    <div>
      <p className="step-title">Identificação</p>
      <p className="step-desc">Antes de começar, conte-nos um pouco sobre você.</p>

      {PERGUNTAS.map(({ key, pergunta, opcoes }) => (
        <div key={key} style={{ marginBottom: 24 }}>
          <p style={{ fontWeight: 600, fontSize: '0.95rem', marginBottom: 10, color: '#333' }}>
            {pergunta}
          </p>
          <div className="option-list">
            {opcoes.map(op => (
              <button
                key={op}
                className={`option-btn${answers[key] === op ? ' selected' : ''}`}
                onClick={() => select(key, op)}
              >
                <span className="option-radio" />
                {op}
              </button>
            ))}
          </div>
        </div>
      ))}

      <div className="btn-row">
        <button className="btn btn-primary" disabled={!isComplete} onClick={() => onNext(answers)}>
          Próximo →
        </button>
      </div>
    </div>
  )
}
