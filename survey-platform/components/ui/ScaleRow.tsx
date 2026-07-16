'use client'

interface ScaleRowProps {
  label: string
  value: number | undefined
  values: number[]
  onChange: (v: number) => void
  highlight?: boolean
  highLabel?: string
  lowLabel?: string
}

export default function ScaleRow({ label, value, values, onChange, highlight, highLabel, lowLabel }: ScaleRowProps) {
  return (
    <div className="scale-group" style={highlight ? { borderColor: '#e53e3e', boxShadow: '0 0 0 2px rgba(229,62,62,.15)' } : undefined}>
      <p className="scale-label">{label}</p>
      <div className="scale-btns" role="group" aria-label={label}>
        {values.map(n => (
          <button
            key={n}
            type="button"
            className={'scale-btn' + (value === n ? ' sel' : '')}
            aria-pressed={value === n}
            aria-label={label + ': ' + n}
            onClick={() => onChange(n)}
          >
            {n}
          </button>
        ))}
      </div>
      {(highLabel || lowLabel) && (
        <div className="scale-hint">
          <span>{highLabel}</span>
          <span>{lowLabel}</span>
        </div>
      )}
    </div>
  )
}
