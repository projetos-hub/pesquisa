'use client'

interface ScaleRowProps {
  label: string
  value: number | undefined
  onChange: (v: number) => void
}

export default function ScaleRow({ label, value, onChange }: ScaleRowProps) {
  return (
    <div className="scale-group">
      <p className="scale-label">{label}</p>
      <div className="scale-btns">
        {[1, 2, 3, 4, 5].map(n => (
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
        <span>Ruim</span>
        <span>Excelente</span>
      </div>
    </div>
  )
}
