import { useMemo, type Dispatch, type SetStateAction } from 'react'
import { resolveCommunityPrimaryName } from '@/lib/community-identity'

import {
  KNOWN_COMMUNITIES,
  type Community,
  type DispatchPreview,
  type DispatchScope,
  type SampleCommunity,
  type SampleGroupOption,
} from './dispatch-form-utils'

interface TargetingSectionProps {
  surveyId:               string
  sampleCount:            number
  communities:            Community[]
  scope:                  DispatchScope
  setScope:               Dispatch<SetStateAction<DispatchScope>>
  selectedComms:          string[]
  setSelectedComms:       Dispatch<SetStateAction<string[]>>
  groupAlias:             string
  setGroupAlias:          Dispatch<SetStateAction<string>>
  groupComm:              string
  setGroupComm:           Dispatch<SetStateAction<string>>
  sampleComms:            SampleCommunity[]
  selectedSampleComms:    string[]
  setSelectedSampleComms: Dispatch<SetStateAction<string[]>>
  sampleGroups:           SampleGroupOption[]
  selectedSampleGroup:    string
  setSelectedSampleGroup: Dispatch<SetStateAction<string>>
  roles:                  string[]
  toggleRole:             (role: string) => void
  personalized:           boolean
  setPersonalized:        Dispatch<SetStateAction<boolean>>
  preview:                DispatchPreview | null
  setPreview:             Dispatch<SetStateAction<DispatchPreview | null>>
  fetchPreview:           () => void
}

