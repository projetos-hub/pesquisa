'use client'

import { useState } from 'react'
import { saveCommunityTheme } from './actions'

interface Community {
  id: string
  community_id: string
  logoUrl: string
  theme?: {
    nomeEscola?: string
    primaryColor?: string
    secondaryColor?: string
    logo?: string
  }
}

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
            const isExpanded = expandedId === community.id
            const hasTheme = community.theme && Object.keys(community.theme).length > 0

            return (
              <tr key={community.id} className={isExpanded ? 'bg-blue-50' : 'hover:bg-gray-50'}>
                {!isExpanded ? (
                  <>
                    {/* Logo preview */}
                    <td className="px-4 py-3">
                      <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center overflow-hidden border border-gray-200">
                        {community.theme?.logo ? (
                          <img
                            src={community.theme.logo}
                            alt="Logo"
                            className="w-full h-full object-contain"
                            onError={e => {
                              (e.target as HTMLImageElement).src = ''
                            }}
                          />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-gray-300 to-gray-400" />
                        )}
                      </div>
                    </td>

                    {/* Community ID */}
                    <td className="px-4 py-3">
                      <div className="text-sm font-mono text-gray-900">{community.community_id}</div>
                    </td>

                    {/* Nome escola */}
                    <td className="px-4 py-3">
                      <div className="text-sm text-gray-600">
                        {community.theme?.nomeEscola || '—'}
                      </div>
                    </td>

                    {/* Color preview */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {community.theme?.primaryColor && (
                          <div
                            className="w-6 h-6 rounded-full border border-gray-300"
                            style={{ backgroundColor: community.theme.primaryColor }}
                            title={community.theme.primaryColor}
                          />
                        )}
                        {community.theme?.secondaryColor && (
                          <div
                            className="w-6 h-6 rounded-full border border-gray-300"
                            style={{ backgroundColor: community.theme.secondaryColor }}
                            title={community.theme.secondaryColor}
                          />
                        )}
                        {!community.theme?.primaryColor && !community.theme?.secondaryColor && (
                          <span className="text-xs text-gray-400">—</span>
                        )}
                      </div>
                    </td>

                    {/* Edit button */}
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => setExpandedId(community.id)}
                        className="text-sm text-indigo-600 hover:text-indigo-800 font-medium"
                      >
                        Editar
                      </button>
                    </td>
                  </>
                ) : (
                  <td colSpan={5} className="px-4 py-4">
                    <ThemeEditForm
                      community={community}
                      onClose={() => setExpandedId(null)}
                    />
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

interface FormProps {
  community: Community
  onClose: () => void
}

function ThemeEditForm({ community, onClose }: FormProps) {
  const [primaryColor, setPrimaryColor] = useState(community.theme?.primaryColor || '#000000')
  const [secondaryColor, setSecondaryColor] = useState(community.theme?.secondaryColor || '#ffffff')
  const [isPending, setIsPending] = useState(false)
  const [error, setError] = useState<string | undefined>()
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsPending(true)
    setError(undefined)
    setSuccess(false)

    const formData = new FormData(e.currentTarget)
    const result = await saveCommunityTheme(
      community.community_id,
      {
        nomeEscola: formData.get('nomeEscola') as string || undefined,
        primaryColor: formData.get('primaryColor') as string || undefined,
        secondaryColor: formData.get('secondaryColor') as string || undefined,
        logo: formData.get('logo') as string || undefined,
      }
    )

    setIsPending(false)

    if (result.error) {
      setError(result.error)
    } else {
      setSuccess(true)
      setTimeout(onClose, 1000)
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-6">
        {/* Formulário */}
        <div className="space-y-4">
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Nome Escola */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">Nome da Escola</label>
              <input
                type="text"
                name="nomeEscola"
                defaultValue={community.theme?.nomeEscola || ''}
                placeholder="Ex: Escola Raiz"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {/* Cor Primária */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">Cor Primária</label>
              <div className="flex gap-2">
                <input
                  type="color"
                  name="primaryColor"
                  value={primaryColor}
                  onChange={e => setPrimaryColor(e.target.value)}
                  className="w-12 h-10 rounded-lg border border-gray-300 cursor-pointer"
                />
                <input
                  type="text"
                  value={primaryColor}
                  onChange={e => setPrimaryColor(e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="#000000"
                />
              </div>
            </div>

            {/* Cor Secundária */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">Cor Secundária</label>
              <div className="flex gap-2">
                <input
                  type="color"
                  name="secondaryColor"
                  value={secondaryColor}
                  onChange={e => setSecondaryColor(e.target.value)}
                  className="w-12 h-10 rounded-lg border border-gray-300 cursor-pointer"
                />
                <input
                  type="text"
                  value={secondaryColor}
                  onChange={e => setSecondaryColor(e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="#ffffff"
                />
              </div>
            </div>

            {/* URL do Logo */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">URL do Logo</label>
              <input
                type="url"
                name="logo"
                defaultValue={community.theme?.logo || ''}
                placeholder="https://..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {/* Erro ou Sucesso */}
            {error && <div className="text-sm text-red-600 bg-red-50 p-2 rounded">{error}</div>}
            {success && <div className="text-sm text-green-600 bg-green-50 p-2 rounded">✓ Salvo com sucesso!</div>}

            {/* Botões */}
            <div className="flex gap-2 pt-2">
              <button
                type="submit"
                disabled={isPending}
                className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:bg-gray-400"
              >
                {isPending ? 'Salvando...' : 'Salvar'}
              </button>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50"
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>

        {/* Preview */}
        <div className="flex flex-col gap-4">
          <div className="text-xs font-medium text-gray-600 mb-2">PREVIEW</div>
          <div
            className="rounded-xl p-6 text-white flex flex-col items-center justify-center h-40"
            style={{
              background: `linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 100%)`,
            }}
          >
            {community.theme?.logo ? (
              <img
                src={community.theme.logo}
                alt="Logo preview"
                className="w-16 h-16 object-contain mb-4"
              />
            ) : (
              <div className="w-16 h-16 bg-white/20 rounded-lg mb-4" />
            )}
            <div className="text-center">
              <div className="font-semibold">{community.theme?.nomeEscola || 'Nome da Escola'}</div>
              <div className="text-xs opacity-75">{community.community_id}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
