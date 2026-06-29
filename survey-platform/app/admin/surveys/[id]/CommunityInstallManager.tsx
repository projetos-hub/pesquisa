'use client'

import { useTransition, useState, useRef, useCallback } from 'react'
import {
  installCommunity,
  toggleCommunityActive,
  updateCommunityStatus,
  removeCommunity,
} from './install-actions'
import { updateCommunityDates } from './communities/actions'
import { CommunityDisplay } from '@/lib/community-name'
import { resolveCommunityPrimaryName } from '@/lib/community-identity'

interface CommunityInstall {
  community_id: string
  status: string
  active: boolean
  nomeEscola?: string | null
  marca?: string | null
  unidade?: string | null
  open_date?: string | null
  close_date?: string | null
}

interface AvailableCommunity {
  community_id: string
  nomeEscola?: string | null
  marca?: string | null
  unidade?: string | null
}

const STATUS_OPTIONS = [
  { value: 'ativa',      label: 'Ativa' },
  { value: 'pausada',    label: 'Pausada' },
  { value: 'nao_aberta', label: 'Nao aberta' },
  { value: 'encerrada',  label: 'Encerrada' },
]

function communitySchedulingHint(openDate: string | null, status: string): string | null {
  if (!openDate) return null
  if (status !== 'nao_aberta' && status !== 'pausada') return null
  const now = new Date()
  const open = new Date(openDate)
  if (open <= now) return null
  const diffDays = Math.ceil((open.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
  if (diffDays === 0) return 'Abre hoje'
  if (diffDays === 1) return 'Abre amanha'
  return `Abre em ${diffDays} dias`
}

function communityLabel(community: AvailableCommunity) {
  return resolveCommunityPrimaryName({
    community_id: community.community_id,
    nome_escola: community.nomeEscola,
    marca: community.marca,
    unidade: community.unidade,
  })
}

export default function CommunityInstallManager({
  surveyId,
  installs,
  availableCommunities,
}: {
  surveyId: string
  installs: CommunityInstall[]
  availableCommunities: AvailableCommunity[]
}) {
  const [isPending, startTransition] = useTransition()
  const [formError, setFormError] = useState<string | null>(null)
  const [selectedCommunityId, setSelectedCommunityId] = useState('')
  const formRef = useRef<HTMLFormElement>(null)

  const [localDates, setLocalDates] = useState<
    Record<string, { open_date: string | null; close_date: string | null }>
  >(() =>
    Object.fromEntries(
      installs.map(i => [
        i.community_id,
        { open_date: i.open_date ?? null, close_date: i.close_date ?? null },
      ])
    )
  )

  const debounceTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({})

  const handleDateChange = useCallback(
    (communityId: string, field: 'open_date' | 'close_date', value: string | null) => {
      setLocalDates(prev => ({
        ...prev,
        [communityId]: { ...prev[communityId], [field]: value || null },
      }))

      if (debounceTimers.current[communityId]) {
        clearTimeout(debounceTimers.current[communityId])
      }
      debounceTimers.current[communityId] = setTimeout(() => {
        setLocalDates(current => {
          const dates = current[communityId]
          startTransition(async () => {
            await updateCommunityDates(
              surveyId,
              communityId,
              dates?.open_date ?? null,
              dates?.close_date ?? null,
            )
          })
          return current
        })
      }, 800)
    },
    [surveyId, startTransition]
  )

  function handleInstall(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setFormError(null)
    const fd = new FormData(e.currentTarget)
    startTransition(async () => {
      const result = await installCommunity(surveyId, fd)
      if (result?.error) {
        setFormError(result.error)
      } else {
        setSelectedCommunityId('')
        formRef.current?.reset()
      }
    })
  }

  return (
    <div className="space-y-3">
      {installs.length > 0 ? (
        <div>
          {installs.map(inst => {
            const displayName = resolveCommunityPrimaryName({
              community_id: inst.community_id,
              nome_escola: inst.nomeEscola,
              marca: inst.marca,
              unidade: inst.unidade,
            })
            return (
              <div key={inst.community_id} className="py-2.5 border-b border-gray-100 last:border-0">
                <div className="flex items-center gap-3">
                  <CommunityDisplay
                    communityId={inst.community_id}
                    nomeEscola={inst.nomeEscola}
                    marca={inst.marca}
                    unidade={inst.unidade}
                    className="flex-1 min-w-0"
                  />

                  <select
                    defaultValue={inst.status}
                    disabled={isPending}
                    onChange={e => startTransition(async () => {
                      await updateCommunityStatus(surveyId, inst.community_id, e.target.value)
                    })}
                    className="border border-gray-200 rounded-lg text-xs px-2 py-1 focus:outline-none focus:ring-1 focus:ring-[#F7941D] disabled:opacity-50"
                  >
                    {STATUS_OPTIONS.map(o => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>

                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => startTransition(async () => {
                      await toggleCommunityActive(surveyId, inst.community_id, !inst.active)
                    })}
                    className={`text-xs px-2.5 py-1 rounded-full font-medium transition-colors disabled:opacity-50 ${
                      inst.active
                        ? 'bg-green-100 text-green-700 hover:bg-red-50 hover:text-red-600'
                        : 'bg-gray-100 text-gray-500 hover:bg-green-100 hover:text-green-700'
                    }`}
                  >
                    {inst.active ? 'Ativo' : 'Inativo'}
                  </button>

                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => {
                      if (!confirm(`Remover "${displayName}" desta pesquisa?`)) return
                      startTransition(async () => {
                        await removeCommunity(surveyId, inst.community_id)
                      })
                    }}
                    className="text-gray-300 hover:text-red-500 transition-colors text-sm disabled:opacity-50 px-1"
                    title="Remover"
                  >
                    x
                  </button>
                </div>

                <div className="flex items-center gap-4 mt-1.5 pl-0">
                  <span className="text-xs text-gray-400 w-16 shrink-0">Periodo</span>
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-gray-400">De</span>
                    <input
                      type="datetime-local"
                      value={localDates[inst.community_id]?.open_date?.slice(0, 16) ?? ''}
                      disabled={isPending}
                      onChange={e =>
                        handleDateChange(inst.community_id, 'open_date', e.target.value || null)
                      }
                      className="border border-gray-200 bg-gray-50 rounded-[4.8px] px-2 py-0.5 text-xs text-gray-600 focus:outline-none focus:ring-1 focus:ring-[#F7941D] focus:bg-white disabled:opacity-50"
                    />
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-gray-400">ate</span>
                    <input
                      type="datetime-local"
                      value={localDates[inst.community_id]?.close_date?.slice(0, 16) ?? ''}
                      disabled={isPending}
                      onChange={e =>
                        handleDateChange(inst.community_id, 'close_date', e.target.value || null)
                      }
                      className="border border-gray-200 bg-gray-50 rounded-[4.8px] px-2 py-0.5 text-xs text-gray-600 focus:outline-none focus:ring-1 focus:ring-[#F7941D] focus:bg-white disabled:opacity-50"
                    />
                  </div>
                  {communitySchedulingHint(
                    localDates[inst.community_id]?.open_date ?? null,
                    inst.status
                  ) && (
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-50 text-blue-600">
                      {communitySchedulingHint(
                        localDates[inst.community_id]?.open_date ?? null,
                        inst.status
                      )}
                    </span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <p className="text-sm text-gray-400 py-2">Nenhuma comunidade instalada.</p>
      )}

      <form
        ref={formRef}
        onSubmit={handleInstall}
        className="flex flex-wrap gap-2 pt-3 border-t border-gray-100"
      >
        {formError && (
          <p className="w-full text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-1.5">
            {formError}
          </p>
        )}
        <div className="flex-1 min-w-[220px]">
          <input
            name="communityId"
            list="community-list"
            placeholder="Buscar por marca, unidade ou ID"
            required
            disabled={isPending}
            value={selectedCommunityId}
            onChange={event => setSelectedCommunityId(event.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#F7941D] disabled:opacity-50"
          />
          <datalist id="community-list">
            {availableCommunities.map(c => (
              <option key={c.community_id} value={c.community_id} label={communityLabel(c)} />
            ))}
          </datalist>
          <p className="mt-1 text-[11px] text-gray-400">
            Escolha pelo nome da marca/unidade. O ID tecnico sera preenchido automaticamente.
          </p>
        </div>
        <select
          name="status"
          defaultValue="ativa"
          disabled={isPending}
          className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#F7941D] disabled:opacity-50"
        >
          {STATUS_OPTIONS.map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        <button
          type="submit"
          disabled={isPending}
          className="bg-[#F7941D] text-white text-sm px-4 py-1.5 rounded-lg hover:bg-[#D97B10] disabled:opacity-50 transition-colors font-medium"
        >
          {isPending ? 'Salvando...' : 'Instalar'}
        </button>
      </form>
    </div>
  )
}
