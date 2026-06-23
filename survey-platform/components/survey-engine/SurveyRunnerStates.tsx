import type { CSSProperties } from 'react'
import AcessoNegado from './steps/AcessoNegado'
import AindaNaoAberta from './steps/AindaNaoAberta'
import Encerrada from './steps/Encerrada'
import ErroSurvey from './steps/ErroSurvey'

export function LoadingSurveyCard({ loadingLogoUrl }: { loadingLogoUrl: string | null }) {
  return (
    <div className="card loading-card" role="status" aria-live="polite" aria-label="Carregando pesquisa">
      {loadingLogoUrl && (
        <img
          src={loadingLogoUrl}
          alt=""
          className="loading-logo-pulse"
          onError={event => { event.currentTarget.style.display = 'none' }}
        />
      )}
      <div className="loading-dots">
        <span className="loading-dot" aria-hidden="true" />
        <span className="loading-dot" aria-hidden="true" />
        <span className="loading-dot" aria-hidden="true" />
      </div>
      <span className="sr-only">Carregando pesquisa</span>
    </div>
  )
}

export function AccessDeniedCard() {
  return (
    <div className="card">
      <div className="header"><h1>Pesquisa de Satisfação</h1></div>
      <AcessoNegado />
    </div>
  )
}

export function SurveyNotFoundCard({ surveySlug }: { surveySlug: string }) {
  return (
    <div className="card">
      <div className="header"><h1>Pesquisa de Satisfação</h1></div>
      <ErroSurvey surveyId={surveySlug} />
    </div>
  )
}

export function RoleDeniedCard({ title }: { title: string }) {
  return (
    <div className="card">
      <div className="header"><h1>{title}</h1></div>
      <div className="prazo-screen">
        <div className="icon">🔒</div>
        <h2>Pesquisa não disponível</h2>
        <p>Esta pesquisa não está disponível para o seu perfil.</p>
      </div>
    </div>
  )
}

export function NotOpenCard({ title, openDate }: { title: string; openDate: string }) {
  return (
    <div className="card">
      <div className="header"><h1>{title}</h1></div>
      <AindaNaoAberta openDate={openDate} />
    </div>
  )
}

export function ClosedCard({ title, closeDate }: { title: string; closeDate: string }) {
  return (
    <div className="card">
      <div className="header"><h1>{title}</h1></div>
      <Encerrada closeDate={closeDate} />
    </div>
  )
}

export function PausedCard({ title, themeVars }: { title: string; themeVars?: CSSProperties }) {
  return (
    <div className="card" style={themeVars}>
      <div className="header"><h1>{title}</h1></div>
      <div className="prazo-screen">
        <div className="icon">⏸</div>
        <h2>Pesquisa pausada</h2>
        <p>Esta pesquisa está temporariamente pausada. Tente novamente em breve.</p>
      </div>
    </div>
  )
}
