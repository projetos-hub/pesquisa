'use client'

import { useState, useTransition } from 'react'
import { getFilterOptions } from './actions'
import type { SurveyMeta, FilterOptions } from '@/lib/report-queries'

interface Props {
  surveys: SurveyMeta[]
}

interface PreviewData {
  survey?: { title: string }
  npsMetrics?: {
    total: number
    nps: number
    promotores: number
    neutros: number
    detratores: number
  }
  scaleRows?: { eixo: string; media: number; n_respostas: number; school: string; nome_escola: string }[]
  npsRows?: { nome: string; nps_score: number; categoria: string; nome_escola: string }[]
}

export default function ReportsClient({ surveys }: Props) {
  const [selectedSurvey, setSelectedSurvey] = useState<string>('')
  const [filterOptions, setFilterOptions] = useState<FilterOptions | null>(null)
  const [loadingFilters, startFilterLoad] = useTransition()

  // Filters
  const [communityIds, setCommunityIds] = useState<string[]>([])
  const [perfil, setPerfil] = useState<string>('todos')
  const [serieIds, setSerieIds]     = useState<string[]>([])
  const [onda, setOnda]             = useState<string>('')
  const [dateFrom, setDateFrom]     = useState<string>('')
  const [dateTo, setDateTo]         = useState<string>('')
  const [npsKey]                    = useState<string>('nps')

  // Preview
  const [preview, setPreview]         = useState<PreviewData | null>(null)
  const [loadingPreview, setLoadingPreview] = useState(false)
  const [previewError, setPreviewError] = useState<string | null>(null)

  function buildParams(format: string, report = 'full'): string {
    const p = new URLSearchParams()
    if (communityIds.length) p.set('communityIds', communityIds.join(','))
    if (perfil !== 'todos') p.set('perfil', perfil)
    if (serieIds.length) p.set('serieIds', serieIds.join(','))
    if (onda) p.set('onda', onda)
    if (dateFrom) p.set('dateFrom', dateFrom)
    if (dateTo) p.set('dateTo', dateTo)
    if (npsKey !== 'nps') p.set('npsKey', npsKey)
    p.set('format', format)
    p.set('report', report)
    return p.toString()
  }

  function handleSurveyChange(id: string) {
    setSelectedSurvey(id)
    setFilterOptions(null)
    setPreview(null)
    setPreviewError(null)
    if (!id) return
    startFilterLoad(async () => {
      const opts = await getFilterOptions(id)
      setFilterOptions(opts)
    })
  }

  function toggleItem(list: string[], setList: (v: string[]) => void, item: string) {
    setList(list.includes(item) ? list.filter(x => x !== item) : [...list, item])
  }

  async function handlePreview() {
    if (!selectedSurvey) return
    setLoadingPreview(true)
    setPreviewError(null)
    try {
      const res = await fetch(`/api/admin/reports/${selectedSurvey}?${buildParams('json', 'summary')}`)
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error ?? 'Erro ao carregar preview')
      }
      const data = await res.json() as PreviewData
      setPreview(data)
    } catch (e) {
      setPreviewError(e instanceof Error ? e.message : 'Erro desconhecido')
    } finally {
      setLoadingPreview(false)
    }
  }

  const downloadUrl = selectedSurvey
    ? `/api/admin/reports/${selectedSurvey}?${buildParams('xlsx')}`
    : '#'

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-1">Relatórios Avançados</h1>
        <p className="text-gray-500 text-sm">Filtros, NPS detalhado e XLSX multi-aba</p>
      </div>

      {/* Survey Selector */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">Pesquisa</label>
        <select
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#F7941D]"
          value={selectedSurvey}
          onChange={e => handleSurveyChange(e.target.value)}
        >
          <option value="">-- Selecione uma pesquisa --</option>
          {surveys.map(s => (
            <option key={s.id} value={s.id}>{s.title}</option>
          ))}
        </select>
      </div>

      {/* Filter Panel */}
      {selectedSurvey && (
        <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-4">
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">Filtros</h2>

          {loadingFilters && (
            <p className="text-sm text-gray-400 animate-pulse">Carregando opções de filtro…</p>
          )}

          {filterOptions && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Perfil */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Perfil</label>
                <select
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  value={perfil}
                  onChange={e => setPerfil(e.target.value)}
                >
                  <option value="todos">Todos</option>
                  <option value="aluno">Aluno</option>
                  <option value="responsavel">Responsável</option>
                </select>
              </div>

              {/* Onda */}
              {filterOptions.ondas.length > 0 && (
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Onda</label>
                  <select
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                    value={onda}
                    onChange={e => setOnda(e.target.value)}
                  >
                    <option value="">Todas</option>
                    {filterOptions.ondas.map(o => (
                      <option key={o} value={o}>{o}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Data de */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">De</label>
                <input
                  type="date"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  value={dateFrom}
                  onChange={e => setDateFrom(e.target.value)}
                />
              </div>

              {/* Data até */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Até</label>
                <input
                  type="date"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  value={dateTo}
                  onChange={e => setDateTo(e.target.value)}
                />
              </div>
            </div>
          )}

          {/* Comunidades (checkboxes) */}
          {filterOptions && filterOptions.communities.length > 0 && (
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-2">Escolas</label>
              <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto">
                {filterOptions.communities.map(c => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => toggleItem(communityIds, setCommunityIds, c.id)}
                    className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                      communityIds.includes(c.id)
                        ? 'bg-[#F7941D] text-white border-[#F7941D]'
                        : 'bg-white text-gray-700 border-gray-300 hover:border-[#F7941D]'
                    }`}
                  >
                    {c.nome}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Séries (checkboxes) */}
          {filterOptions && filterOptions.series.length > 0 && (
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-2">Séries</label>
              <div className="flex flex-wrap gap-2">
                {filterOptions.series.map(s => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => toggleItem(serieIds, setSerieIds, s)}
                    className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                      serieIds.includes(s)
                        ? 'bg-[#1E2433] text-white border-[#1E2433]'
                        : 'bg-white text-gray-700 border-gray-300 hover:border-gray-500'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      {selectedSurvey && (
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={handlePreview}
            disabled={loadingPreview}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
          >
            {loadingPreview ? (
              <span className="animate-spin">⟳</span>
            ) : (
              <span>👁</span>
            )}
            Preview JSON
          </button>

          <a
            href={downloadUrl}
            download
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-[#F7941D] hover:bg-[#D97B10] rounded-lg transition-colors"
          >
            <span>⬇</span>
            Exportar XLSX (4 abas)
          </a>
        </div>
      )}

      {/* Preview Error */}
      {previewError && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-700">
          {previewError}
        </div>
      )}

      {/* Preview Panel */}
      {preview && (
        <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-4">
          <h2 className="text-sm font-semibold text-gray-700">Preview — {preview.survey?.title}</h2>

          {preview.npsMetrics && (
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              <KpiCard label="Total" value={preview.npsMetrics.total} />
              <KpiCard label="NPS" value={preview.npsMetrics.nps} highlight />
              <KpiCard label="Promotores" value={preview.npsMetrics.promotores} color="green" />
              <KpiCard label="Neutros" value={preview.npsMetrics.neutros} color="yellow" />
              <KpiCard label="Detratores" value={preview.npsMetrics.detratores} color="red" />
            </div>
          )}

          {preview.scaleRows && preview.scaleRows.length > 0 && (
            <div>
              <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">Médias por Eixo (Rede)</h3>
              <div className="flex flex-wrap gap-3">
                {Object.entries(
                  preview.scaleRows.reduce((acc: Record<string, { sum: number; n: number }>, r) => {
                    if (!acc[r.eixo]) acc[r.eixo] = { sum: 0, n: 0 }
                    acc[r.eixo].sum += Number(r.media) * Number(r.n_respostas)
                    acc[r.eixo].n   += Number(r.n_respostas)
                    return acc
                  }, {})
                ).map(([eixo, { sum, n }]) => {
                  const media = n > 0 ? sum / n : 0
                  return (
                    <div
                      key={eixo}
                      className={`px-3 py-2 rounded-lg text-sm font-medium ${
                        media >= 4.5 ? 'bg-green-100 text-green-800' :
                        media >= 3.5 ? 'bg-yellow-100 text-yellow-800' :
                                       'bg-red-100 text-red-800'
                      }`}
                    >
                      {eixo}: <span className="font-bold">{media.toFixed(2)}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function KpiCard({
  label,
  value,
  highlight,
  color,
}: {
  label: string
  value: number
  highlight?: boolean
  color?: 'green' | 'yellow' | 'red'
}) {
  const colorClass =
    color === 'green'  ? 'bg-green-50 text-green-700' :
    color === 'yellow' ? 'bg-yellow-50 text-yellow-700' :
    color === 'red'    ? 'bg-red-50 text-red-700' :
    highlight          ? 'bg-indigo-50 text-indigo-700' :
                         'bg-gray-50 text-gray-700'

  return (
    <div className={`rounded-lg px-4 py-3 text-center ${colorClass}`}>
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-xs mt-0.5 opacity-80">{label}</div>
    </div>
  )
}
