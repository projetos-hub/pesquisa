'use client'

import { useState } from 'react'
import { saveCommunityTheme } from './actions'
import type { Community } from './page'

interface Props {
  communities: Community[]
}

export default function CommunitiesThemeEditor({ communities }: Props) {
  const [expandedId, setExpandedId] = useState<string | null>(null)

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <table className="w-full">
        <thead>
          <tr className="border-b border-gray-200 bg-gray-50">
            <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3 w-16">Logo</th>
            <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">ID Comunidade</th>
            <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">Nome</th>
            <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">Cores</th>
            <th className="text-right text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3 w-24">Ação</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {communities.map(community => {
            const isExpanded = expandedId === community.community_id

            return (
              <tr key={community.community_id} className={isExpanded ? 'bg-blue-50' : 'hover:bg-gray-50'}>
                {!isExpanded ? (
                  <>
                    <td className="px-4 py-3">
                      <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center overflow-hidden border border-gray-200">
                        {community.logo ? (
                          <img src={community.logo} alt="Logo" className="w-full h-full object-contain" />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-gray-300 to-gray-400" />
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm font-mono text-gray-900">{community.community_id}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm text-gray-600">{community.nome_escola || '—'}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {community.primary_color && (
                          <div className="w-6 h-6 rounded-full border border-gray-300" style={{ backgroundColor: community.primary_color }} title={community.primary_color} />
                        )}
                        {community.secondary_color && (
                          <div className="w-6 h-6 rounded-full border border-gray-300" style={{ backgroundColor: community.secondary_color }} title={community.secondary_color} />
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => setExpandedId(community.community_id)} className="text-sm text-[#F7941D] hover:text-[#D97B10] font-medium">
                        Editar
                      </button>
                    </td>
                  </>
                ) : (
                  <td colSpan={5} className="px-4 py-4">
                    <ThemeEditForm community={community} onClose={() => setExpandedId(null)} />
                  </td>
                )}
              </tr>
            )
          })}

          {communities.length === 0 && (
            <tr>
              <td colSpan={5} className="px-4 py-10 text-center text-gray-400">
                Nenhuma comunidade disponível.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}

function ThemeEditForm({ community, onClose }: { community: Community; onClose: () => void }) {
  const [primaryColor, setPrimaryColor] = useState(community.primary_color || '#667eea')
  const [secondaryColor, setSecondaryColor] = useState(community.secondary_color || '#764ba2')
  const [isPending, setIsPending] = useState(false)
  const [error, setError] = useState<string | undefined>()
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsPending(true)
    setError(undefined)
    setSuccess(false)

    const formData = new FormData(e.currentTarget)
    const result = await saveCommunityTheme(community.community_id, {
      nomeEscola:     formData.get('nomeEscola')     as string || undefined,
      primaryColor:   formData.get('primaryColor')   as string || undefined,
      secondaryColor: formData.get('secondaryColor') as string || undefined,
      logo:           formData.get('logo')           as string || undefined,
    })

    setIsPending(false)
    if (result.error) {
      setError(result.error)
    } else {
      setSuccess(true)
      setTimeout(onClose, 1000)
    }
  }

  return (
    <div className="grid grid-cols-2 gap-6">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1.5">Nome da Escola</label>
          <input type="text" name="nomeEscola" defaultValue={community.nome_escola} placeholder="Ex: Escola Raiz"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#F7941D]" />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1.5">Cor Primária</label>
          <div className="flex gap-2">
            <input type="color" name="primaryColor" value={primaryColor} onChange={e => setPrimaryColor(e.target.value)}
              className="w-12 h-10 rounded-lg border border-gray-300 cursor-pointer" />
            <input type="text" value={primaryColor} onChange={e => setPrimaryColor(e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#F7941D]" placeholder="#667eea" />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1.5">Cor Secundária</label>
          <div className="flex gap-2">
            <input type="color" name="secondaryColor" value={secondaryColor} onChange={e => setSecondaryColor(e.target.value)}
              className="w-12 h-10 rounded-lg border border-gray-300 cursor-pointer" />
            <input type="text" value={secondaryColor} onChange={e => setSecondaryColor(e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#F7941D]" placeholder="#764ba2" />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1.5">URL do Logo</label>
          <input type="url" name="logo" defaultValue={community.logo} placeholder="https://..."
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#F7941D]" />
        </div>

        {error   && <div className="text-sm text-red-600 bg-red-50 p-2 rounded">{error}</div>}
        {success && <div className="text-sm text-green-600 bg-green-50 p-2 rounded">✓ Salvo com sucesso!</div>}

        <div className="flex gap-2 pt-2">
          <button type="submit" disabled={isPending}
            className="flex-1 px-4 py-2 bg-[#F7941D] text-white rounded-lg text-sm font-medium hover:bg-[#D97B10] disabled:bg-gray-400">
            {isPending ? 'Salvando...' : 'Salvar'}
          </button>
          <button type="button" onClick={onClose}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50">
            Cancelar
          </button>
        </div>
      </form>

      <div className="flex flex-col gap-4">
        <div className="text-xs font-medium text-gray-600 mb-2">PREVIEW</div>
        <div className="rounded-xl p-6 text-white flex flex-col items-center justify-center h-40"
          style={{ background: `linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 100%)` }}>
          {community.logo ? (
            <img src={community.logo} alt="Logo preview" className="w-16 h-16 object-contain mb-4" />
          ) : (
            <div className="w-16 h-16 bg-white/20 rounded-lg mb-4" />
          )}
          <div className="text-center">
            <div className="font-semibold">{community.nome_escola || 'Nome da Escola'}</div>
            <div className="text-xs opacity-75">{community.community_id}</div>
          </div>
        </div>
      </div>
    </div>
  )
}
