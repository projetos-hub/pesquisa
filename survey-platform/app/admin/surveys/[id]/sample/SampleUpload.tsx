'use client'

import { useState, useEffect, useCallback } from 'react'
import QuickSample    from './QuickSample'
import SampleGroups   from './SampleGroups'

interface Community { id: string; nome: string }

interface Props {
  surveyId:    string
  surveySlug:  string
  communities: Community[]
}

interface PreviewRow {
  nome: string
  nomefantasia: string
  emails: string[]
}

interface SampleEntry {
  id:             string
  community_id:   string
  email:          string
  nome:           string
  layers_user_id: string | null
  created_at:     string
}

interface SampleState {
  totals:   { total: number; resolved: number; not_found: number; pending: number }
  entries:  SampleEntry[]
  page:     number
  limit:    number
  has_more: boolean
}

export default function SampleUpload({ surveyId, communities }: Props) {
  const [file,     setFile]     = useState<File | null>(null)
  const [preview,  setPreview]  = useState<PreviewRow[]>([])
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState<string>('')
  const [success,  setSuccess]  = useState<string>('')

  const [resolving,        setResolving]        = useState(false)
  const [resolveProgress,  setResolveProgress]  = useState<{ resolved: number; failed: number; remaining: number; done: boolean } | null>(null)

  const [sampleState,  setSampleState]  = useState<SampleState | null>(null)
  const [loadingState, setLoadingState] = useState(false)
  const [activeTab,    setActiveTab]    = useState<'all' | 'resolved' | 'not_found' | 'pending'>('all')
  const [page,         setPage]         = useState(0)

  const loadSampleState = useCallback(async (p = page, tab = activeTab) => {
    setLoadingState(true)
    try {
      const res = await fetch(`/api/admin/surveys/${surveyId}/sample?page=${p}&limit=200&filter=${tab}`)
      if (res.ok) setSampleState(await res.json() as SampleState)
    } finally {
      setLoadingState(false)
    }
  }, [surveyId, page, activeTab])

  useEffect(() => { void loadSampleState(0, activeTab) }, [surveyId]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (!selectedFile) return
    setError(''); setSuccess('')
    try {
      const { read, utils } = await import('xlsx')
      const buffer   = await selectedFile.arrayBuffer()
      const workbook = read(buffer)
      const sheet    = workbook.Sheets[workbook.SheetNames[0]]
      const rows     = utils.sheet_to_json(sheet) as Record<string, unknown>[]
      const previewData: PreviewRow[] = rows.slice(0, 20).map(row => ({
        nome:         String(row.NOME || ''),
        nomefantasia: String(row.NOMEFANTASIA || ''),
        emails:       [row['EMAIL INSTITUCIONAL'], row['EMAIL RESP FIN'], row['EMAIL RESP ACAD']]
                        .filter(Boolean).map(String),
      }))
      setFile(selectedFile); setPreview(previewData)
    } catch (err) {
      setError(`Erro ao parsear Excel: ${err instanceof Error ? err.message : 'desconhecido'}`)
    }
  }

  const handleUpload = async () => {
    if (!file) { setError('Selecione um arquivo'); return }
    setLoading(true); setError(''); setSuccess('')
    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await fetch(`/api/admin/surveys/${surveyId}/sample`, { method: 'POST', body: formData })
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || 'Erro ao fazer upload') }
      const data = await res.json() as {
        total_entries: number
        diagnostico?: {
          total_linhas_excel: number
          entradas_antes_dedup: number
          duplicatas_removidas: number
          descartadas_sem_email: number
          descartadas_sem_community: number
          nomefantasia_nao_mapeados: string[]
        }
      }
      const d = data.diagnostico
      let msg = `${data.total_entries} entradas importadas de ${d?.total_linhas_excel ?? '?'} linhas.`
      if (d) {
        if (d.duplicatas_removidas > 0)      msg += ` ${d.duplicatas_removidas} duplicatas removidas (mesmo email+escola).`
        if (d.descartadas_sem_email > 0)     msg += ` ${d.descartadas_sem_email} linhas sem email.`
        if (d.descartadas_sem_community > 0) msg += ` ⚠️ ${d.descartadas_sem_community} linhas com escola não mapeada`
          + (d.nomefantasia_nao_mapeados.length ? `: ${d.nomefantasia_nao_mapeados.join(', ')}` : '') + '.'
      }
      setSuccess(msg)
      setFile(null); setPreview([])
      void loadSampleState()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido')
    } finally { setLoading(false) }
  }

  const handleResolve = async () => {
    setResolving(true); setResolveProgress(null)
    let totalResolved = 0, totalFailed = 0
    while (true) {
      const res = await fetch(`/api/admin/surveys/${surveyId}/sample/resolve`, { method: 'POST' })
      if (!res.ok) { setError('Erro ao resolver IDs'); break }
      const data = await res.json() as { resolved: number; failed: number; remaining: number; done: boolean }
      totalResolved += data.resolved
      totalFailed   += data.failed
      // "failed" aqui = não encontrado nesta rodada (NOT_FOUND), não acumula entre chamadas
      setResolveProgress({ resolved: totalResolved, failed: totalFailed, remaining: data.remaining, done: data.done })
      if (data.done) break
      if (data.resolved === 0 && data.failed === 0) break // sem progresso, para
      await new Promise(r => setTimeout(r, 100))
    }
    setResolving(false)
    void loadSampleState()
  }

  const handleDownloadTemplate = async () => {
    const { utils, writeFile } = await import('xlsx')
    const ws = utils.aoa_to_sheet([
      ['NOME', 'NOMEFANTASIA', 'EMAIL INSTITUCIONAL', 'EMAIL RESP FIN', 'EMAIL RESP ACAD'],
      ['João Silva', 'COLÉGIO QI FREGUESIA', 'joao.silva@escola.com.br', '', ''],
      ['Maria Santos', 'COLÉGIO LEONARDO DA VINCI ALFA', 'maria@ldva.com.br', 'fin@ldva.com.br', ''],
    ])
    const wb = utils.book_new()
    utils.book_append_sheet(wb, ws, 'Amostra')
    writeFile(wb, 'modelo-amostra.xlsx')
  }

  const exportNaoEncontrados = async () => {
    // Busca todos os não encontrados para exportar (sem limite de display)
    let allNotFound: SampleEntry[] = []
    let p = 0
    while (true) {
      const res  = await fetch(`/api/admin/surveys/${surveyId}/sample?page=${p}&limit=500&filter=not_found`)
      const data = await res.json() as SampleState
      allNotFound = [...allNotFound, ...data.entries]
      if (!data.has_more) break
      p++
    }
    const linhas = ['email,nome,comunidade', ...allNotFound.map(e => `${e.email},"${e.nome}",${e.community_id}`)]
    const blob = new Blob([linhas.join('\n')], { type: 'text/csv;charset=utf-8;' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a'); a.href = url; a.download = 'nao-encontrados.csv'; a.click()
    URL.revokeObjectURL(url)
  }

  const counts = {
    all:       sampleState?.totals.total     ?? 0,
    resolved:  sampleState?.totals.resolved  ?? 0,
    not_found: sampleState?.totals.not_found ?? 0,
    pending:   sampleState?.totals.pending   ?? 0,
  }

  const entries  = sampleState?.entries ?? []
  const hasMore  = sampleState?.has_more ?? false

  return (
    <div className="space-y-6">

      {/* ── Amostra rápida ───────────────────────────────────────────────── */}
      {communities.length > 0 && (
        <QuickSample
          surveyId={surveyId}
          communities={communities}
          onAdded={() => { setPage(0); void loadSampleState(0, activeTab) }}
        />
      )}

      {/* ── Upload ───────────────────────────────────────────────────────── */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Arquivo Excel (TOTVS)</label>
        <input type="file" accept=".xlsx,.xls" onChange={handleFileChange}
          className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-[#F7941D]/5 file:text-[#D97B10] hover:file:bg-[#F7941D]/10" />
        <div className="flex items-center justify-between mt-1">
          <p className="text-xs text-gray-500">Colunas esperadas: NOME, NOMEFANTASIA, EMAIL INSTITUCIONAL, EMAIL RESP FIN, EMAIL RESP ACAD</p>
          <button onClick={handleDownloadTemplate} type="button"
            className="text-xs text-[#F7941D] hover:text-[#D97B10] whitespace-nowrap ml-3">
            ⬇ Baixar modelo
          </button>
        </div>
      </div>

      {/* Preview */}
      {preview.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-gray-900 mb-2">Preview ({preview.length} linhas)</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50"><tr>
                <th className="px-3 py-2 text-left">Nome</th>
                <th className="px-3 py-2 text-left">Escola</th>
                <th className="px-3 py-2 text-left">Emails</th>
              </tr></thead>
              <tbody>{preview.map((row, i) => (
                <tr key={i} className="border-t">
                  <td className="px-3 py-2 text-gray-700">{row.nome}</td>
                  <td className="px-3 py-2 text-gray-700">{row.nomefantasia}</td>
                  <td className="px-3 py-2 text-gray-600 text-xs">{row.emails.join(', ') || '—'}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        </div>
      )}

      {error   && <div className="p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">{error}</div>}
      {success && <div className="p-3 bg-green-50 border border-green-200 rounded text-green-700 text-sm">✓ {success}</div>}

      {preview.length > 0 && (
        <button onClick={handleUpload} disabled={loading}
          className="w-full bg-[#F7941D] hover:bg-[#D97B10] disabled:bg-gray-400 text-white font-semibold py-2 px-4 rounded">
          {loading ? 'Salvando...' : 'Salvar amostra'}
        </button>
      )}

      {/* ── Resolver IDs ─────────────────────────────────────────────────── */}
      {counts.all > 0 && (
        <div className="border-t pt-4 flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-gray-700">Resolução de IDs Layers</p>
            <p className="text-xs text-gray-500">{counts.pending} pendentes · {counts.resolved} resolvidos · {counts.not_found} não encontrados</p>
            {resolveProgress && !resolveProgress.done && (
              <p className="text-xs text-amber-600 mt-1">Resolvendo... +{resolveProgress.resolved} ✅ +{resolveProgress.failed} ❌ — restam {resolveProgress.remaining}</p>
            )}
            {resolveProgress?.done && <p className="text-xs text-green-600 mt-1">✓ Resolução concluída</p>}
          </div>
          <button onClick={handleResolve} disabled={resolving || counts.pending === 0}
            className="shrink-0 bg-amber-500 hover:bg-amber-600 disabled:bg-gray-300 text-white text-sm font-semibold py-2 px-4 rounded">
            {resolving ? 'Resolvendo...' : counts.pending === 0 ? '✓ Sem pendentes' : `Resolver ${counts.pending} pendentes`}
          </button>
        </div>
      )}

      {/* ── Tabela de resultados ──────────────────────────────────────────── */}
      {counts.all > 0 && (
        <div className="border-t pt-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-900">
              Amostra {loadingState ? '…' : `(${counts.all} entradas)`}
            </h3>
            <div className="flex gap-2">
              {counts.not_found > 0 && (
                <button onClick={exportNaoEncontrados}
                  className="text-xs text-red-600 hover:text-red-800 border border-red-200 rounded px-2 py-1">
                  ⬇ Exportar não encontrados ({counts.not_found})
                </button>
              )}
              <button onClick={() => { setPage(0); void loadSampleState(0, activeTab) }}
                className="text-xs text-gray-400 hover:text-gray-600">↺ Atualizar</button>
            </div>
          </div>

          {/* Abas de filtro */}
          <div className="flex gap-1 border-b">
            {([
              ['all',       `Todos (${counts.all})`],
              ['resolved',  `✅ Resolvidos (${counts.resolved})`],
              ['not_found', `❌ Não encontrados (${counts.not_found})`],
              ['pending',   `⏳ Pendentes (${counts.pending})`],
            ] as const).map(([tab, label]) => (
              <button key={tab} onClick={() => {
                setActiveTab(tab); setPage(0); void loadSampleState(0, tab)
              }}
                className={`text-xs px-3 py-1.5 rounded-t-md transition-colors ${
                  activeTab === tab
                    ? 'bg-white border border-b-white border-gray-200 text-gray-900 font-medium'
                    : 'text-gray-400 hover:text-gray-600'
                }`}>
                {label}
              </button>
            ))}
          </div>

          {/* Tabela paginada */}
          <div className="overflow-auto max-h-96 rounded border border-gray-200">
            <table className="w-full text-xs">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  <th className="px-3 py-2 text-left font-medium text-gray-600">Status</th>
                  <th className="px-3 py-2 text-left font-medium text-gray-600">Nome</th>
                  <th className="px-3 py-2 text-left font-medium text-gray-600">Email</th>
                  <th className="px-3 py-2 text-left font-medium text-gray-600">Comunidade</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {entries.map((e, i) => {
                  const status = e.layers_user_id === null ? '⏳'
                    : e.layers_user_id === 'NOT_FOUND' ? '❌' : '✅'
                  return (
                    <tr key={i} className="hover:bg-gray-50">
                      <td className="px-3 py-1.5">{status}</td>
                      <td className="px-3 py-1.5 text-gray-700">{e.nome}</td>
                      <td className="px-3 py-1.5 text-gray-500 font-mono">{e.email}</td>
                      <td className="px-3 py-1.5 text-gray-400">{e.community_id}</td>
                    </tr>
                  )
                })}
                {entries.length === 0 && (
                  <tr><td colSpan={4} className="px-3 py-4 text-center text-gray-400">Nenhuma entrada nesta categoria</td></tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Paginação */}
          {(page > 0 || hasMore) && (
            <div className="flex items-center justify-between text-xs text-gray-500 pt-1">
              <span>Página {page + 1} · mostrando {entries.length} de {
                activeTab === 'all' ? counts.all : activeTab === 'resolved' ? counts.resolved :
                activeTab === 'not_found' ? counts.not_found : counts.pending
              }</span>
              <div className="flex gap-2">
                {page > 0 && (
                  <button onClick={() => { const p = page - 1; setPage(p); void loadSampleState(p, activeTab) }}
                    className="px-3 py-1 border rounded hover:bg-gray-50">← Anterior</button>
                )}
                {hasMore && (
                  <button onClick={() => { const p = page + 1; setPage(p); void loadSampleState(p, activeTab) }}
                    className="px-3 py-1 border rounded hover:bg-gray-50">Próxima →</button>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Grupos de segmentação ─────────────────────────────────────────── */}
      {communities.length > 0 && (
        <div className="border-t pt-4">
          <SampleGroups surveyId={surveyId} communities={communities} />
        </div>
      )}
    </div>
  )
}
