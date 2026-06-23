'use client'

import { SAMPLE_GROUP_COLORS } from './sample-groups-utils'

interface Props {
  newName: string
  newColor: string
  creating: boolean
  onNameChange: (value: string) => void
  onColorChange: (value: string) => void
  onCreate: () => void
  onCancel: () => void
}

export function SampleGroupCreatePanel({
  newName,
  newColor,
  creating,
  onNameChange,
  onColorChange,
  onCreate,
  onCancel,
}: Props) {
  return (
    <div className="border border-dashed border-[#F7941D]/30 rounded-xl bg-[#F7941D]/5 p-4 space-y-3">
      <div className="flex gap-2">
        <input
          type="text"
          value={newName}
          onChange={e => onNameChange(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && onCreate()}
          placeholder="Nome do grupo (ex: Coordenadores, Diretores)"
          className="flex-1 text-sm border border-gray-300 rounded-lg px-3 py-1.5"
        />
        <div className="flex gap-1">
          {SAMPLE_GROUP_COLORS.map(color => (
            <button
              key={color}
              onClick={() => onColorChange(color)}
              className={`w-5 h-5 rounded-full border-2 ${newColor === color ? 'border-gray-800 scale-125' : 'border-transparent'}`}
              style={{ background: color }}
            />
          ))}
        </div>
      </div>
      <div className="flex gap-2 justify-end">
        <button onClick={onCancel} className="text-xs text-gray-500 px-3 py-1.5">
          Cancelar
        </button>
        <button
          onClick={onCreate}
          disabled={creating || !newName.trim()}
          className="text-xs bg-[#F7941D] text-white px-3 py-1.5 rounded-lg disabled:opacity-50"
        >
          {creating ? 'Criando...' : 'Criar'}
        </button>
      </div>
    </div>
  )
}
