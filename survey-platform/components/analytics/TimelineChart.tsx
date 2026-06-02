'use client'

import { useState } from 'react'
import { formatDateBR } from '@/lib/analytics-utils'

interface TimelinePoint {
  period: string
  total: number
  responsaveis: number
  alunos: number
}

interface TimelineChartProps {
  data: TimelinePoint[]
  granularity: 'day' | 'week'
  onGranularityChange: (g: 'day' | 'week') => void
}

const SVG_HEIGHT = 160
const SVG_PADDING_X = 48
const SVG_PADDING_Y = 16

export function TimelineChart({ data, granularity, onGranularityChange }: TimelineChartProps) {
  const [hovered, setHovered] = useState<number | null>(null)

  if (!data.length) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">Evolução Temporal</p>
        <p className="text-sm text-gray-400">Sem dados para exibir.</p>
      </div>
    )
  }

  const maxVal = Math.max(...data.map(d => d.total), 1)
  const width = Math.max(data.length * 48, 400)

  function yPos(val: number): number {
    return SVG_HEIGHT - SVG_PADDING_Y - ((val / maxVal) * (SVG_HEIGHT - SVG_PADDING_Y * 2))
  }

  function xPos(i: number): number {
    const step = (width - SVG_PADDING_X * 2) / Math.max(data.length - 1, 1)
    return SVG_PADDING_X + i * step
  }

  const totalPoints = data.map((d, i) => `${xPos(i)},${yPos(d.total)}`).join(' ')
  const respPoints = data.map((d, i) => `${xPos(i)},${yPos(d.responsaveis)}`).join(' ')
  const alunoPoints = data.map((d, i) => `${xPos(i)},${yPos(d.alunos)}`).join(' ')

  // Y-axis ticks
  const ticks = [0, Math.round(maxVal / 2), maxVal]

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-center justify-between mb-4">
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Evolução Temporal</p>
        <div className="flex gap-1">
          <button
            onClick={() => onGranularityChange('day')}
            className={`text-xs px-2 py-1 rounded ${
              granularity === 'day'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Dia
          </button>
          <button
            onClick={() => onGranularityChange('week')}
            className={`text-xs px-2 py-1 rounded ${
              granularity === 'week'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Semana
          </button>
        </div>
      </div>

      {/* Legend */}
      <div className="flex gap-4 mb-3 text-xs text-gray-500">
        <span className="flex items-center gap-1">
          <span className="w-3 h-0.5 bg-blue-500 inline-block" /> Total
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-0.5 bg-purple-400 inline-block" /> Responsáveis
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-0.5 bg-emerald-400 inline-block" /> Alunos
        </span>
      </div>

      <div className="overflow-x-auto">
        <svg
          width={width}
          height={SVG_HEIGHT}
          className="block"
          onMouseLeave={() => setHovered(null)}
        >
          {/* Y-axis ticks */}
          {ticks.map(tick => (
            <g key={tick}>
              <line
                x1={SVG_PADDING_X}
                x2={width - SVG_PADDING_X / 2}
                y1={yPos(tick)}
                y2={yPos(tick)}
                stroke="#e5e7eb"
                strokeDasharray="4,4"
              />
              <text
                x={SVG_PADDING_X - 4}
                y={yPos(tick)}
                textAnchor="end"
                dominantBaseline="middle"
                className="text-[10px] fill-gray-400"
                fontSize={10}
              >
                {tick}
              </text>
            </g>
          ))}

          {/* Polylines */}
          {data.length > 1 && (
            <>
              <polyline
                points={totalPoints}
                fill="none"
                stroke="#3b82f6"
                strokeWidth={2}
                strokeLinejoin="round"
              />
              <polyline
                points={respPoints}
                fill="none"
                stroke="#a78bfa"
                strokeWidth={1.5}
                strokeDasharray="4,3"
                strokeLinejoin="round"
              />
              <polyline
                points={alunoPoints}
                fill="none"
                stroke="#34d399"
                strokeWidth={1.5}
                strokeDasharray="4,3"
                strokeLinejoin="round"
              />
            </>
          )}

          {/* Data points + hover */}
          {data.map((d, i) => (
            <g key={d.period}>
              <circle
                cx={xPos(i)}
                cy={yPos(d.total)}
                r={4}
                fill="#3b82f6"
                stroke="white"
                strokeWidth={2}
                style={{ cursor: 'pointer' }}
                onMouseEnter={() => setHovered(i)}
              />
              {/* X-axis label (every nth) */}
              {(data.length <= 14 || i % Math.ceil(data.length / 10) === 0) && (
                <text
                  x={xPos(i)}
                  y={SVG_HEIGHT - 2}
                  textAnchor="middle"
                  fontSize={9}
                  className="fill-gray-400"
                  fill="#9ca3af"
                >
                  {d.period.slice(5)} {/* MM-DD */}
                </text>
              )}

              {/* Tooltip */}
              {hovered === i && (
                <g>
                  <rect
                    x={Math.min(xPos(i) - 50, width - SVG_PADDING_X - 105)}
                    y={yPos(d.total) - 62}
                    width={110}
                    height={58}
                    rx={6}
                    fill="white"
                    stroke="#e5e7eb"
                    strokeWidth={1}
                    filter="drop-shadow(0 1px 4px rgba(0,0,0,0.12))"
                  />
                  <text
                    x={Math.min(xPos(i) - 50, width - SVG_PADDING_X - 105) + 8}
                    y={yPos(d.total) - 48}
                    fontSize={10}
                    fill="#374151"
                    fontWeight="600"
                  >
                    {formatDateBR(d.period)}
                  </text>
                  <text
                    x={Math.min(xPos(i) - 50, width - SVG_PADDING_X - 105) + 8}
                    y={yPos(d.total) - 32}
                    fontSize={10}
                    fill="#6b7280"
                  >
                    Total: {d.total}
                  </text>
                  <text
                    x={Math.min(xPos(i) - 50, width - SVG_PADDING_X - 105) + 8}
                    y={yPos(d.total) - 18}
                    fontSize={10}
                    fill="#6b7280"
                  >
                    Resp: {d.responsaveis} · Alunos: {d.alunos}
                  </text>
                </g>
              )}
            </g>
          ))}
        </svg>
      </div>
    </div>
  )
}
