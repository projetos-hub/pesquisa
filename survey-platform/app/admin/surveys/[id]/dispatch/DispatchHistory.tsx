'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { CommunityDisplay } from '@/lib/community-name'
import type { Community } from './dispatch-form-utils'

interface Job {
  id: string
  community_id: string
  status: string
  error: string | null
  retry_count: number
  sent_at: string | null
  processed_users: number
  failed_users: number
  total_users: number | null
}

interface Dispatch {
  id: string
  title: string
  target_scope: string
  channels: string[]
  status: string
  total_jobs: number
  completed_jobs: number
  failed_jobs: number
  personalized: boolean
  sequence_step: number | null
  scheduled_at: string | null
  created_at: string
  completed_at: string | null
  jobs: Job[]
}

interface AuditLog {
  id: string
  email: string
  nome: string | null
  status: 'sent' | 'failed'
  error: string | null
  sent_at: string | null
  created_at: string
}

interface AuditData {
  total: number
  total_sent: number
  total_failed: number
  logs: AuditLog[]
  loading: boolean
}

const STATUS_LABELS: Record<string, { label: string; cls: string }> = {
  pending: { label: 'Pendente', cls: 'bg-gray-100 text-gray-600' },
  scheduled: { label: 'Agendado', cls: 'bg-blue-100 text-blue-700' },
  sending: { label: 'Enviando...', cls: 'bg-yellow-100 text-yellow-700' },
  sent: { label: 'Enviado', cls: 'bg-green-100 text-green-700' },
  partial_failure: { label: 'Parcial', cls: 'bg-orange-100 text-orange-700' },
  failed: { label: 'Falhou', cls: 'bg-red-100 text-red-700' },
  cancelled: { label: 'Cancelado', cls: 'bg-gray-100 text-gray-500' },
}

const JOB_STATUS_LABELS: Record<string, { label: string; cls: string }> = {
  pending: { label: 'Pendente', cls: 'bg-gray-100 text-gray-600' },
  sending: { label: 'Enviando', cls: 'bg-yellow-100 text-yellow-700' },
  sent: { label: 'Concluido', cls: 'bg-green-100 text-green-700' },
  failed: { label: 'Falhou', cls: 'bg-red-100 text-red-700' },
  skipped: { label: 'Ignorado', cls: 'bg-gray-100 text-gray-500' },
}

