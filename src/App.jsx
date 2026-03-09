import { useState, useEffect } from 'react'
import ProgressBar from './components/ProgressBar'
import IdentificationStep from './components/IdentificationStep'
import NPSStep from './components/NPSStep'
import BilingualStep from './components/BilingualStep'
import ScaleStep from './components/ScaleStep'
import ThankYou from './components/ThankYou'
import ErrorScreen from './components/ErrorScreen'
import { submitSurvey } from './api/layers'
import './App.css'

// Lê parâmetros passados pela Layers via URL (ex: ?userId=xxx&communityId=yyy&token=zzz)
function getLayersContext() {
  const params = new URLSearchParams(window.location.search)
  return {
    userId: params.get('userId') || '',
    communityId: params.get('communityId') || '',
    token: params.get('token') || '',
  }
}

const STEPS = [
  'identificacao',
  'nps',
  'bilingue',
  'pedagogico',
  'administrativo',
  'infraestrutura',
  'concluido',
]

export default function App() {
  const [step, setStep] = useState(0)
  const [answers, setAnswers] = useState({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const layersCtx = getLayersContext()

  // Determina quais steps serão exibidos (step bilingue aparece só se respondeu "Sim")
  function getActiveSteps() {
    const isBilingue = answers.bilingue?.participa === 'Sim'
    return STEPS.filter(s => s !== 'bilingue' || isBilingue || step <= 2)
  }

  const activeSteps = getActiveSteps()
  const currentStepName = activeSteps[step] ?? 'concluido'
  const totalSteps = activeSteps.length - 1 // exclui "concluido"
  const progressPercent = Math.min((step / totalSteps) * 100, 100)

  function nextStep(stepAnswers) {
    setAnswers(prev => ({ ...prev, [currentStepName]: stepAnswers }))

    // Se pulou bilingue (respondeu "Não"), pula o step de bilingue
    if (currentStepName === 'bilingue' && stepAnswers.participa === 'Não') {
      setStep(s => s + 1)
    } else if (currentStepName === 'nps' && stepAnswers.participa_bilingue === 'Não') {
      // Pular step bilingue: avança 2
      setStep(s => s + 2)
    } else {
      setStep(s => s + 1)
    }
  }

  function prevStep() {
    setStep(s => Math.max(0, s - 1))
  }

  async function handleSubmit(lastStepAnswers) {
    const finalAnswers = { ...answers, infraestrutura: lastStepAnswers }
    setLoading(true)
    setError(null)
    try {
      await submitSurvey(finalAnswers, layersCtx)
      setAnswers(finalAnswers)
      setStep(activeSteps.indexOf('concluido'))
    } catch (err) {
      setError(err.message || 'Erro ao enviar. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  if (error) return <ErrorScreen message={error} onRetry={() => setError(null)} />

  return (
    <div className="app-wrapper">
      <div className="survey-card">
        <div className="survey-header">
          <img src="./logo.png" alt="Logo" className="logo" onError={e => e.target.style.display = 'none'} />
          <h1 className="survey-title">Pesquisa de Satisfação</h1>
          <p className="survey-subtitle">CSAT + Bilíngue 2025</p>
        </div>

        {currentStepName !== 'concluido' && (
          <ProgressBar percent={progressPercent} step={step} total={totalSteps} />
        )}

        <div className="survey-body">
          {currentStepName === 'identificacao' && (
            <IdentificationStep onNext={nextStep} />
          )}
          {currentStepName === 'nps' && (
            <NPSStep onNext={nextStep} onBack={prevStep} />
          )}
          {currentStepName === 'bilingue' && (
            <BilingualStep onNext={nextStep} onBack={prevStep} />
          )}
          {currentStepName === 'pedagogico' && (
            <ScaleStep
              titulo="Eixo Pedagógico"
              descricao="Avalie de 1 a 5 os seguintes aspectos:"
              aspectos={[
                'Qualidade do ensino (professores, metodologias e estímulo ao aprendizado)',
                'Recursos pedagógicos e suporte no integral/ateliê (plataformas, materiais e serviços)',
                'Acolhimento e desenvolvimento emocional (atenção ao aluno e apoio às famílias)',
              ]}
              stepKey="pedagogico"
              onNext={nextStep}
              onBack={prevStep}
            />
          )}
          {currentStepName === 'administrativo' && (
            <ScaleStep
              titulo="Eixo Administrativo"
              descricao="Avalie de 1 a 5 os seguintes aspectos:"
              aspectos={[
                'Gestão e organização escolar (direção, coordenação e rotina de entrada e saída)',
                'Atendimento ao público (secretaria e financeiro)',
                'Canais digitais de comunicação (informações no app escolar, e-mail e redes sociais/sites)',
              ]}
              stepKey="administrativo"
              onNext={nextStep}
              onBack={prevStep}
            />
          )}
          {currentStepName === 'infraestrutura' && (
            <ScaleStep
              titulo="Eixo Infraestrutura"
              descricao="Avalie de 1 a 5 os seguintes aspectos:"
              aspectos={[
                'Conforto e segurança dos espaços (salas, convivência e recepção)',
                'Higiene e conservação (limpeza geral e banheiros)',
                'Alimentação e serviços de apoio (cantina, variedade e organização do refeitório)',
              ]}
              stepKey="infraestrutura"
              onNext={handleSubmit}
              onBack={prevStep}
              isLast
              loading={loading}
            />
          )}
          {currentStepName === 'concluido' && <ThankYou />}
        </div>
      </div>
    </div>
  )
}
