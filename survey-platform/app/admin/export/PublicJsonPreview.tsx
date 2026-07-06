'use client'

import { useState } from 'react'

interface PublicJsonPreviewProps {
  fetchUrl: string | null
  displayUrl: string | null
}

export function PublicJsonPreview({ fetchUrl, displayUrl }: PublicJsonPreviewProps) {
  const [jsonText, setJsonText] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function loadJson() {
    if (!fetchUrl) return

    setLoading(true)
    setError(null)
    setCopied(false)

    try {
      const response = await fetch(fetchUrl, { cache: 'no-store' })
      const data = await response.json()
      setJsonText(JSON.stringify(data, null, 2))
    } catch {
      setError('Nao foi possivel carregar o JSON agora.')
    } finally {
      setLoading(false)
    }
  }

  async function copyJson() {
    if (!jsonText) return
    await navigator.clipboard.writeText(jsonText)
    setCopied(true)
  }

  if (!fetchUrl || !displayUrl) {
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-3 text-xs text-slate-500">
        Gere uma nova senha para visualizar o JSON do app nesta tela.
      </div>
    )
  }

  return (
    <details className="rounded-lg border border-slate-200 bg-white">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-3 py-2 marker:hidden">
        <div className="min-w-0">
          <span className="font-sans text-xs font-bold text-slate-900">JSON do app</span>
          <p className="mt-0.5 truncate font-mono text-[11px] text-slate-500">{displayUrl}</p>
        </div>
        <span className="shrink-0 rounded-md border border-slate-200 px-2 py-1 text-[11px] font-bold text-slate-600">
          Ver JSON
        </span>
      </summary>

      <div className="border-t border-slate-100 p-3">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <button
            type="button"
            onClick={loadJson}
            disabled={loading}
            className="rounded-md bg-slate-900 px-3 py-1.5 text-[11px] font-bold text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? 'Carregando...' : jsonText ? 'Atualizar JSON' : 'Carregar JSON'}
          </button>

          {jsonText && (
            <button
              type="button"
              onClick={copyJson}
              className="rounded-md border border-slate-200 px-3 py-1.5 text-[11px] font-bold text-slate-700 hover:bg-slate-50"
            >
              {copied ? 'Copiado' : 'Copiar JSON'}
            </button>
          )}
        </div>

        {error && (
          <p className="rounded-md border border-red-200 bg-red-50 px-2 py-1.5 text-xs font-semibold text-red-700">
            {error}
          </p>
        )}

        {jsonText ? (
          <pre className="max-h-96 overflow-auto rounded-lg bg-slate-950 p-3 font-mono text-[11px] leading-5 text-slate-100">
            {jsonText}
          </pre>
        ) : (
          <p className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500">
            Clique em carregar para ver, dentro do admin, o mesmo JSON entregue pela API publica.
          </p>
        )}
      </div>
    </details>
  )
}
