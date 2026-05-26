'use client'

import { useState, useEffect, useCallback } from 'react'

interface SampleGroup {
  id:           string
  name:         string
  color:        string
  member_count: number
}

interface SampleEntry {
  id:             string
  community_id:   string
  email:          string
  nome:           string
  perfil:         string | null
  layers_user_id: string | null
  in_group:       boolean
}

interface Props {
  surveyId:    string
  communities: { id: string; nome: string }[]
}

const COLORS = ['#6366f1','#ec4899','#f59e0b','#10b981','#3b82f6','#8b5cf6','#ef4444','#14b8a6']

export default function SampleGroups({ surveyId, communities }: Props) {
  const [groups,       setGroups]       = useState<SampleGroup[]>([])
  const [loadingGroups, setLoadingGroups] = useState(true)
  const [activeGroup,  setActiveGroup]  = useState<string | null>(null)
  const [showCreate,   setShowCreate]   = useState(false)
  const [newName,      setNewName]      = useState('')
  const [newColor,     setNewColor]     = useState(COLORS[0])
  const [creating,     setCreating]     = useState(false)

  // Filtros para o painel de membros
  const [filterComm,    setFilterComm]    = useState('')
  const [filterPerfil,  setFilterPerfil]  = useState('')
  const [filterQ,       setFilterQ]       = useState('')
  const [filterStatus,  setFilterStatus]  = useState('')
  const [viewMode,      setViewMode]      = useState<'members' | 'add'>('members')

  const [entries,      setEntries]      = useState<SampleEntry[]>([])
  const [totalEntries, setTotalEntries] = useState(0)
  const [loadingEntries, setLoadingEntries] = useState(false)
  const [selected,     setSelected]     = useState<Set<string>>(new Set())
  const [saving,       setSaving]       = useState(false)

  const loadGroups = useCallback(async () => {
    setLoadingGroups(true)
    try {
      const res  = await fetch(`/api/admin/surveys/${surveyId}/sample/groups`)
      const data = await res.json() as { groups: SampleGroup[] }
      setGroups(data.groups ?? [])
    } finally {
      setLoadingGroups(false)
    }
  }, [surveyId])

  useEffect(() => { void loadGroups() }, [loadGroups])

  const loadEntries = useCallback(async (groupId: string, mode: 'members' | 'add') => {
    setLoadingEntries(true)
    setSelected(new Set())
    try {
      const qs = new URLSearchParams({
        in_group: mode === 'members' ? 'true' : 'false',
        limit: '200',
        ...(filterComm   ? { community: filterComm }   : {}),
        ...(filterPerfil ? { perfil: filterPerfil }     : {}),
        ...(filterQ      ? { q: filterQ }               : {}),
        ...(filterStatus ? { status: filterStatus }     : {}),
      })
      const res  = await fetch(`/api/admin/surveys/${surveyId}/sample/groups/${groupId}/members?${qs}`)
      const data = await res.json() as { entries: SampleEntry[]; total: number }
      setEntries(data.entries ?? [])
      setTotalEntries(data.total ?? 0)
    } finally {
      setLoadingEntries(false)
    }
  }, [surveyId, filterComm, filterPerfil, filterQ, filterStatus])

  useEffect(() => {
    if (activeGroup) void loadEntries(activeGroup, viewMode)
  }, [activeGroup, viewMode, filterComm, filterPerfil, filterQ, filterStatus, loadEntries])

  const handleCreateGroup = async () => {
    if (!newName.trim()) return
    setCreating(true)
    try {
      const res  = await fetch(`/api/admin/surveys/${surveyId}/sample/groups`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ name: newName.trim(), color: newColor }),
      })
      const data = await res.json() as { group?: SampleGroup; error?: string }
      if (data.error) { alert(data.error); return }
      setGroups(prev => [...prev, data.group!])
      setNewName(''); setShowCreate(false)
      setActiveGroup(data.group!.id)
    } finally {
      setCreating(false)
    }
  }

  const handleDeleteGroup = async (groupId: string) => {
    if (!confirm('Apagar este grupo? Os membros da amostra não serão afetados.')) return
    await fetch(`/api/admin/surveys/${surveyId}/sample/groups?id=${groupId}`, { method: 'DELETE' })
    setGroups(prev => prev.filter(g => g.id !== groupId))
    if (activeGroup === groupId) setActiveGroup(null)
  }

  const handleAddMembers = async () => {
    if (selected.size === 0 || !activeGroup) return
    setSaving(true)
    try {
      await fetch(`/api/admin/surveys/${surveyId}/sample/groups/${activeGroup}/members`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ sample_ids: [...selected] }),
      })
      await loadGroups()
      void loadEntries(activeGroup, viewMode)
    } finally {
      setSaving(false)
    }
  }

  const handleRemoveMembers = async () => {
    if (selected.size === 0 || !activeGroup) return
    setSaving(true)
    try {
      await fetch(`/api/admin/surveys/${surveyId}/sample/groups/${activeGroup}/members`, {
        method:  'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ sample_ids: [...selected] }),
      })
      await loadGroups()
      void loadEntries(activeGroup, viewMode)
    } finally {
      setSaving(false)
    }
  }

  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const toggleAll = () => {
    if (selected.size === entries.length) {
      setSelected(new Set())
    } else {
      setSelected(new Set(entries.map(e => e.id)))
    }
  }

  const activeGroupData = groups.find(g => g.id === activeGroup)

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-700">Grupos de Segmentação</h3>
        <button
          onClick={() => setShowCreate(true)}
          className="text-xs bg-[#F7941D] text-white px-3 py-1.5 rounded-lg hover:bg-[#D97B10]"
        >
          + Novo grupo
        </button>
      </div>

      {/* Criar grupo */}
      {showCreate && (
        <div className="border border-dashed border-[#F7941D]/30 rounded-xl bg-[#F7941D]/5 p-4 space-y-3">
          <div className="flex gap-2">
            <input
              type="text"
              value={newName}
              onChange={e => setNewName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && void handleCreateGroup()}
              placeholder="Nome do grupo (ex: Coordenadores, Diretores)"
              className="flex-1 text-sm border border-gray-300 rounded-lg px-3 py-1.5"
            />
            <div className="flex gap-1">
              {COLORS.map(c => (
                <button
                  key={c}
                  onClick={() => setNewColor(c)}
                  className={`w-5 h-5 rounded-full border-2 ${newColor === c ? 'border-gray-800 scale-125' : 'border-transparent'}`}
                  style={{ background: c }}
                />
              ))}
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <button onClick={() => { setShowCreate(false); setNewName('') }} className="text-xs text-gray-500 px-3 py-1.5">Cancelar</button>
            <button
              onClick={() => void handleCreateGroup()}
              disabled={creating || !newName.trim()}
              className="text-xs bg-[#F7941D] text-white px-3 py-1.5 rounded-lg disabled:opacity-50"
            >
              {creating ? 'Criando…' : 'Criar'}
            </button>
          </div>
        </div>
      )}

      {/* Lista de grupos */}
      {loadingGroups ? (
        <p className="text-xs text-gray-400 text-center py-4">Carregando grupos…</p>
      ) : groups.length === 0 ? (
        <p className="text-xs text-gray-400 text-center py-4">Nenhum grupo criado. Crie um para segmentar seus disparos.</p>
      ) : (
        <div className="space-y-1">
          {groups.map(g => (
            <div
              key={g.id}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition-colors ${
                activeGroup === g.id ? 'bg-[#F7941D]/5 border border-[#F7941D]/20' : 'hover:bg-gray-50 border border-transparent'
              }`}
              onClick={() => { setActiveGroup(g.id === activeGroup ? null : g.id); setViewMode('members') }}
            >
              <span className="w-3 h-3 rounded-full shrink-0" style={{ background: g.color }} />
              <span className="flex-1 text-sm font-medium text-gray-700">{g.name}</span>
              <span className="text-xs text-gray-400">{g.member_count} membro{g.member_count !== 1 ? 's' : ''}</span>
              <button
                onClick={e => { e.stopPropagation(); void handleDeleteGroup(g.id) }}
                className="text-gray-300 hover:text-red-500 text-xs px-1"
              >✕</button>
            </div>
          ))}
        </div>
      )}

      {/* Painel de membros */}
      {activeGroup && activeGroupData && (
        <div className="border border-gray-200 rounded-xl p-4 space-y-3">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full" style={{ background: activeGroupData.color }} />
            <span className="text-sm font-semibold text-gray-800">{activeGroupData.name}</span>
            <div className="flex gap-1 ml-auto">
              {(['members', 'add'] as const).map(m => (
                <button
                  key={m}
                  onClick={() => setViewMode(m)}
                  className={`text-xs px-3 py-1 rounded-md transition-colors ${
                    viewMode === m
                      ? 'bg-[#F7941D] text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {m === 'members' ? `Membros (${activeGroupData.member_count})` : 'Adicionar'}
                </button>
              ))}
            </div>
          </div>

          {/* Filtros */}
          <div className="flex flex-wrap gap-2">
            <select
              value={filterComm}
              onChange={e => setFilterComm(e.target.value)}
              className="text-xs border border-gray-200 rounded px-2 py-1"
            >
              <option value="">Todas as comunidades</option>
              {communities.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </select>
            <select
              value={filterPerfil}
              onChange={e => setFilterPerfil(e.target.value)}
              className="text-xs border border-gray-200 rounded px-2 py-1"
            >
              <option value="">Todos os perfis</option>
              <option value="responsavel">Responsável</option>
              <option value="aluno">Aluno</option>
              <option value="colaborador">Colaborador</option>
            </select>
            <select
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value)}
              className="text-xs border border-gray-200 rounded px-2 py-1"
            >
              <option value="">Qualquer status</option>
              <option value="resolved">Resolvidos</option>
              <option value="not_found">Não encontrados</option>
              <option value="pending">Pendentes</option>
            </select>
            <input
              type="text"
              value={filterQ}
              onChange={e => setFilterQ(e.target.value)}
              placeholder="Buscar por nome…"
              className="text-xs border border-gray-200 rounded px-2 py-1 flex-1 min-w-[120px]"
            />
          </div>

          {/* Ações em lote */}
          {selected.size > 0 && (
            <div className="flex items-center gap-2 bg-[#F7941D]/5 rounded-lg px-3 py-2">
              <span className="text-xs text-[#D97B10] flex-1">{selected.size} selecionado(s)</span>
              {viewMode === 'add' ? (
                <button
                  onClick={() => void handleAddMembers()}
                  disabled={saving}
                  className="text-xs bg-[#F7941D] text-white px-3 py-1 rounded disabled:opacity-50"
                >
                  {saving ? 'Adicionando…' : `Adicionar ${selected.size} ao grupo`}
                </button>
              ) : (
                <button
                  onClick={() => void handleRemoveMembers()}
                  disabled={saving}
                  className="text-xs bg-red-500 text-white px-3 py-1 rounded disabled:opacity-50"
                >
                  {saving ? 'Removendo…' : `Remover ${selected.size} do grupo`}
                </button>
              )}
              <button onClick={() => setSelected(new Set())} className="text-xs text-gray-400">✕</button>
            </div>
          )}

          {/* Tabela */}
          {loadingEntries ? (
            <p className="text-xs text-gray-400 text-center py-4">Carregando…</p>
          ) : entries.length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-4">
              {viewMode === 'members' ? 'Nenhum membro neste grupo ainda.' : 'Nenhuma entrada encontrada com esses filtros.'}
            </p>
          ) : (
            <div className="overflow-auto max-h-72 rounded border border-gray-100">
              <table className="w-full text-xs">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="px-2 py-1.5 text-left w-8">
                      <input
                        type="checkbox"
                        checked={selected.size === entries.length && entries.length > 0}
                        onChange={toggleAll}
                      />
                    </th>
                    <th className="px-2 py-1.5 text-left font-medium text-gray-500">Nome</th>
                    <th className="px-2 py-1.5 text-left font-medium text-gray-500">Email</th>
                    <th className="px-2 py-1.5 text-left font-medium text-gray-500">Comunidade</th>
                    <th className="px-2 py-1.5 text-left font-medium text-gray-500">Perfil</th>
                    <th className="px-2 py-1.5 text-center font-medium text-gray-500">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {entries.map(e => {
                    const status = e.layers_user_id === null ? '⏳'
                      : e.layers_user_id === 'NOT_FOUND' ? '❌' : '✅'
                    return (
                      <tr
                        key={e.id}
                        className={`hover:bg-gray-50 cursor-pointer ${selected.has(e.id) ? 'bg-[#F7941D]/5' : ''}`}
                        onClick={() => toggleSelect(e.id)}
                      >
                        <td className="px-2 py-1.5">
                          <input type="checkbox" checked={selected.has(e.id)} onChange={() => toggleSelect(e.id)} onClick={ev => ev.stopPropagation()} />
                        </td>
                        <td className="px-2 py-1.5 text-gray-700">{e.nome || '—'}</td>
                        <td className="px-2 py-1.5 text-gray-500 font-mono">{e.email}</td>
                        <td className="px-2 py-1.5 text-gray-400">{e.community_id}</td>
                        <td className="px-2 py-1.5 text-gray-400">{e.perfil ?? '—'}</td>
                        <td className="px-2 py-1.5 text-center">{status}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
              <div className="px-3 py-1.5 text-xs text-gray-400 border-t">
                {entries.length} de {totalEntries} entrada(s)
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
