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

interface CommunityInstall {
  community_id: string
  status: string
  active: boolean
  nomeEscola?: string | null
  open_date?: string | null
  close_date?: string | null
}

const KNOWN_COMMUNITIES = [
  'americano', 'yf24y2k7', 'fwnash24', 'apogeu-santoantonio-i', 'apogeu-santoantonio-ii',
  'wmfkn49h', 'ns8z5w8m', 'yxak8s0k', 'k4ys44r2', 'leonardodavinci-alfa', 'leonardodavinci-beta',
  'leonardodavinci-gama', 'n6k47n81', 'w9593n19', 'rf3zk695', 'w95k0s77', 'globaltree-abm',
  'matriz-bangu', 'matriz-campogrande', 'matriz-caxias', 'matriz-madureira', 'matriz-novaiguacu',
  'matriz-rochamiranda', 'matriz-retirodosartistas', 'matriz-saojoaodemeriti', 'matriz-taquara',
  'matriz-tijuca', 'qi-freguesia', 'qi-metropolitano', 'qi-recreio', 'qi-rio2', 'qi-tijuca',
  'az51800x', 'w213sfza', 'xa7y5zam', 'sap', 'sarahdawsey-juizdefora', 'y9490m37',
  'uniao', 'unificado-zonasul', 'raizeducacao',
]

const STATUS_OPTIONS = [
  { value: 'ativa',      label: 'Ativa' },
  { value: 'pausada',    label: 'Pausada' },
  { value: 'nao_aberta', label: 'Não aberta' },
  { value: 'encerrada',  label: 'Encerrada' },
]

function statusBadge(status: string) {
  const map: Record<string, string> = {
    ativa:      'bg-green-100 text-green-700',
    pausada:    'bg-yellow-100 text-yellow-700',
    encerrada:  'bg-red-100 text-red-700',
    nao_aberta: 'bg-gray-100 text-gray-500',
  }
  return map[status] ?? 'bg-gray-100 text-gray-500'
}

export default function CommunityInstallManager({
  surveyId,
  installs,
}: {
  surveyId: string
  installs: CommunityInstall[]
}) {
  const [isPending, startTransition] = useTransition()
  const [formError, setFormError] = useState<string | null>(null)
  const formRef = useRef<HTMLFormElement>(null)

  // Estado local das datas (community_id → { open_date, close_date })
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

  // Debounce ref por comunidade
  const debounceTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({})

  const handleDateChange = useCallback(
    (communityId: string, field: 'open_date' | 'close_date', value: string | null) => {
      // Atualiza estado local imediatamente (UI responsiva)
      setLocalDates(prev => ({
        ...prev,
        [communityId]: { ...prev[communityId], [field]: value || null },
      }))

      // Debounce de 800ms antes de salvar
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
        formRef.current?.reset()
      }
    })
  }

  return (
    <div className="space-y-3">
      {/* Lista de comunidades instaladas */}
      {installs.length > 0 ? (
        <div>
          {installs.map(inst => (
            <div key={inst.community_id} className="py-2.5 border-b border-gray-100 last:border-0">
              {/* Linha principal: nome, status, ativo, remover */}
              <div className="flex items-center gap-3">
                <CommunityDisplay
                  communityId={inst.community_id}
                  nomeEscola={inst.nomeEscola}
                  className="flex-1 min-w-0"
                />

                {/* Status */}
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

                {/* Ativo/Inativo toggle */}
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

                {/* Remover */}
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => {
                    if (!confirm(`Remover "${inst.community_id}" desta pesquisa?`)) return
                    startTransition(async () => {
                      await removeCommunity(surveyId, inst.community_id)
                    })
                  }}
                  className="text-gray-300 hover:text-red-500 transition-colors text-sm disabled:opacity-50 px-1"
                  title="Remover"
                >
                  ✕
                </button>
              </div>

              {/* Linha de datas — compacta, abaixo do status */}
              <div className="flex items-center gap-3 mt-2">
                <div className="flex items-center gap-1.5">
                  <label className="text-xs text-gray-400 whitespace-nowrap">Abertura</label>
                  <input
                    type="datetime-local"
                    value={localDates[inst.community_id]?.open_date?.slice(0, 16) ?? ''}
                    disabled={isPending}
                    onChange={e =>
                      handleDateChange(inst.community_id, 'open_date', e.target.value || null)
                    }
                    className="border border-gray-200 rounded-[4.8px] px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-[#F7941D] disabled:opacity-50 w-[168px]"
                  />
                </div>
                <div className="flex items-center gap-1.5">
                  <label className="text-xs text-gray-400 whitespace-nowrap">Encerramento</label>
                  <input
                    type="datetime-local"
                    value={localDates[inst.community_id]?.close_date?.slice(0, 16) ?? ''}
                    disabled={isPending}
                    onChange={e =>
                      handleDateChange(inst.community_id, 'close_date', e.target.value || null)
                    }
                    className="border border-gray-200 rounded-[4.8px] px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-[#F7941D] disabled:opacity-50 w-[168px]"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-gray-400 py-2">Nenhuma comunidade instalada.</p>
      )}

      {/* Formulário para adicionar */}
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
        <div className="flex-1 min-w-[160px]">
          <input
            name="communityId"
            list="community-list"
            placeholder="ID da comunidade"
            required
            disabled={isPending}
            className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#F7941D] disabled:opacity-50"
          />
          <datalist id="community-list">
            {KNOWN_COMMUNITIES.map(c => <option key={c} value={c} />)}
          </datalist>
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
