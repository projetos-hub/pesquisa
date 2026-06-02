interface NpsGaugeProps {
  nps_score: number | null
  promotores: number
  neutros: number
  detratores: number
}

function npsColor(score: number | null): string {
  if (score === null) return 'text-gray-400'
  if (score >= 50) return 'text-green-600'
  if (score >= 0) return 'text-yellow-600'
  return 'text-red-600'
}

export function NpsGauge({ nps_score, promotores, neutros, detratores }: NpsGaugeProps) {
  const total = promotores + neutros + detratores

  const pctPromotor = total > 0 ? (promotores / total) * 100 : 0
  const pctNeutro = total > 0 ? (neutros / total) * 100 : 0
  const pctDetrator = total > 0 ? (detratores / total) * 100 : 0

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-3">NPS</p>

      {/* Score */}
      <div className="flex items-end gap-2 mb-4">
        <span className={`text-5xl font-bold ${npsColor(nps_score)}`}>
          {nps_score !== null ? (nps_score > 0 ? `+${nps_score}` : nps_score) : '—'}
        </span>
        <span className="text-sm text-gray-400 mb-1.5">/ 100</span>
      </div>

      {/* Bar chart (CSS) */}
      {total > 0 && (
        <div className="space-y-2">
          {/* Promotores */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500 w-20 shrink-0">Promotores</span>
            <div className="flex-1 bg-gray-100 rounded-full h-3">
              <div
                className="bg-green-500 h-3 rounded-full transition-all"
                style={{ width: `${pctPromotor}%` }}
              />
            </div>
            <span className="text-xs text-gray-700 w-16 text-right shrink-0">
              {promotores} ({pctPromotor.toFixed(0)}%)
            </span>
          </div>

          {/* Neutros */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500 w-20 shrink-0">Neutros</span>
            <div className="flex-1 bg-gray-100 rounded-full h-3">
              <div
                className="bg-yellow-400 h-3 rounded-full transition-all"
                style={{ width: `${pctNeutro}%` }}
              />
            </div>
            <span className="text-xs text-gray-700 w-16 text-right shrink-0">
              {neutros} ({pctNeutro.toFixed(0)}%)
            </span>
          </div>

          {/* Detratores */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500 w-20 shrink-0">Detratores</span>
            <div className="flex-1 bg-gray-100 rounded-full h-3">
              <div
                className="bg-red-500 h-3 rounded-full transition-all"
                style={{ width: `${pctDetrator}%` }}
              />
            </div>
            <span className="text-xs text-gray-700 w-16 text-right shrink-0">
              {detratores} ({pctDetrator.toFixed(0)}%)
            </span>
          </div>
        </div>
      )}

      {total === 0 && (
        <p className="text-sm text-gray-400">Nenhuma resposta de NPS ainda.</p>
      )}

      <p className="text-xs text-gray-400 mt-3">{total} respostas de NPS</p>
    </div>
  )
}
