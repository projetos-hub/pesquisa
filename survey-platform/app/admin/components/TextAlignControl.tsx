'use client'

export type TextAlign = 'left' | 'center' | 'right' | 'justify'

const OPTIONS: { value: TextAlign; label: string; icon: string }[] = [
  { value: 'left', label: 'Esquerda', icon: 'L' },
  { value: 'center', label: 'Centro', icon: 'C' },
  { value: 'right', label: 'Direita', icon: 'R' },
  { value: 'justify', label: 'Justificado', icon: 'J' },
]

interface TextAlignControlProps {
  value: TextAlign
  onChange: (value: TextAlign) => void
  name?: string
  label?: string
}

export function TextAlignControl({ value, onChange, name, label = 'Alinhamento' }: TextAlignControlProps) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-medium text-gray-700">{label}</label>
      {name && <input type="hidden" name={name} value={value} />}
      <div className="inline-flex rounded-lg border border-gray-200 bg-white p-1">
        {OPTIONS.map(option => (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            title={option.label}
            aria-pressed={value === option.value}
            className={`h-8 min-w-8 rounded-md px-2 text-xs font-bold transition ${
              value === option.value
                ? 'bg-[#F7941D] text-white'
                : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900'
            }`}
          >
            {option.icon}
          </button>
        ))}
      </div>
      {value === 'justify' && (
        <p className="mt-1 text-xs text-amber-700">
          Use justificado com cuidado em textos longos para preservar leitura.
        </p>
      )}
    </div>
  )
}
