'use client'

import { useCallback, useEffect, useState } from 'react'

import { SampleGroupCreatePanel } from './SampleGroupCreatePanel'
import { SampleGroupList } from './SampleGroupList'
import {
  buildMembersQuery,
  layersResolutionIcon,
  SAMPLE_GROUP_COLORS,
  selectAllOrNone,
  toggleSelectedId,
} from './sample-groups-utils'

interface SampleGroup {
  id: string
  name: string
  color: string
  member_count: number
}

interface SampleEntry {
  id: string
  community_id: string
  email: string
  nome: string
  perfil: string | null
  layers_user_id: string | null
  in_group: boolean
}

interface Props {
  surveyId: string
  communities: { id: string; nome: string }[]
}

export default function SampleGroups({ surveyId, communities }: Props) {
  const [groups, setGroups] = useState<SampleGroup[]>([])
  const [loadingGroups, setLoadingGroups] = useState(true)
  const [activeGroup, setActiveGroup] = useState<string | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [newName, setNewName] = useState('')
  const [newColor, setNewColor] = useState(SAMPLE_GROUP_COLORS[0])
  const [creating, setCreating] = useState(false)

  const [filterComm, setFilterComm] = useState('')
  const [filterPerfil, setFilterPerfil] = useState('')
  const [filterQ, setFilterQ] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [viewMode, setViewMode] = useState<'members' | 'add'>('members')

  const [entries, setEntries] = useState<SampleEntry[]>([])
  const [totalEntries, setTotalEntries] = useState(0)
  const [loadingEntries, setLoadingEntries] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [saving, setSaving] = useState(false)
  const communityById = new Map(communities.map(community => [community.id, community]))
  const communityName = (communityId: string) => communityById.get(communityId)?.nome ?? communityId

  const loadGroups = useCallback(async () => {
    setLoadingGroups(true)
    try {
      const res = await fetch(`/api/admin/surveys/${surveyId}/sample/groups`)
      const data = await res.json() as { groups: SampleGroup[] }
      setGroups(data.groups ?? [])
    } finally {
      setLoadingGroups(false)
    }
  }, [surveyId])

  const loadEntries = useCallback(async (groupId: string, mode: 'members' | 'add') => {
    setLoadingEntries(true)
    setSelected(new Set())
    try {
      const qs = buildMembersQuery({
        mode,
        community: filterComm,
        perfil: filterPerfil,
        q: filterQ,
        status: filterStatus,
      })
      const res = await fetch(`/api/admin/surveys/${surveyId}/sample/groups/${groupId}/members?${qs}`)
      const data = await res.json() as { entries: SampleEntry[]; total: number }
      setEntries(data.entries ?? [])
      setTotalEntries(data.total ?? 0)
    } finally {
      setLoadingEntries(false)
    }
  }, [surveyId, filterComm, filterPerfil, filterQ, filterStatus])

  useEffect(() => { void loadGroups() }, [loadGroups])
  useEffect(() => {
    if (activeGroup) void loadEntries(activeGroup, viewMode)
  }, [activeGroup, viewMode, loadEntries])

  const handleCreateGroup = async () => {
    if (!newName.trim()) return
    setCreating(true)
    try {
      const res = await fetch(`/api/admin/surveys/${surveyId}/sample/groups`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName.trim(), color: newColor }),
      })
      const data = await res.json() as { group?: SampleGroup; error?: string }
      if (data.error) { alert(data.error); return }
      setGroups(prev => [...prev, data.group!])
      setNewName('')
      setShowCreate(false)
      setActiveGroup(data.group!.id)
    } finally {
      setCreating(false)
    }
  }

  const handleDeleteGroup = async (groupId: string) => {
    if (!confirm('Apagar este grupo? Os membros da amostra nÃƒÂ£o serÃƒÂ£o afetados.')) return
    await fetch(`/api/admin/surveys/${surveyId}/sample/groups?id=${groupId}`, { method: 'DELETE' })
    setGroups(prev => prev.filter(g => g.id !== groupId))
    if (activeGroup === groupId) setActiveGroup(null)
  }

  const saveMembers = async (method: 'POST' | 'DELETE') => {
    if (selected.size === 0 || !activeGroup) return
    setSaving(true)
    try {
      await fetch(`/api/admin/surveys/${surveyId}/sample/groups/${activeGroup}/members`, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sample_ids: [...selected] }),
      })
      await loadGroups()
      void loadEntries(activeGroup, viewMode)
    } finally {
      setSaving(false)
    }
  }

  const activeGroupData = groups.find(g => g.id === activeGroup)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-700">Grupos de SegmentaÃƒÂ§ÃƒÂ£o</h3>
        <button
          onClick={() => setShowCreate(true)}
          className="text-xs bg-[#F7941D] text-white px-3 py-1.5 rounded-lg hover:bg-[#D97B10]"
        >
          + Novo grupo
        </button>
      </div>

      {showCreate && (
        <SampleGroupCreatePanel
          newName={newName}
          newColor={newColor}
          creating={creating}
          onNameChange={setNewName}
          onColorChange={setNewColor}
          onCreate={() => void handleCreateGroup()}
          onCancel={() => { setShowCreate(false); setNewName('') }}
        />
      )}

      <SampleGroupList
        groups={groups}
        activeGroup={activeGroup}
        loadingGroups={loadingGroups}
        onToggleGroup={groupId => {
          setActiveGroup(groupId === activeGroup ? null : groupId)
          setViewMode('members')
        }}
        onDeleteGroup={groupId => void handleDeleteGroup(groupId)}
      />

      {activeGroup && activeGroupData && (
        <div className="border border-gray-200 rounded-xl p-4 space-y-3">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full" style={{ background: activeGroupData.color }} />
            <span className="text-sm font-semibold text-gray-800">{activeGroupData.name}</span>
            <div className="flex gap-1 ml-auto">
              {(['members', 'add'] as const).map(mode => (
                <button
                  key={mode}
                  onClick={() => setViewMode(mode)}
                  className={`text-xs px-3 py-1 rounded-md transition-colors ${
                    viewMode === mode ? 'bg-[#F7941D] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {mode === 'members' ? `Membros (${activeGroupData.member_count})` : 'Adicionar'}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <select value={filterComm} onChange={e => setFilterComm(e.target.value)} className="text-xs border border-gray-200 rounded px-2 py-1">
              <option value="">Todas as comunidades</option>
              {communities.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </select>
            <select value={filterPerfil} onChange={e => setFilterPerfil(e.target.value)} className="text-xs border border-gray-200 rounded px-2 py-1">
              <option value="">Todos os perfis</option>
              <option value="responsavel">ResponsÃƒÂ¡vel</option>
              <option value="aluno">Aluno</option>
              <option value="colaborador">Colaborador</option>
            </select>
            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="text-xs border border-gray-200 rounded px-2 py-1">
              <option value="">Qualquer status</option>
              <option value="resolved">Resolvidos</option>
              <option value="not_found">NÃƒÂ£o encontrados</option>
              <option value="pending">Pendentes</option>
            </select>
            <input
              type="text"
              value={filterQ}
              onChange={e => setFilterQ(e.target.value)}
              placeholder="Buscar por nome..."
              className="text-xs border border-gray-200 rounded px-2 py-1 flex-1 min-w-[120px]"
            />
          </div>

          {selected.size > 0 && (
            <div className="flex items-center gap-2 bg-[#F7941D]/5 rounded-lg px-3 py-2">
              <span className="text-xs text-[#D97B10] flex-1">{selected.size} selecionado(s)</span>
              {viewMode === 'add' ? (
                <button onClick={() => void saveMembers('POST')} disabled={saving} className="text-xs bg-[#F7941D] text-white px-3 py-1 rounded disabled:opacity-50">
                  {saving ? 'Adicionando...' : `Adicionar ${selected.size} ao grupo`}
                </button>
              ) : (
                <button onClick={() => void saveMembers('DELETE')} disabled={saving} className="text-xs bg-red-500 text-white px-3 py-1 rounded disabled:opacity-50">
                  {saving ? 'Removendo...' : `Remover ${selected.size} do grupo`}
                </button>
              )}
              <button onClick={() => setSelected(new Set())} className="text-xs text-gray-400">x</button>
            </div>
          )}

          {loadingEntries ? (
            <p className="text-xs text-gray-400 text-center py-4">Carregando...</p>
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
                        onChange={() => setSelected(prev => selectAllOrNone(prev, entries.map(e => e.id)))}
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
                  {entries.map(entry => (
                    <tr
                      key={entry.id}
                      className={`hover:bg-gray-50 cursor-pointer ${selected.has(entry.id) ? 'bg-[#F7941D]/5' : ''}`}
                      onClick={() => setSelected(prev => toggleSelectedId(prev, entry.id))}
                    >
                      <td className="px-2 py-1.5">
                        <input
                          type="checkbox"
                          checked={selected.has(entry.id)}
                          onChange={() => setSelected(prev => toggleSelectedId(prev, entry.id))}
                          onClick={ev => ev.stopPropagation()}
                        />
                      </td>
                      <td className="px-2 py-1.5 text-gray-700">{entry.nome || 'Ã¢â‚¬â€'}</td>
                      <td className="px-2 py-1.5 text-gray-500 font-mono">{entry.email}</td>
                      <td className="px-2 py-1.5 text-gray-500">
                        <div>{communityName(entry.community_id)}</div>
                        <div className="font-mono text-[10px] text-gray-400">{entry.community_id}</div>
                      </td>
                      <td className="px-2 py-1.5 text-gray-400">{entry.perfil ?? 'Ã¢â‚¬â€'}</td>
                      <td className="px-2 py-1.5 text-center">{layersResolutionIcon(entry.layers_user_id)}</td>
                    </tr>
                  ))}
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