export function TargetingSection({
  surveyId,
  sampleCount,
  communities,
  scope,
  setScope,
  selectedComms,
  setSelectedComms,
  groupAlias,
  setGroupAlias,
  groupComm,
  setGroupComm,
  sampleComms,
  selectedSampleComms,
  setSelectedSampleComms,
  sampleGroups,
  selectedSampleGroup,
  setSelectedSampleGroup,
  roles,
  toggleRole,
  personalized,
  setPersonalized,
  preview,
  setPreview,
  fetchPreview,
}: TargetingSectionProps) {
  const communityById = useMemo(() => new Map(communities.map(community => [community.id, community])), [communities])
  const communityName = (communityId: string) => {
    const community = communityById.get(communityId)
    return resolveCommunityPrimaryName({
      community_id: communityId,
      nome_escola: community?.nome,
      marca: community?.marca,
      unidade: community?.unidade,
    })
  }

  return (
    <section className="bg-gray-50 rounded-xl border border-gray-200 p-4 space-y-3">
      <h3 className="text-sm font-semibold text-gray-700">1. Quem recebe</h3>

      <div className="flex gap-3 flex-wrap">
        {([
          ['all', 'Todas as comunidades'],
          ['communities', 'Comunidades específicas'],
          ['group', 'Uma turma'],
          ['sample', 'Amostra'],
        ] as const).map(([value, label]) => (
          <label key={value} className="flex items-center gap-1.5 text-sm text-gray-700 cursor-pointer">
            <input
              type="radio"
              name="scope"
              value={value}
              checked={scope === value}
              onChange={() => {
                setScope(value)
                setPreview(null)
                if (value !== 'group') setPersonalized(true)
              }}
              className="text-[#F7941D]"
            />
            {label}
          </label>
        ))}
      </div>

      {scope === 'sample' && (
        <div className="space-y-2">
          <div className="text-xs bg-[#F7941D]/5 border border-[#F7941D]/10 text-[#D97B10] rounded-lg px-3 py-2">
            {sampleCount > 0
              ? `${sampleCount} email(s) resolvido(s) na amostra desta pesquisa.`
              : <>
                  Nenhum email resolvido na amostra.{' '}
                  <a href={`/admin/surveys/${surveyId}/sample`} className="underline font-medium">
                    Ir para Amostra
                  </a>
                </>
            }
          </div>

          {sampleComms.length > 1 && (
            <div className="border border-gray-200 rounded-lg p-3 space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium text-gray-700">Filtrar por comunidade</p>
                <button
                  type="button"
                  onClick={() => setSelectedSampleComms([])}
                  className="text-xs text-gray-400 hover:text-gray-600"
                >
                  {selectedSampleComms.length > 0 ? 'Limpar' : 'Todas'}
                </button>
              </div>
              <div className="space-y-1.5 max-h-40 overflow-y-auto">
                {sampleComms.map(community => (
                  <label key={community.community_id} className="flex items-center gap-2 text-xs text-gray-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedSampleComms.length === 0 || selectedSampleComms.includes(community.community_id)}
                      onChange={() => {
                        setSelectedSampleComms(prev => {
                          const allSelected = prev.length === 0
                          if (allSelected) return sampleComms.map(item => item.community_id).filter(id => id !== community.community_id)
                          return prev.includes(community.community_id)
                            ? prev.filter(id => id !== community.community_id)
                            : [...prev, community.community_id]
                        })
                      }}
                      className="text-[#F7941D]"
                    />
                    <span className="flex-1">{resolveCommunityPrimaryName({ community_id: community.community_id, nome_escola: community.nome, marca: community.marca, unidade: community.unidade })}</span>
                    <span className="text-gray-400">{community.resolved} resolvidos</span>
                  </label>
                ))}
              </div>
              {selectedSampleComms.length > 0 && selectedSampleComms.length < sampleComms.length && (
                <p className="text-xs text-amber-600">
                  Enviando para {selectedSampleComms.length} de {sampleComms.length} comunidade(s)
                </p>
              )}
            </div>
          )}

          {sampleGroups.length > 0 && (
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Grupo de destinatários <span className="text-gray-400">(opcional - vazio = toda a amostra)</span>
              </label>
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => setSelectedSampleGroup('')}
                  className={`text-xs px-3 py-1 rounded-full border transition-colors ${
                    selectedSampleGroup === ''
                      ? 'bg-[#F7941D] text-white border-[#F7941D]'
                      : 'bg-white text-gray-600 border-gray-300 hover:border-[#F7941D]/50'
                  }`}
                >
                  Toda a amostra ({sampleCount})
                </button>
                {sampleGroups.map(group => (
                  <button
                    key={group.id}
                    type="button"
                    onClick={() => setSelectedSampleGroup(group.id === selectedSampleGroup ? '' : group.id)}
                    className={`text-xs px-3 py-1 rounded-full border transition-colors flex items-center gap-1.5 ${
                      selectedSampleGroup === group.id
                        ? 'text-white border-transparent'
                        : 'bg-white text-gray-600 border-gray-300 hover:border-gray-400'
                    }`}
                    style={selectedSampleGroup === group.id ? { background: group.color, borderColor: group.color } : {}}
                  >
                    <span className="w-2 h-2 rounded-full" style={{ background: group.color }} />
                    {group.name} ({group.member_count})
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {scope === 'communities' && (
        <div className="space-y-1.5">
          <label className="text-xs text-gray-500">Comunidades selecionadas</label>
          <div className="flex gap-2 flex-wrap">
            {selectedComms.map(communityId => (
              <span key={communityId} className="inline-flex items-center gap-1 bg-[#F7941D]/10 text-[#D97B10] text-xs rounded-full px-2.5 py-0.5">
                <span>{communityName(communityId)}</span>
                <span className="font-mono text-[10px] opacity-60">{communityId}</span>
                <button type="button" onClick={() => setSelectedComms(current => current.filter(id => id !== communityId))} className="hover:text-red-500">x</button>
              </span>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              list="comm-list-specific"
              placeholder="Buscar por marca, unidade ou ID"
              className="flex-1 border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#F7941D]"
              onKeyDown={event => {
                if (event.key === 'Enter') {
                  event.preventDefault()
                  const value = (event.target as HTMLInputElement).value.trim()
                  if (value && !selectedComms.includes(value)) {
                    setSelectedComms(current => [...current, value])
                    setPreview(null)
                  }
                  ;(event.target as HTMLInputElement).value = ''
                }
              }}
            />
            <datalist id="comm-list-specific">
              {[...new Set([...communities.map(community => community.id), ...KNOWN_COMMUNITIES])].map(communityId =>
                <option key={communityId} value={communityId} label={communityName(communityId)} />
              )}
            </datalist>
          </div>
          <p className="text-xs text-gray-400">Pressione Enter para adicionar.</p>
        </div>
      )}

      {scope === 'group' && (
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Comunidade</label>
            <select
              value={groupComm}
              onChange={event => { setGroupComm(event.target.value); setPreview(null) }}
              className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#F7941D]"
            >
              {communities.map(community => <option key={community.id} value={community.id}>{communityName(community.id)}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Alias da turma</label>
            <input
              value={groupAlias}
              onChange={event => setGroupAlias(event.target.value)}
              placeholder="ex: turma-3a"
              className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#F7941D]"
            />
          </div>
        </div>
      )}

      <div>
        <label className="text-xs text-gray-500 mb-1.5 block">Perfil dos destinatários</label>
        <div className="flex gap-4">
          {[['guardian', 'Responsáveis'], ['student', 'Alunos'], ['admin', 'Admins']].map(([value, label]) => (
            <label key={value} className="flex items-center gap-1.5 text-sm text-gray-700 cursor-pointer">
              <input type="checkbox" checked={roles.includes(value)} onChange={() => toggleRole(value)} className="rounded border-gray-300 text-[#F7941D]" />
              {label}
            </label>
          ))}
        </div>
      </div>

      <button
        type="button"
        onClick={fetchPreview}
        className="text-xs text-[#F7941D] hover:text-[#D97B10] underline"
      >
        Estimar alcance
      </button>
      {preview && (
        <p className="text-xs text-gray-600 bg-[#F7941D]/5 rounded-lg px-3 py-2">
          {preview.community_count} comunidade(s) serão notificadas
          {personalized && preview.personalized_estimate_min > 0
            ? ` - estimativa personalizado: ~${preview.personalized_estimate_min} min`
            : ''}
        </p>
      )}
    </section>
  )
}

