interface PerfilStats {
  perfil: string
  total: number
  total_com_nps: number
  nps_score: number | null
  avg_pedagogico: number | null
  avg_administrativo: number | null
  avg_infraestrutura: number | null
  avg_bilingue: number | null
}

interface PerfilBreakdownProps {
  data: PerfilStats[]
}

function npsColor(score: number | null): string {
  if (score === null) return 'text-gray-400'
  if (score >= 50) return 'text-green-600'
  if (score >= 0) return 'text-yellow-600'
  return 'text-red-600'
}

function ScoreBar({ value, max = 5 }: { value: number | null; max?: number }) {
  if (value === null) return <span className="text-gray-400">—</span>
  const pct = (value / max) * 100
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 bg-gray-100 rounded-full h-2">
        <div
          className="bg-blue-400 h-2 rounded-full"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs text-gray-700 w-8 text-right">{value.toFixed(1)}</span>
    </div>
  )
}

function PerfilCard({ stats }: { stats: PerfilStats }) {
  const isResponsavel = stats.perfil === 'responsavel'
  const label = isResponsavel ? 'Responsável' : stats.perfil === 'aluno' ? 'Aluno' : stats.perfil
  const colorClass = isResponsavel ? 'bg-blue-50 border-blue-200' : 'bg-purple-50 border-purple-200'
  const badgeClass = isResponsavel
    ? 'bg-blue-100 text-blue-700'
    : 'bg-purple-100 text-purple-700'

  return (
    <div className={`rounded-xl border p-5 ${colorClass}`}>
      <div className="flex items-center gap-2 mb-4">
        <span className={`text-xs font-semibold px-2 py-1 rounded-full ${badgeClass}`}>
          {label}
        </span>
        <span className="text-sm text-gray-600">{stats.total} respostas</span>
      </div>

      <div className="space-y-3">
        <div>
          <p className="text-xs text-gray-500 mb-1">NPS</p>
          <p className={`text-2xl font-bold ${npsColor(stats.nps_score)}`}>
            {stats.nps_score !== null
              ? (stats.nps_score > 0 ? `+${stats.nps_score}` : stats.nps_score)
              : '—'}
          </p>
          <p className="text-xs text-gray-400 mt-0.5">{stats.total_com_nps} responderam NPS</p>
        </div>

        <div className="border-t border-gray-200 pt-3 space-y-2">
          {stats.avg_pedagogico !== null && (
            <div>
              <p className="text-xs text-gray-500 mb-1">Pedagógico</p>
              <ScoreBar value={stats.avg_pedagogico} />
            </div>
          )}
          {stats.avg_administrativo !== null && (
            <div>
              <p className="text-xs text-gray-500 mb-1">Administrativo</p>
              <ScoreBar value={stats.avg_administrativo} />
            </div>
          )}
          {stats.avg_infraestrutura !== null && (
            <div>
              <p className="text-xs text-gray-500 mb-1">Infraestrutura</p>
              <ScoreBar value={stats.avg_infraestrutura} />
            </div>
          )}
          {stats.avg_bilingue !== null && (
            <div>
              <p className="text-xs text-gray-500 mb-1">Bilíngue</p>
              <ScoreBar value={stats.avg_bilingue} />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export function PerfilBreakdown({ data }: PerfilBreakdownProps) {
  if (!data.length) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <p className="text-sm text-gray-400">Sem dados de perfil.</p>
      </div>
    )
  }

  // Sort: responsavel first, aluno second
  const sorted = [...data].sort((a, b) => {
    const order: Record<string, number> = { responsavel: 0, aluno: 1 }
    return (order[a.perfil] ?? 99) - (order[b.perfil] ?? 99)
  })

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {sorted.map(stats => (
        <PerfilCard key={stats.perfil} stats={stats} />
      ))}
    </div>
  )
}
