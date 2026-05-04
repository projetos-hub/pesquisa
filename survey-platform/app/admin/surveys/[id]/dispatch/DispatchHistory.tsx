'use client'

import { useState, useCallback } from 'react'

interface Job {
  id:              string
  community_id:    string
  status:          string
  error:           string | null
  retry_count:     number
  sent_at:         string | null
  processed_users: number
  total_users:     number | null
}

interface Dispatch {
  id:             string
  title:          string
  target_scope:   string
  channels:       string[]
  status:         string
  total_jobs:     number
  completed_jobs: number
  failed_jobs:    number
  personalized:   boolean
  sequence_step:  number | null
  scheduled_at:   string | null
  created_at:     string
  completed_at:   string | null
  jobs:           Job[]
}

const STATUS_LABELS: Record<string, { label: string; cls: string }> = {
  pending:         { label: 'Pendente',       cls: 'bg-gray-100 text-gray-600' },
  scheduled:       { label: 'Agendado',       cls: 'bg-blue-100 text-blue-700' },
  sending:         { label: 'Enviando…',      cls: 'bg-yellow-100 text-yellow-700' },
  sent:            { label: 'Enviado',         cls: 'bg-green-100 text-green-700' },
  partial_failure: { label: 'Parcial',        cls: 'bg-orange-100 text-orange-700' },
  failed:          { label: 'Falhou',          cls: 'bg-red-100 text-red-700' },
  cancelled:       { label: 'Cancelado',      cls: 'bg-gray-100 text-gray-500' },
}

const JOB_STATUS_LABELS: Record<string, string> = {
  pending:  '⏳',
  sending:  '↗',
  sent:     '✅',
  failed:   '❌',
  skipped:  '—',
}

