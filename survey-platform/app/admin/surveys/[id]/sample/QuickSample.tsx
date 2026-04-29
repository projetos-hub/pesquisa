'use client'

import { useState } from 'react'

interface Community { id: string; nome: string }

interface Props {
  surveyId:    string
  communities: Community[]
  onAdded:     () => void
}

interface Result {
  added:               number
  skipped_duplicates:  number
}

export default function QuickSample({ surveyId, communities, onAdded }: Props) {
  const [open,        setOpen]        = useState(false)
  const [communityId, setCommunityId] = useState(communities[0]?.id ?? '')
  const [emailsRaw,   setEmailsRaw]   = useState('')
  const [loading,     setLoading]     = useState(false)
  const [result,      setResult]      = useState<Result | null>(null)
  const [error,       setError]       = useState('')

  const emails = emailsRaw
    .split('\n')
    .map(e => e.trim().toLowerCase())
    .filter(e => e.includes('@'))

  const handleAdd = async () => {
    if (!communityId || emails.length === 0) {
      setError('Selecione uma comunidade e informe ao menos um email.')
      return
    }

    setLoading(true); setError(''); setResult(null)
    try {
      const res = await fetch(`/api/admin/surveys/${surveyId}/sample/quick`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ community_id: communityId, emails }),
      })
      const data = await res.json() as { added?: number; skipped_duplicates?: number; error?: string }
      if (!res.ok) { setError(data.error ?? 'Erro desconhecido'); return }
      setResult({ added: data.added ?? 0, skipped_duplicates: data.skipped_duplicates ?? 0 })
      setEmailsRaw('')
      onAdded()
    } catch {
      setError('Erro de rede')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="border border-dashed border-amber-300 rounded-xl bg-amber-50">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-3 text-left"
      >
        <span className="text-sm font-semibold text-amber-800">
          ⚡ Amostra rápida — colar emails
        </span>
        <span className="text-amber-500 text-xs">{open ? '▲ fechar' : '▼ abrir'}</span>
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-4 border-t border-amber-200 pt-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Comunidade</label>
            <select
              value={communityId}
              onChange={e => setCommunityId(e.target.value)}
              className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2"
            >
              {communities.map(c => (
                <option key={c.id} value={c.id}>{c.nome || c.id}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Emails <span className="text-gray-400">(um por linha)</span>
            </label>
            <textarea
              value={emailsRaw}
              onChange={e => setEmailsRaw(e.target.value)}
              rows={5}
              placeholder={'fulano@escola.com.br\nbeltrano@escola.com.br'}
              className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 font-mono resize-none"
            />
            {emails.length > 0 && (
              <p className="text-xs text-gray-400 mt-0.5">{emails.length} email(s) detectado(s)</p>
            )}
          </div>

          <p className="text-xs text-amber-700">
            Os emails serão adicionados à amostra existente (sem apagar o que já há). Depois, clique em &quot;Resolver pendentes&quot; para resolver os IDs Layers.
          </p>

          {error && (
            <div className="text-xs text-red-700 bg-red-50 border border-red-200 rounded px-3 py-2">{error}</div>
          )}

          <button
            onClick={handleAdd}
            disabled={loading || emails.length === 0}
            className="w-full bg-amber-500 hover:bg-amber-600 disabled:bg-gray-300 text-white font-semibold text-sm py-2 rounded-lg transition-colors"
          >
            {loading ? 'Adicionando…' : `Adicionar ${emails.length || '—'} email(s) à amostra`}
          </button>

          {result && (
            <div className="border-t border-amber-200 pt-3 flex gap-4 text-xs text-gray-600">
              <span>✅ {result.added} adicionado(s)</span>
              {result.skipped_duplicates > 0 && (
                <span>⏭ {result.skipped_duplicates} já existia(m), ignorado(s)</span>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
