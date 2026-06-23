'use client'

interface SampleGroup {
  id: string
  name: string
  color: string
  member_count: number
}

interface Props {
  groups: SampleGroup[]
  activeGroup: string | null
  loadingGroups: boolean
  onToggleGroup: (groupId: string) => void
  onDeleteGroup: (groupId: string) => void
}

export function SampleGroupList({
  groups,
  activeGroup,
  loadingGroups,
  onToggleGroup,
  onDeleteGroup,
}: Props) {
  if (loadingGroups) {
    return <p className="text-xs text-gray-400 text-center py-4">Carregando grupos...</p>
  }

  if (groups.length === 0) {
    return (
      <p className="text-xs text-gray-400 text-center py-4">
        Nenhum grupo criado. Crie um para segmentar seus disparos.
      </p>
    )
  }

  return (
    <div className="space-y-1">
      {groups.map(group => (
        <div
          key={group.id}
          className={`flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition-colors ${
            activeGroup === group.id
              ? 'bg-[#F7941D]/5 border border-[#F7941D]/20'
              : 'hover:bg-gray-50 border border-transparent'
          }`}
          onClick={() => onToggleGroup(group.id)}
        >
          <span className="w-3 h-3 rounded-full shrink-0" style={{ background: group.color }} />
          <span className="flex-1 text-sm font-medium text-gray-700">{group.name}</span>
          <span className="text-xs text-gray-400">
            {group.member_count} membro{group.member_count !== 1 ? 's' : ''}
          </span>
          <button
            onClick={e => {
              e.stopPropagation()
              onDeleteGroup(group.id)
            }}
            className="text-gray-300 hover:text-red-500 text-xs px-1"
          >
            x
          </button>
        </div>
      ))}
    </div>
  )
}