function StatusBadge({ status }: { status: string }) {
  const s = STATUS_LABELS[status] ?? { label: status, cls: 'bg-gray-100 text-gray-600' }
  return <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${s.cls}`}>{s.label}</span>
}

function formatDate(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'
  })
}

function scopeLabel(scope: string, count: number): string {
  if (scope === 'all') return `Todas (${count})`
  if (scope === 'group') return 'Turma específica'
  return `${count} comunidade(s)`
}

interface AuditLog {
  id:         string
  email:      string
  nome:       string | null
  status:     'sent' | 'failed'
  error:      string | null
  sent_at:    string | null
  created_at: string
}

interface AuditData {
  total:        number
  total_sent:   number
  total_failed: number
  logs:         AuditLog[]
  loading:      boolean
}

export default function DispatchHistory({
  dispatches: initial,
  surveyId,
}: {
  dispatches: Dispatch[]
  surveyId:   string
}) {
  const [dispatches, setDispatches] = useState<Dispatch[]>(initial)
  const [expanded,   setExpanded]   = useState<string | null>(null)
  const [retrying,   setRetrying]   = useState<string | null>(null)
  const [auditTab,   setAuditTab]   = useState<Record<string, 'jobs' | 'emails'>>({})
  const [auditData,  setAuditData]  = useState<Record<string, AuditData>>({})

  const loadAudit = useCallback(async (dispatchId: string) => {
    if (auditData[dispatchId]?.logs.length > 0) return
    setAuditData(prev => ({ ...prev, [dispatchId]: { total: 0, total_sent: 0, total_failed: 0, logs: [], loading: true } }))
    try {
      const res  = await fetch(`/api/admin/surveys/${surveyId}/dispatch-audit?dispatch_id=${dispatchId}&limit=200`)
      const data = await res.json() as { total: number; total_sent: number; total_failed: number; logs: AuditLog[] }
      setAuditData(prev => ({ ...prev, [dispatchId]: { ...data, loading: false } }))
    } catch {
      setAuditData(prev => ({ ...prev, [dispatchId]: { total: 0, total_sent: 0, total_failed: 0, logs: [], loading: false } }))
    }
  }, [surveyId, auditData])

  const handleRetry = async (dispatchId: string) => {
    setRetrying(dispatchId)
    try {
      const res  = await fetch(`/api/admin/dispatch/${dispatchId}/retry`, { method: 'POST' })
      const data = await res.json() as { ok?: boolean; sent?: number; failed?: number }
      if (data.ok) {
        // Refresh history
        const fresh = await fetch(`/api/admin/surveys/${surveyId}/dispatch`)
        if (fresh.ok) {
          const json = await fresh.json() as { dispatches: Dispatch[] }
          setDispatches(json.dispatches)
        }
      }
    } finally {
      setRetrying(null)
    }
  }

  if (dispatches.length === 0) {
    return (
      <p className="text-sm text-gray-400 py-4 text-center">
        Nenhum disparo realizado ainda.
      </p>
    )
  }

  return (
    <div className="divide-y divide-gray-100">
      {dispatches.map(d => (
        <div key={d.id} className="py-3">
          <div
            className="flex items-center gap-3 cursor-pointer hover:bg-gray-50 rounded-lg px-2 py-1 -mx-2 transition-colors"
            onClick={() => setExpanded(exp => exp === d.id ? null : d.id)}
          >
            {/* Data */}
            <span className="text-xs text-gray-400 shrink-0 w-28">
              {d.sequence_step !== null && (
                <span className="inline-block bg-indigo-100 text-indigo-600 text-xs rounded px-1 mr-1">
                  passo {(d.sequence_step ?? 0) + 1}
                </span>
              )}
              {formatDate(d.created_at)}
            </span>

            {/* Título */}
            <span className="flex-1 text-sm text-gray-700 truncate font-medium">{d.title}</span>

            {/* Escopo */}
            <span className="text-xs text-gray-400 shrink-0 hidden sm:block">
              {scopeLabel(d.target_scope, d.total_jobs)}
            </span>

            {/* Canais */}
            <span className="text-xs text-gray-400 shrink-0 hidden sm:block">
              {d.channels.includes('pushNotification') ? '📲' : ''}
              {d.channels.includes('email') ? '📧' : ''}
              {d.personalized ? ' 👤' : ''}
            </span>

            {/* Status */}
            <div className="shrink-0 flex items-center gap-2">
              <StatusBadge status={d.status} />
              {(d.status === 'failed' || d.status === 'partial_failure') && (
                <button
                  type="button"
                  disabled={retrying === d.id}
                  onClick={e => { e.stopPropagation(); void handleRetry(d.id) }}
                  className="text-xs text-orange-600 hover:text-orange-800 font-medium disabled:opacity-50"
                >
                  {retrying === d.id ? '…' : 'Retry'}
                </button>
              )}
            </div>

            {/* Expand icon */}
            <span className="text-gray-300 text-xs">{expanded === d.id ? '▲' : '▼'}</span>
          </div>

          {/* Detalhes expandidos */}
          {expanded === d.id && (
            <div className="mt-2 pl-4 space-y-2">
              {/* Sumário */}
              <div className="flex gap-4 text-xs text-gray-500">
                <span>✅ {d.completed_jobs} enviados</span>
                {d.failed_jobs > 0 && <span>❌ {d.failed_jobs} falhos</span>}
                {d.scheduled_at && <span>🕐 agendado: {formatDate(d.scheduled_at)}</span>}
                {d.completed_at && <span>concluído: {formatDate(d.completed_at)}</span>}
              </div>

              {/* Abas: Comunidades | Por email (só para personalizados) */}
              {d.personalized && (
                <div className="flex gap-1 border-b border-gray-100">
                  {(['jobs', 'emails'] as const).map(tab => (
                    <button
                      key={tab}
                      type="button"
                      onClick={() => {
                        setAuditTab(prev => ({ ...prev, [d.id]: tab }))
                        if (tab === 'emails') void loadAudit(d.id)
                      }}
                      className={`text-xs px-3 py-1 rounded-t-md transition-colors ${
                        (auditTab[d.id] ?? 'jobs') === tab
                          ? 'bg-indigo-50 text-indigo-700 font-medium border border-b-white border-gray-200'
                          : 'text-gray-400 hover:text-gray-600'
                      }`}
                    >
                      {tab === 'jobs' ? 'Comunidades' : 'Por email'}
                    </button>
                  ))}
                </div>
              )}

              {/* Aba Comunidades */}
              {(!d.personalized || (auditTab[d.id] ?? 'jobs') === 'jobs') && (
                <div className="space-y-1">
                  {d.jobs.map(job => (
                    <div key={job.id} className="flex items-center gap-2 text-xs">
                      <span className="w-4">{JOB_STATUS_LABELS[job.status] ?? '?'}</span>
                      <span className="font-mono text-gray-600 flex-1">{job.community_id}</span>
                      {job.total_users != null && (
                        <span className="text-gray-400">
                          {job.processed_users}/{job.total_users} usuários
                        </span>
                      )}
                      {job.sent_at && <span className="text-gray-400">{formatDate(job.sent_at)}</span>}
                      {job.error && (
                        <span className="text-red-500 truncate max-w-[180px]" title={job.error}>
                          {job.error}
                        </span>
                      )}
                      {job.retry_count > 0 && (
                        <span className="text-gray-400">({job.retry_count} tentativas)</span>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Aba Por email */}
              {d.personalized && auditTab[d.id] === 'emails' && (
                <div className="space-y-1">
                  {auditData[d.id]?.loading && (
                    <p className="text-xs text-gray-400 py-2">Carregando logs…</p>
                  )}
                  {!auditData[d.id]?.loading && auditData[d.id]?.logs.length === 0 && (
                    <p className="text-xs text-gray-400 py-2">
                      Nenhum log disponível. Os logs aparecem conforme o envio progride.
                    </p>
                  )}
                  {!auditData[d.id]?.loading && (auditData[d.id]?.logs.length ?? 0) > 0 && (
                    <>
                      <div className="flex gap-3 text-xs text-gray-500 pb-1">
                        <span>✅ {auditData[d.id].total_sent} enviados</span>
                        {auditData[d.id].total_failed > 0 && (
                          <span>❌ {auditData[d.id].total_failed} falhos</span>
                        )}
                        <span className="text-gray-400">({auditData[d.id].total} total)</span>
                      </div>
                      <div className="max-h-48 overflow-y-auto space-y-0.5">
                        {auditData[d.id].logs.map(log => (
                          <div key={log.id} className="flex items-center gap-2 text-xs py-0.5">
                            <span className="w-4 shrink-0">{log.status === 'sent' ? '✅' : '❌'}</span>
                            <span className="text-gray-600 truncate flex-1 max-w-[180px]">{log.email}</span>
                            {log.nome && (
                              <span className="text-gray-400 truncate max-w-[100px]">{log.nome}</span>
                            )}
                            {log.sent_at && (
                              <span className="text-gray-400 shrink-0">{formatDate(log.sent_at)}</span>
                            )}
                            {log.error && (
                              <span className="text-red-500 truncate max-w-[140px]" title={log.error}>
                                {log.error}
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
