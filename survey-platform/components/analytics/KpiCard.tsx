interface KpiCardProps {
  label: string
  value: string | number
  subtext?: string
  color?: 'blue' | 'green' | 'yellow' | 'red' | 'purple' | 'gray'
}

const colorMap: Record<NonNullable<KpiCardProps['color']>, string> = {
  blue: 'text-blue-600',
  green: 'text-green-600',
  yellow: 'text-yellow-600',
  red: 'text-red-600',
  purple: 'text-purple-600',
  gray: 'text-gray-600',
}

export function KpiCard({ label, value, subtext, color = 'blue' }: KpiCardProps) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">{label}</p>
      <p className={`text-3xl font-bold ${colorMap[color]}`}>{value}</p>
      {subtext && (
        <p className="text-xs text-gray-400 mt-1">{subtext}</p>
      )}
    </div>
  )
}
