'use client'

interface AindaNaoAbertaProps {
  openDate: string
}

function fmt(d: string) {
  return new Date(d + 'T00:00:00').toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })
}

export default function AindaNaoAberta({ openDate }: AindaNaoAbertaProps) {
  return (
    <div className="prazo-screen">
      <div className="icon">🗓️</div>
      <h2>A pesquisa ainda não está disponível</h2>
      <p>Ela abrirá em</p>
      <span className="prazo-badge">{fmt(openDate)}</span>
      <p style={{ marginTop: 8 }}>Volte nessa data para participar.</p>
    </div>
  )
}
