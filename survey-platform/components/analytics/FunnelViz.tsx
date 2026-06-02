import { formatDateBR } from '@/lib/analytics-utils'

interface FunnelDispatch {
  id: string
  title: string | null
  created_at: string
  status: string
  notificados: number
  falhos: number
}

interface FunnelVizProps {
  dispatches: FunnelDispatch[]
  total_notificados: number
  total_respondentes: number
  conversion_rate: number | null
}

function StepBar({ label, value, max, color }: {
  label: string
  value: number
  max: number
  color: string
}) {
  const pct = max > 0 ? (value / max) * 100 : 0
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs text-gray-600">
        <span>{label}</span>
        <span className="font-semibold">{value.toLocaleString('pt-BR')}</span>
      </div>
      <div className="h-6 bg-gray-100 rounded-lg overflow-hidden">
        <div
          className={`h-6 ${color} rounded-lg transition-all flex items-center pl-3`}
          style={{ width: `${Math.max(pct, 2)}%` }}
        >
          {pct > 15 && (
            <span className="text-xs text-white font-medium">{pct.toFixed(1)}%</span>
          )}
        </div>
      </div>
    </div>
  )
}

export function FunnelViz({ dispatches, total_notificados, total_respondentes, conversion_rate }: FunnelVizProps) {
  const maxStep = Math.max(total_notificados, total_respondentes, 1)

  return (
    <div className="space-y-6">
      {/* Funnel steps */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-4">
          Funil Geral
        </p>
        <div className="space-y-4">
          <StepBar
            label="Notificados"
            value={total_notificados}
            max={maxStep}
            color="bg-blue-500"
          />
          <StepBar
            label="Responderam"
            value={total_respondentes}
            max={maxStep}
            color="bg-green-500"
          />
        </div>

        {conversion_rate !== null && (
          <div className="mt-4 p-3 bg-gray-50 rounded-lg">
            <p className="text-xs text-gray-500">Taxa de conversão</p>
            <p className="text-2xl font-bold text-green-600 mt-0.5">{conversion_rate}%</p>
            <p className="text-xs text-gray-400">
              {total_respondentes} de {total_notificados} notificados responderam
            </p>
          </div>
        )}

        {total_notificados === 0 && (
          <p className="text-sm text-gray-400 mt-2">Nenhum disparo enviado ainda.</p>
        )}
      </div>

      {/* Dispatch list */}
      {dispatches.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">
              Disparos ({dispatches.length})
            </p>
          </div>
          <div className="divide-y divide-gray-100">
            {dispatches.map(d => {
              const total = d.notificados + d.falhos
              const successPct = total > 0 ? Math.round((d.notificados / total) * 100) : 0
              return (
                <div key={d.id} className="px-5 py-3 flex items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-900 truncate">
                      {d.title ?? formatDateBR(d.created_at)}
                    </p>
                    <p className="text-xs text-gray-400">{formatDateBR(d.created_at)}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-medium text-gray-700">
                      {d.notificados} enviados
                    </p>
                    {d.falhos > 0 && (
                      <p className="text-xs text-red-500">{d.falhos} falhos</p>
                    )}
                    <p className="text-xs text-gray-400">{successPct}% sucesso</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
