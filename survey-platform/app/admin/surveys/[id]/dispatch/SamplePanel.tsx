'use client'

import { useState, useCallback } from 'react'
import Link from 'next/link'

interface SampleStats {
  total: number
  resolved: number
  not_found: number
  pending: number
}

interface Props {
  surveyId: string
  initial: SampleStats
}

export default function SamplePanel({ surveyId, initial }: Props) {
  const [stats, setStats]       = useState<SampleStats>(initial)
  const [uploading, setUploading] = useState(false)
  const [uploadMsg, setUploadMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [expanded, setExpanded]   = useState(false)

  const refresh = useCallback(async () => {
    const r = await fetch(`/api/admin/surveys/${surveyId}/sample`)
    if (r.ok) {
      const d = await r.json() as { totals: SampleStats }
      setStats(d.totals)
    }
  }, [surveyId])

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    setUploadMsg(null)

    const fd = new FormData()
    fd.append('file', file)

    try {
      const r = await fetch(`/api/admin/surveys/${surveyId}/sample`, { method: 'POST', body: fd })
      const d = await r.json() as { total_entries?: number; error?: string; diagnostico?: { nomefantasia_nao_mapeados?: string[] } }
      if (!r.ok || d.error) {
        setUploadMsg({ ok: false, text: d.error ?? 'Erro no upload' })
      } else {
        setUploadMsg({ ok: true, text: `${d.total_entries} entradas carregadas. Resolução Layers em andamento.` })
        await refresh()
      }
    } catch {
      setUploadMsg({ ok: false, text: 'Erro de rede' })
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  const hasData = stats.total > 0

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-gray-700">Amostra de disparo</h3>
          <p className="text-xs text-gray-400 mt-0.5">
            Lista de destinatários para scope &quot;Amostra&quot;. Independente do controle de acesso da pesquisa.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setExpanded(v => !v)}
          className="text-xs text-[#F7941D] hover:text-[#D97B10] font-medium"
        >
          {expanded ? 'Fechar' : 'Gerenciar'}
        </button>
      </div>

      {/* Stats rápidos */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'Total',     value: stats.total,     color: 'text-gray-700' },
          { label: 'Resolvidos', value: stats.resolved,  color: 'text-green-600' },
          { label: 'Pendentes', value: stats.pending,   color: 'text-amber-600' },
          { label: 'Não encontrados', value: stats.not_found, color: 'text-red-500' },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-gray-50 rounded-lg p-3 text-center">
            <div className={`text-xl font-bold ${color}`}>{value}</div>
            <div className="text-xs text-gray-400 mt-0.5">{label}</div>
          </div>
        ))}
      </div>

      {expanded && (
        <div className="space-y-3 pt-2 border-t border-gray-100">
          {/* Upload */}
          <div>
            <p className="text-xs font-medium text-gray-600 mb-2">
              Upload Excel — colunas: NOME, NOMEFANTASIA, EMAIL INSTITUCIONAL, EMAIL RESP FIN, EMAIL RESP ACAD
            </p>
            <label className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium cursor-pointer transition-colors ${
              uploading
                ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                : 'bg-[#F7941D] text-white hover:bg-[#D97B10]'
            }`}>
              {uploading ? 'Enviando...' : hasData ? '↑ Substituir amostra' : '↑ Carregar amostra'}
              <input
                type="file"
                accept=".xlsx,.xls"
                className="hidden"
                disabled={uploading}
                onChange={handleFile}
              />
            </label>
            {hasData && (
              <span className="ml-3 text-xs text-amber-600">
                ⚠️ O upload substitui toda a amostra atual
              </span>
            )}
          </div>

          {/* Feedback de upload */}
          {uploadMsg && (
            <div className={`text-xs rounded-lg px-3 py-2 ${
              uploadMsg.ok
                ? 'bg-green-50 text-green-700 border border-green-200'
                : 'bg-red-50 text-red-700 border border-red-200'
            }`}>
              {uploadMsg.ok ? '✓' : '✕'} {uploadMsg.text}
            </div>
          )}

          {/* Botão atualizar + link para gestão completa */}
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={refresh}
              className="text-xs text-gray-500 hover:text-gray-700 underline"
            >
              Atualizar contagens
            </button>
            <Link
              href={`/admin/surveys/${surveyId}/sample`}
              className="text-xs text-[#F7941D] hover:text-[#D97B10] underline"
            >
              Gestão completa (grupos, visualização) →
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
