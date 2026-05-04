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
        <span style={{ fontSize: '.68rem', color: '#718096', whiteSpace: 'nowrap', marginRight: 4, alignSelf: 'center' }}>6 - Muito Satisfeito</span>
        {[6, 5, 4, 3, 2, 1].map(n => (
          <button
            key={n}
            className={`scale-btn${value === n ? ' sel' : ''}`}
            onClick={() => onChange(n)}
          >
            {n}
          </button>
        ))}
        <span style={{ fontSize: '.68rem', color: '#718096', whiteSpace: 'nowrap', marginLeft: 4, alignSelf: 'center' }}>1 - Muito Insatisfeito</span>
      </div>
    </div>
  )
}
