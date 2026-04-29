'use client'

export default function SurveyLoadingFallback({ logoUrl }: { logoUrl: string | null }) {
  return (
    <div className="card loading-card">
      {logoUrl && (
        <img
          src={logoUrl}
          alt=""
          className="loading-logo-pulse"
          onError={e => { e.currentTarget.style.display = 'none' }}
        />
      )}
      <div className="loading-dots">
        <span className="loading-dot" />
        <span className="loading-dot" />
        <span className="loading-dot" />
      </div>
    </div>
  )
}
