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
      <div className="scale-btns">
        {[1, 2, 3, 4, 5, 6].map(n => (
          <button
            key={n}
            className={`scale-btn${value === n ? ' sel' : ''}`}
            onClick={() => onChange(n)}
          >
            {n}
          </button>
        ))}
      </div>
      <div className="scale-hint">
        <span>1 - Muito Insatisfeito</span>
        <span>6 - Muito Satisfeito</span>
      </div>
    </div>
  )
}
