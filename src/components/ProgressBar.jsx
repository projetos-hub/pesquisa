export default function ProgressBar({ percent, step, total }) {
  return (
    <div style={{ padding: '12px 32px 0', background: '#fafafa' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: '#888', marginBottom: 6 }}>
        <span>Etapa {step + 1} de {total}</span>
        <span>{Math.round(percent)}%</span>
      </div>
      <div style={{ height: 6, background: '#e5e7eb', borderRadius: 99 }}>
        <div
          style={{
            height: '100%',
            width: `${percent}%`,
            background: 'linear-gradient(90deg, #667eea, #764ba2)',
            borderRadius: 99,
            transition: 'width 0.4s ease',
          }}
        />
      </div>
      <div style={{ height: 12 }} />
    </div>
  )
}
