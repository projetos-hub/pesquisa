'use client'

interface ScaleRowProps {
  label: string
  value: number | undefined
  onChange: (v: number) => void
  highlight?: boolean
}

export default function ScaleRow({ label, value, onChange, highlight }: ScaleRowProps) {
  return (
    <div className="scale-group" style={highlight ? { borderColor: '#e53e3e', boxShadow: '0 0 0 2px rgba(229,62,62,.15)' } : undefined}>
      <p className="scale-label">{label}</p>
      <div className="scale-btns" role="group" aria-label={label}>
        {[5, 4, 3, 2, 1].map(n => (
          <button
            key={n}
            type="button"
            className={`scale-btn${value === n ? ' sel' : ''}`}
            aria-pressed={value === n}
            aria-label={`${label}: ${n}`}
            onClick={() => onChange(n)}
          >
            {n}
          </button>
        ))}
      </div>
      <div className="scale-hint">
        <span>5 - Muito Satisfeito</span>
        <span>1 - Muito Insatisfeito</span>
      </div>
    </div>
  )
}
