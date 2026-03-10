'use client'

interface ErroSurveyProps {
  surveyId: string
}

export default function ErroSurvey({ surveyId }: ErroSurveyProps) {
  return (
    <div className="prazo-screen">
      <div className="icon">⚠️</div>
      <h2>Pesquisa não encontrada</h2>
      <p>A pesquisa <strong>{surveyId || 'solicitada'}</strong> não está disponível no momento.</p>
      <p style={{ marginTop: 8, fontSize: '.85rem', color: '#999' }}>Nossa equipe foi notificada automaticamente.</p>
    </div>
  )
}
