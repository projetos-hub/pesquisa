'use client'

import { useState } from 'react'

interface Community { id: string; nome: string }

interface Result {
  email:   string
  status:  'sent' | 'not_found' | 'failed'
  error?:  string
}

interface Props {
  surveyId:    string
  communities: Community[]
}

const STATUS_ICON: Record<Result['status'], string> = {
  sent:      '✅',
  not_found: '⚠️',
  failed:    '❌',
}

const STATUS_LABEL: Record<Result['status'], string> = {
  sent:      'Enviado',
  not_found: 'Não encontrado no Layers',
  failed:    'Falha no envio',
}

export default function ManualDispatch({ surveyId, communities }: Props) {
  const [open,        setOpen]        = useState(false)
  const [communityId, setCommunityId] = useState(communities[0]?.id ?? '')
  const [emailsRaw,   setEmailsRaw]   = useState('')
  const [title,       setTitle]       = useState('')
  const [body,        setBody]        = useState('')
  const [channels,    setChannels]    = useState<string[]>(['pushNotification'])
  const [loading,     setLoading]     = useState(false)
  const [results,     setResults]     = useState<Result[] | null>(null)
  const [error,       setError]       = useState('')

  const toggleChannel = (ch: string) =>
    setChannels(prev => prev.includes(ch) ? prev.filter(c => c !== ch) : [...prev, ch])

  const emails = emailsRaw
    .split('\n')
    .map(e => e.trim().toLowerCase())
    .filter(e => e.includes('@'))

  const handleDispatch = async () => {
    if (!communityId || emails.length === 0 || !title || !body) {
      setError('Preencha comunidade, emails, título e mensagem.')
      return
    }
    if (channels.length === 0) {
      setError('Selecione ao menos um canal.')
      return
    }

    setLoading(true); setError(''); setResults(null)
    try {
      const res = await fetch(`/api/admin/surveys/${surveyId}/dispatch-manual`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          community_id: communityId,
          emails,
          title,
          body,
          channels,
          roles: ['guardian', 'student'],
        }),
      })
      const data = await res.json() as { ok?: boolean; error?: string; results?: Result[] }
      if (!res.ok) { setError(data.error ?? 'Erro desconhecido'); return }
      setResults(data.results ?? [])
    } catch {
      setError('Erro de rede')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="border border-dashed border-amber-300 rounded-xl bg-amber-50">
      {/* Header colapsável */}
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-3 text-left"
      >
        <span className="text-sm font-semibold text-amber-800">
          ⚡ Disparo rápido (testes)
        </span>
        <span className="text-amber-500 text-xs">{open ? '▲ fechar' : '▼ abrir'}</span>
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-4 border-t border-amber-200 pt-4">
          {/* Comunidade */}
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

          {/* Emails */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Emails <span className="text-gray-400">(um por linha, máx. 50)</span>
            </label>
            <textarea
              value={emailsRaw}
              onChange={e => setEmailsRaw(e.target.value)}
              rows={4}
              placeholder={'fulano@escola.com.br\nbeltrano@escola.com.br'}
              className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 font-mono resize-none"
            />
            {emails.length > 0 && (
              <p className="text-xs text-gray-400 mt-0.5">{emails.length} email(s) detectado(s)</p>
            )}
          </div>

          {/* Título */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Título</label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Ex: Responda nossa pesquisa!"
              className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2"
            />
          </div>

          {/* Mensagem */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Mensagem</label>
            <textarea
              value={body}
              onChange={e => setBody(e.target.value)}
              rows={3}
              placeholder="Ex: Olá! Sua opinião é muito importante para nós."
              className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 resize-none"
            />
          </div>

          {/* Canais */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Canais</label>
            <div className="flex gap-4">
              {(['pushNotification', 'email'] as const).map(ch => (
                <label key={ch} className="flex items-center gap-1.5 text-sm text-gray-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={channels.includes(ch)}
                    onChange={() => toggleChannel(ch)}
                    className="text-amber-500"
                  />
                  {ch === 'pushNotification' ? '📲 Push' : '✉️ Email'}
                </label>
              ))}
            </div>
          </div>

          {error && (
            <div className="text-xs text-red-700 bg-red-50 border border-red-200 rounded px-3 py-2">{error}</div>
          )}

          <button
            onClick={handleDispatch}
            disabled={loading || emails.length === 0}
            className="w-full bg-amber-500 hover:bg-amber-600 disabled:bg-gray-300 text-white font-semibold text-sm py-2 rounded-lg transition-colors"
          >
            {loading ? 'Disparando…' : `Disparar para ${emails.length || '—'} email(s)`}
          </button>

          {/* Resultados */}
          {results && (
            <div className="border-t border-amber-200 pt-3 space-y-2">
              <div className="flex gap-4 text-xs text-gray-500">
                <span>✅ {results.filter(r => r.status === 'sent').length} enviados</span>
                <span>⚠️ {results.filter(r => r.status === 'not_found').length} não encontrados</span>
                {results.some(r => r.status === 'failed') && (
                  <span>❌ {results.filter(r => r.status === 'failed').length} falhos</span>
                )}
              </div>
              <div className="max-h-48 overflow-y-auto space-y-1">
                {results.map((r, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs">
                    <span>{STATUS_ICON[r.status]}</span>
                    <span className="font-mono text-gray-700 flex-1 truncate">{r.email}</span>
                    <span className="text-gray-400">{STATUS_LABEL[r.status]}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
