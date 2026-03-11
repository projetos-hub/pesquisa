'use client'

export default function AcessoNegado() {
  return (
    <div className="prazo-screen">
      <div className="icon">🔒</div>
      <h2>Acesso não autorizado</h2>
      <p>Esta pesquisa não está disponível para a sua instituição.</p>
      <p style={{ marginTop: 8, fontSize: '.85rem', color: '#999' }}>
        Se você acredita que isso é um erro, entre em contato com o suporte.
      </p>
    </div>
  )
}
