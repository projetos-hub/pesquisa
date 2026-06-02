'use client'

import { useState, useCallback } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { TimelineChart } from '@/components/analytics/TimelineChart'

interface TimelinePoint {
  period: string
  total: number
  responsaveis: number
  alunos: number
}

interface Props {
  surveyId: string
  initialData: TimelinePoint[]
  initialGranularity: 'day' | 'week'
}

export default function TimelinePageClient({ surveyId, initialData, initialGranularity }: Props) {
  const [data, setData] = useState(initialData)
  const [granularity, setGranularity] = useState(initialGranularity)
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const pathname = usePathname()

  const handleGranularityChange = useCallback(async (g: 'day' | 'week') => {
    setGranularity(g)
    setLoading(true)
    router.push(`${pathname}?granularity=${g}`, { scroll: false })

    try {
      const res = await fetch(`/api/admin/analytics/timeline?surveyId=${surveyId}&granularity=${g}`)
      if (res.ok) {
        const json = await res.json()
        setData(json.timeline ?? [])
      }
    } finally {
      setLoading(false)
    }
  }, [surveyId, pathname, router])

  return (
    <div>
      {loading && (
        <div className="text-xs text-gray-400 mb-2">Carregando...</div>
      )}
      <TimelineChart
        data={data}
        granularity={granularity}
        onGranularityChange={handleGranularityChange}
      />

      {/* Stats summary */}
      {data.length > 0 && (
        <div className="mt-4 grid grid-cols-3 gap-4">
          <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
            <p className="text-xs text-gray-500 mb-1">Períodos</p>
            <p className="text-xl font-bold text-gray-700">{data.length}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
            <p className="text-xs text-gray-500 mb-1">Pico</p>
            <p className="text-xl font-bold text-blue-600">
              {Math.max(...data.map(d => d.total))}
            </p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
            <p className="text-xs text-gray-500 mb-1">Média</p>
            <p className="text-xl font-bold text-gray-700">
              {(data.reduce((s, d) => s + d.total, 0) / data.length).toFixed(1)}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
