'use client'

interface ProgressBarProps {
  step: number
  total: number
}

export default function ProgressBar({ step, total }: ProgressBarProps) {
  const pct = total > 0 ? Math.min((step / total) * 100, 100) : 0
  return (
    <div className="progress-wrap">
      <div className="progress-info">
        <span>Etapa {step + 1} de {total}</span>
        <span>{Math.round(pct)}%</span>
      </div>
      <div className="progress-track">
        <div className="progress-fill" style={{ width: `${pct}%` }} />
      </div>
      <div className="progress-spacer" />
    </div>
  )
}
