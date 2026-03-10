'use client'

interface EncerradaProps {
  closeDate: string
}

function fmt(d: string) {
  return new Date(d + 'T00:00:00').toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })
}

export default function Encerrada({ closeDate }: EncerradaProps) {
  return (
    <div className="prazo-screen">
      <div className="icon">🔒</div>
      <h2>Esta pesquisa foi encerrada</h2>
      <p>O prazo de participação terminou em</p>
      <span className="prazo-badge">{fmt(closeDate)}</span>
      <p style={{ marginTop: 8 }}>Agradecemos a todos que participaram.</p>
    </div>
  )
}