function StatusBadge({ status }: { status: string }) {
  const s = STATUS_LABELS[status] ?? { label: status, cls: 'bg-gray-100 text-gray-600' }
  return <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${s.cls}`}>{s.label}</span>
}

function JobStatusBadge({ status }: { status: string }) {
  const s = JOB_STATUS_LABELS[status] ?? { label: status, cls: 'bg-gray-100 text-gray-600' }
  return (
    <span className={`inline-flex min-w-20 justify-center rounded-full px-2 py-0.5 text-[11px] font-medium ${s.cls}`}>
      {s.label}
    </span>
  )
}

function formatDate(iso: string | null): string {
  if (!iso) return '-'
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function scopeLabel(scope: string, count: number): string {
  if (scope === 'all') return `Todas (${count})`
  if (scope === 'group') return 'Turma especifica'
  return `${count} comunidade(s)`
}

function channelLabel(dispatch: Dispatch): string {
  return [
    dispatch.channels.includes('pushNotification') ? 'push' : null,
    dispatch.channels.includes('email') ? 'email' : null,
    dispatch.personalized ? 'personalizado' : null,
  ].filter(Boolean).join(' / ')
}

function clampPercent(value: number): number {
  if (!Number.isFinite(value)) return 0
  return Math.max(0, Math.min(100, Math.round(value)))
}

function jobHandledUsers(job: Job): number {
  return Math.max(0, (job.processed_users ?? 0) + (job.failed_users ?? 0))
}

function jobProgress(job: Job): number {
  if (!job.total_users || job.total_users <= 0) return job.status === 'sent' ? 100 : 0
  return clampPercent((jobHandledUsers(job) / job.total_users) * 100)
}

function dispatchProgress(dispatch: Dispatch) {
  const userTotal = dispatch.jobs.reduce((sum, job) => sum + (job.total_users ?? 0), 0)
  const sentUsers = dispatch.jobs.reduce((sum, job) => sum + (job.processed_users ?? 0), 0)
  const failedUsers = dispatch.jobs.reduce((sum, job) => sum + (job.failed_users ?? 0), 0)
  const activeJobs = dispatch.jobs.filter(job => job.status === 'sending' || job.status === 'pending').length

  if (!dispatch.personalized && userTotal === 0) {
    const totalUsers = dispatch.total_jobs || dispatch.jobs.length
    const sentJobs = dispatch.jobs.filter(job => job.status === 'sent').length
    const failedJobs = dispatch.jobs.filter(job => job.status === 'failed').length
    const handledUsers = sentJobs + failedJobs + dispatch.jobs.filter(job => job.status === 'skipped').length
    const pendingUsers = Math.max(0, totalUsers - handledUsers)
    const percent = totalUsers > 0 ? clampPercent((handledUsers / totalUsers) * 100) : 0

    return {
      totalUsers,
      sentUsers: sentJobs,
      failedUsers: failedJobs,
      handledUsers,
      pendingUsers,
      percent,
      activeJobs,
      unit: 'comunidades',
      sentLabel: 'aceitas pela Layers',
      failedLabel: 'falhas',
    }
  }

  const handledUsers = sentUsers + failedUsers
  const pendingUsers = Math.max(0, userTotal - handledUsers)
  const percent = userTotal > 0 ? clampPercent((handledUsers / userTotal) * 100) : 0

  return {
    totalUsers: userTotal,
    sentUsers,
    failedUsers,
    handledUsers,
    pendingUsers,
    percent,
    activeJobs,
    unit: 'usuarios',
    sentLabel: 'enviados',
    failedLabel: 'falhos',
  }
}

function nonPersonalizedJobLabel(status: string): string {
  if (status === 'sent') return 'Aceito pela Layers'
  if (status === 'failed') return 'Falha na Layers'
  if (status === 'sending') return 'Enviando para a Layers'
  if (status === 'pending') return 'Aguardando envio'
  if (status === 'skipped') return 'Ignorado'
  return status
}

function progressTone(status: string): 'amber' | 'green' | 'red' | 'gray' {
  if (status === 'sent') return 'green'
  if (status === 'failed' || status === 'partial_failure') return 'red'
  if (status === 'cancelled' || status === 'skipped') return 'gray'
  return 'amber'
}

function ProgressBar({ value, tone = 'amber' }: { value: number; tone?: 'amber' | 'green' | 'red' | 'gray' }) {
  const color =
    tone === 'green' ? 'bg-green-500' :
    tone === 'red' ? 'bg-red-500' :
    tone === 'gray' ? 'bg-gray-400' :
    'bg-[#F7941D]'

  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100" aria-hidden="true">
      <div
        className={`h-full rounded-full transition-[width] duration-300 ${color}`}
        style={{ width: `${clampPercent(value)}%` }}
      />
    </div>
  )
}

export default function DispatchHistory({
  dispatches: initial,
  surveyId,
  communities,
}: {
  dispatches: Dispatch[]
  surveyId: string
  communities: Community[]
}) {
  const [dispatches, setDispatches] = useState<Dispatch[]>(initial)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [retrying, setRetrying] = useState<string | null>(null)
  const [auditTab, setAuditTab] = useState<Record<string, 'jobs' | 'emails'>>({})
  const [auditData, setAuditData] = useState<Record<string, AuditData>>({})
  const communityById = useMemo(() => new Map(communities.map(community => [community.id, community])), [communities])

  const loadAudit = useCallback(async (dispatchId: string) => {
    if (auditData[dispatchId]?.logs.length > 0) return
    setAuditData(prev => ({ ...prev, [dispatchId]: { total: 0, total_sent: 0, total_failed: 0, logs: [], loading: true } }))
    try {
      const res = await fetch(`/api/admin/surveys/${surveyId}/dispatch-audit?dispatch_id=${dispatchId}&limit=200`)
      const data = await res.json() as { total: number; total_sent: number; total_failed: number; logs: AuditLog[] }
      setAuditData(prev => ({ ...prev, [dispatchId]: { ...data, loading: false } }))
    } catch {
      setAuditData(prev => ({ ...prev, [dispatchId]: { total: 0, total_sent: 0, total_failed: 0, logs: [], loading: false } }))
    }
  }, [surveyId, auditData])

  const refreshHistory = useCallback(async () => {
    const fresh = await fetch(`/api/admin/surveys/${surveyId}/dispatch`)
    if (!fresh.ok) return
    const json = await fresh.json() as { dispatches: Dispatch[] }
    setDispatches(json.dispatches)
  }, [surveyId])

  const handleRetry = async (dispatchId: string) => {
    setRetrying(dispatchId)
    try {
      const res = await fetch(`/api/admin/dispatch/${dispatchId}/retry`, { method: 'POST' })
      const data = await res.json() as { ok?: boolean }
      if (data.ok) await refreshHistory()
    } finally {
      setRetrying(null)
    }
  }

  useEffect(() => {
    if (!dispatches.some(dispatch => dispatch.status === 'sending')) return

    const interval = window.setInterval(() => {
      void refreshHistory()
    }, 20000)

    return () => window.clearInterval(interval)
  }, [dispatches, refreshHistory])

  if (dispatches.length === 0) {
    return (
      <p className="py-4 text-center text-sm text-gray-400">
        Nenhum disparo realizado ainda.
      </p>
    )
  }

  return (
    <div className="divide-y divide-gray-100">
      {dispatches.map(dispatch => {
        const progress = dispatchProgress(dispatch)
        const isExpanded = expanded === dispatch.id

        return (
          <div key={dispatch.id} className="py-3">
            <div
              role="button"
              tabIndex={0}
              className="grid w-full cursor-pointer grid-cols-[6rem_minmax(0,1fr)_auto] items-center gap-3 rounded-lg px-2 py-2 text-left transition-colors hover:bg-gray-50 sm:grid-cols-[7rem_minmax(0,1fr)_auto_auto_auto_auto]"
              onClick={() => setExpanded(current => current === dispatch.id ? null : dispatch.id)}
              onKeyDown={event => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault()
                  setExpanded(current => current === dispatch.id ? null : dispatch.id)
                }
              }}
              aria-expanded={isExpanded}
            >
              <span className="text-xs text-gray-400">
                {dispatch.sequence_step !== null && (
                  <span className="mr-1 inline-block rounded bg-[#F7941D]/10 px-1 text-xs text-[#F7941D]">
                    passo {(dispatch.sequence_step ?? 0) + 1}
                  </span>
                )}
                {formatDate(dispatch.created_at)}
              </span>

              <span className="min-w-0">
                <span className="block truncate text-sm font-medium text-gray-700">{dispatch.title}</span>
                {dispatch.status === 'sending' && (
                  <span className="mt-1 block text-xs text-gray-500">
                    {progress.percent}% processado - {progress.handledUsers}/{progress.totalUsers || 0} {progress.unit}
                  </span>
                )}
              </span>

              <span className="hidden text-xs text-gray-400 sm:block">
                {scopeLabel(dispatch.target_scope, dispatch.total_jobs)}
              </span>
              <span className="hidden text-xs text-gray-400 sm:block">
                {channelLabel(dispatch)}
              </span>

              <span className="min-w-28">
                {dispatch.status === 'sending' ? (
                  <span className="block">
                    <span className="mb-1 flex items-center justify-between text-[11px] text-gray-500">
                      <span>{progress.percent}%</span>
                      <span>{progress.pendingUsers} pend.</span>
                    </span>
                    <ProgressBar value={progress.percent} />
                  </span>
                ) : (
                  <StatusBadge status={dispatch.status} />
                )}
              </span>

              <span className="flex items-center gap-2">
                {(dispatch.status === 'failed' || dispatch.status === 'partial_failure') && (
                  <button
                    type="button"
                    onClick={event => {
                      event.stopPropagation()
                      void handleRetry(dispatch.id)
                    }}
                    disabled={retrying === dispatch.id}
                    className="rounded px-1 text-xs font-medium text-orange-600 hover:text-orange-800 disabled:opacity-50"
                  >
                    {retrying === dispatch.id ? '...' : 'Retry'}
                  </button>
                )}
                <span className="text-xs text-gray-300">{isExpanded ? '^' : 'v'}</span>
              </span>
            </div>

            {isExpanded && (
              <div className="mt-2 space-y-3 pl-4">
                <div className="rounded-lg border border-gray-100 bg-gray-50 p-3">
                  <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="text-xs font-semibold text-gray-700">
                        {progress.percent}% processado
                      </p>
                      <p className="text-xs text-gray-500">
                        {progress.handledUsers}/{progress.totalUsers || 0} {progress.unit} tratados
                        {progress.pendingUsers > 0 ? ` - ${progress.pendingUsers} pendentes` : ''}
                      </p>
                    </div>
                    {dispatch.status === 'sending' && (
                      <span className="rounded-full bg-yellow-50 px-2 py-1 text-xs font-medium text-yellow-700">
                        Atualiza automaticamente a cada 20s
                      </span>
                    )}
                  </div>
                  <ProgressBar value={progress.percent} tone={progressTone(dispatch.status)} />
                  <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-gray-600 sm:grid-cols-4">
                    <span><strong className="text-gray-800">{progress.sentUsers}</strong> {progress.sentLabel}</span>
                    <span><strong className="text-gray-800">{progress.failedUsers}</strong> {progress.failedLabel}</span>
                    <span><strong className="text-gray-800">{progress.activeJobs}</strong> comunidades ativas</span>
                    <span><strong className="text-gray-800">{dispatch.total_jobs}</strong> comunidades totais</span>
                  </div>
                </div>

                <div className="flex flex-wrap gap-4 text-xs text-gray-500">
                  <span>{dispatch.completed_jobs} jobs enviados</span>
                  {dispatch.failed_jobs > 0 && <span>{dispatch.failed_jobs} jobs falhos</span>}
                  {dispatch.scheduled_at && <span>agendado: {formatDate(dispatch.scheduled_at)}</span>}
                  {dispatch.completed_at && <span>concluido: {formatDate(dispatch.completed_at)}</span>}
                </div>

                {dispatch.personalized && (
                  <div className="flex gap-1 border-b border-gray-100">
                    {(['jobs', 'emails'] as const).map(tab => (
                      <button
                        key={tab}
                        type="button"
                        onClick={() => {
                          setAuditTab(prev => ({ ...prev, [dispatch.id]: tab }))
                          if (tab === 'emails') void loadAudit(dispatch.id)
                        }}
                        className={`rounded-t-md px-3 py-1 text-xs transition-colors ${
                          (auditTab[dispatch.id] ?? 'jobs') === tab
                            ? 'border border-b-white border-gray-200 bg-[#F7941D]/5 font-medium text-[#D97B10]'
                            : 'text-gray-400 hover:text-gray-600'
                        }`}
                      >
                        {tab === 'jobs' ? 'Comunidades' : 'Por email'}
                      </button>
                    ))}
                  </div>
                )}

                {(!dispatch.personalized || (auditTab[dispatch.id] ?? 'jobs') === 'jobs') && (
                  <div className="space-y-2">
                    {dispatch.jobs.map(job => (
                      <div
                        key={job.id}
                        className="grid gap-2 rounded-md border border-gray-100 px-3 py-2 text-xs sm:grid-cols-[minmax(160px,1fr)_minmax(180px,260px)_auto] sm:items-center"
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <JobStatusBadge status={job.status} />
                            <CommunityDisplay
                              communityId={job.community_id}
                              nomeEscola={communityById.get(job.community_id)?.nome}
                              marca={communityById.get(job.community_id)?.marca}
                              unidade={communityById.get(job.community_id)?.unidade}
                              className="min-w-0 flex-1 text-gray-700"
                            />
                          </div>
                          {job.error && (
                            <p className="mt-1 truncate text-red-600" title={job.error}>
                              {job.error}
                            </p>
                          )}
                        </div>

                        {dispatch.personalized ? (
                          <div>
                            <div className="mb-1 flex justify-between text-[11px] text-gray-500">
                              <span>{jobProgress(job)}%</span>
                              <span>
                                {jobHandledUsers(job)}/{job.total_users ?? 0} usuarios
                                {job.failed_users > 0 ? ` (${job.failed_users} falhos)` : ''}
                              </span>
                            </div>
                            <ProgressBar value={jobProgress(job)} tone={progressTone(job.status)} />
                          </div>
                        ) : (
                          <div className="text-[11px] text-gray-500">
                            {nonPersonalizedJobLabel(job.status)}
                          </div>
                        )}

                        <div className="text-right text-[11px] text-gray-400">
                          {job.sent_at ? formatDate(job.sent_at) : 'em lotes de ate 75'}
                          {job.retry_count > 0 && <div>{job.retry_count} tentativas</div>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {dispatch.personalized && auditTab[dispatch.id] === 'emails' && (
                  <div className="space-y-1">
                    {auditData[dispatch.id]?.loading && (
                      <p className="py-2 text-xs text-gray-400">Carregando logs...</p>
                    )}
                    {!auditData[dispatch.id]?.loading && auditData[dispatch.id]?.logs.length === 0 && (
                      <p className="py-2 text-xs text-gray-400">
                        Nenhum log disponivel. Os logs aparecem conforme o envio progride.
                      </p>
                    )}
                    {!auditData[dispatch.id]?.loading && (auditData[dispatch.id]?.logs.length ?? 0) > 0 && (
                      <>
                        <div className="flex gap-3 pb-1 text-xs text-gray-500">
                          <span>{auditData[dispatch.id].total_sent} enviados</span>
                          {auditData[dispatch.id].total_failed > 0 && (
                            <span>{auditData[dispatch.id].total_failed} falhos</span>
                          )}
                          <span className="text-gray-400">({auditData[dispatch.id].total} total)</span>
                        </div>
                        <div className="max-h-48 space-y-0.5 overflow-y-auto">
                          {auditData[dispatch.id].logs.map(log => (
                            <div key={log.id} className="flex items-center gap-2 py-0.5 text-xs">
                              <span className={`h-2 w-2 shrink-0 rounded-full ${log.status === 'sent' ? 'bg-green-500' : 'bg-red-500'}`} />
                              <span className="max-w-[180px] flex-1 truncate text-gray-600">{log.email}</span>
                              {log.nome && (
                                <span className="max-w-[100px] truncate text-gray-400">{log.nome}</span>
                              )}
                              {log.sent_at && (
                                <span className="shrink-0 text-gray-400">{formatDate(log.sent_at)}</span>
                              )}
                              {log.error && (
                                <span className="max-w-[140px] truncate text-red-500" title={log.error}>
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
        )
      })}
    </div>
  )
}

