'use client'

import { useState } from 'react'

interface CommunityRow {
  community_id: string
  nome_escola: string
  total_sessions: number
  nps_score: number | null
  promotores: number
  neutros: number
  detratores: number
  total_nps: number
}

interface CommunityTableProps {
  data: CommunityRow[]
}

type SortKey = 'nome_escola' | 'total_sessions' | 'nps_score'
type SortDir = 'asc' | 'desc'

function npsColor(score: number | null): string {
  if (score === null) return 'text-gray-400'
  if (score >= 50) return 'text-green-600'
  if (score >= 0) return 'text-yellow-600'
  return 'text-red-600'
}

export function CommunityTable({ data }: CommunityTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>('total_sessions')
  const [sortDir, setSortDir] = useState<SortDir>('desc')

  function handleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDir(d => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir('desc')
    }
  }

  const sorted = [...data].sort((a, b) => {
    let va: string | number | null = a[sortKey] as string | number | null
    let vb: string | number | null = b[sortKey] as string | number | null
    if (va === null) va = sortDir === 'desc' ? -Infinity : Infinity
    if (vb === null) vb = sortDir === 'desc' ? -Infinity : Infinity
    if (typeof va === 'string' && typeof vb === 'string') {
      return sortDir === 'asc' ? va.localeCompare(vb) : vb.localeCompare(va)
    }
    return sortDir === 'asc'
      ? (va as number) - (vb as number)
      : (vb as number) - (va as number)
  })

  function sortIcon(col: SortKey) {
    if (sortKey !== col) return <span className="ml-1 text-gray-300">↕</span>
    return <span className="ml-1 text-blue-500">{sortDir === 'asc' ? '↑' : '↓'}</span>
  }

  if (!data.length) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <p className="text-sm text-gray-400">Nenhuma comunidade com resposta.</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200 bg-gray-50">
            <th
              className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3 cursor-pointer select-none hover:text-gray-700"
              onClick={() => handleSort('nome_escola')}
            >
              Escola {sortIcon('nome_escola')}
            </th>
            <th
              className="text-right text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3 cursor-pointer select-none hover:text-gray-700"
              onClick={() => handleSort('total_sessions')}
            >
              Respostas {sortIcon('total_sessions')}
            </th>
            <th
              className="text-right text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3 cursor-pointer select-none hover:text-gray-700"
              onClick={() => handleSort('nps_score')}
            >
              NPS {sortIcon('nps_score')}
            </th>
            <th className="text-center text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">
              P / N / D
            </th>
            <th className="text-right text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">
              % NPS
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {sorted.map(row => {
            const pct = row.total_sessions > 0
              ? Math.round((row.total_nps / row.total_sessions) * 100)
              : 0
            return (
              <tr key={row.community_id} className="hover:bg-gray-50">
                <td className="px-4 py-2.5 text-gray-900 max-w-[220px] truncate">
                  {row.nome_escola}
                </td>
                <td className="px-4 py-2.5 text-right text-gray-700 font-medium">
                  {row.total_sessions}
                </td>
                <td className={`px-4 py-2.5 text-right font-semibold ${npsColor(row.nps_score)}`}>
                  {row.nps_score !== null
                    ? (row.nps_score > 0 ? `+${row.nps_score}` : row.nps_score)
                    : '—'}
                </td>
                <td className="px-4 py-2.5 text-center text-xs text-gray-500">
                  <span className="text-green-600">{row.promotores}</span>
                  {' / '}
                  <span className="text-yellow-600">{row.neutros}</span>
                  {' / '}
                  <span className="text-red-600">{row.detratores}</span>
                </td>
                <td className="px-4 py-2.5 text-right">
                  <div className="flex items-center gap-2 justify-end">
                    <div className="w-16 bg-gray-100 rounded-full h-2">
                      <div
                        className="bg-blue-400 h-2 rounded-full"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="text-xs text-gray-500 w-8 text-right">{pct}%</span>
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
