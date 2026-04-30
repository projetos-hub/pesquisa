'use client'

interface ScaleRowProps {
  label: string
  value: number | undefined
  onChange: (v: number) => void
  highlight?: boolean
}

export default function ScaleRow({ label, value, onChange, highlight }: ScaleRowProps) {
  return (
    <div className="scale-group" style={highlight ? { borderLeft: '3px solid #e53e3e', paddingLeft: 8, borderRadius: 4 } : undefined}>
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
        <span>Muito Insatisfeito</span>
        <span>Muito Satisfeito</span>
      </div>
    </div>
  )
}
