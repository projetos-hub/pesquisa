'use client'

import { useState } from 'react'
import { saveCommunityTheme, updateCommunityDates } from './actions'

interface Community {
  id: string
  community_id: string
  logoUrl: string
  open_date?: string | null
  close_date?: string | null
  status?: string | null
  theme?: {
    nomeEscola?: string
    primaryColor?: string
    secondaryColor?: string
    logo?: string
  }
}

interface Props {
  surveyId: string
  communities: Community[]
}

export default function CommunitiesThemeEditor({ surveyId, communities }: Props) {
  const [expandedId, setExpandedId] = useState<string | null>(null)

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <table className="w-full">
        <thead>
          <tr className="border-b border-gray-200 bg-gray-50">
            <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3 w-16">Logo</th>
            <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">Comunidade</th>
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
                        className="text-sm text-[#F7941D] hover:text-[#D97B10] font-medium"
                      >
                        Editar
                      </button>
                    </td>
                  </>
                ) : (
                  <td colSpan={5} className="px-4 py-4">
                    <ThemeEditForm
                      surveyId={surveyId}
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
                Nenhuma comunidade nesta pesquisa.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}

interface FormProps {
  surveyId: string
  community: Community
  onClose: () => void
}

function ThemeEditForm({ surveyId, community, onClose }: FormProps) {
  const [primaryColor, setPrimaryColor] = useState(community.theme?.primaryColor || '#000000')
  const [secondaryColor, setSecondaryColor] = useState(community.theme?.secondaryColor || '#ffffff')
  const [isPending, setIsPending] = useState(false)
  const [error, setError] = useState<string | undefined>()

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsPending(true)
    setError(undefined)

    const formData = new FormData(e.currentTarget)
    const result = await saveCommunityTheme(
      surveyId,
      community.community_id,
      {
        nomeEscola: formData.get('nomeEscola') as string || undefined,
        primaryColor: formData.get('primaryColor') as string || undefined,
        secondaryColor: formData.get('secondaryColor') as string || undefined,
        logo: formData.get('logo') as string || undefined,
        indicacaoLink: (formData.get('indicacaoLink') as string) ?? undefined,
      }
    )

    if (result.error) {
      setIsPending(false)
      setError(result.error)
      return
    }

    // Salva datas de abertura/encerramento
    const openDate  = (formData.get('open_date')  as string) || null
    const closeDate = (formData.get('close_date') as string) || null
    const datesResult = await updateCommunityDates(
      surveyId,
      community.community_id,
      openDate,
      closeDate,
    )

    setIsPending(false)

    if (datesResult.error) {
      setError(datesResult.error)
    } else {
      onClose()
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
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#F7941D]"
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
                  className="w-12 h-10 rounded border border-gray-300 cursor-pointer"
                />
                <input
                  type="text"
                  value={primaryColor}
                  onChange={e => setPrimaryColor(e.target.value)}
                  placeholder="#000000"
                  pattern="^#[0-9A-Fa-f]{6}$"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#F7941D] font-mono"
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
                  className="w-12 h-10 rounded border border-gray-300 cursor-pointer"
                />
                <input
                  type="text"
                  value={secondaryColor}
                  onChange={e => setSecondaryColor(e.target.value)}
                  placeholder="#ffffff"
                  pattern="^#[0-9A-Fa-f]{6}$"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#F7941D] font-mono"
                />
              </div>
            </div>

            {/* URL da Logo */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">URL da Logo</label>
              <input
                type="url"
                name="logo"
                defaultValue={community.theme?.logo || community.logoUrl}
                placeholder={community.logoUrl}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#F7941D] font-mono text-xs"
              />
              <p className="text-xs text-gray-500 mt-1">
                Default: {community.logoUrl}
              </p>
            </div>

            {/* Link de indicação (quem confia) */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">Link de indicação</label>
              <input
                type="url"
                name="indicacaoLink"
                defaultValue={(community.theme as { indicacaoLink?: string } | undefined)?.indicacaoLink || ''}
                placeholder="https://quemconfia.com.br/escola"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#F7941D] font-mono text-xs"
              />
              <p className="text-xs text-gray-500 mt-1">Exibido no ThankYou para promotores (NPS 9-10)</p>
            </div>

            {/* Datas de abertura e encerramento */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">
                Datas desta comunidade
              </label>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Abertura</label>
                  <input
                    type="datetime-local"
                    name="open_date"
                    defaultValue={
                      community.open_date
                        ? community.open_date.slice(0, 16)
                        : ''
                    }
                    className="w-full border border-gray-300 rounded-[4.8px] px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-[#F7941D] focus:border-[#F7941D]"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Encerramento</label>
                  <input
                    type="datetime-local"
                    name="close_date"
                    defaultValue={
                      community.close_date
                        ? community.close_date.slice(0, 16)
                        : ''
                    }
                    className="w-full border border-gray-300 rounded-[4.8px] px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-[#F7941D] focus:border-[#F7941D]"
                  />
                </div>
              </div>
              <p className="text-xs text-gray-400 mt-1">
                {community.status === 'encerrada'
                  ? 'Encerrada'
                  : community.status === 'nao_aberta'
                  ? 'Ainda nao aberta'
                  : community.status === 'ativa'
                  ? 'Ativa'
                  : 'Deixe em branco para usar as datas globais da pesquisa.'}
              </p>
            </div>

            {/* Error */}
            {error && (
              <div className="p-2.5 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
                {error}
              </div>
            )}

            {/* Buttons */}
            <div className="flex gap-2 pt-2">
              <button
                type="submit"
                disabled={isPending}
                className="flex-1 px-3 py-2 bg-[#F7941D] text-white rounded-lg text-sm font-medium hover:bg-[#D97B10] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isPending ? 'Salvando...' : 'Salvar'}
              </button>
              <button
                type="button"
                onClick={onClose}
                disabled={isPending}
                className="flex-1 px-3 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>

        {/* Preview */}
        <div className="flex flex-col gap-3">
          <div className="text-xs font-medium text-gray-600">Preview ao vivo</div>
          <div
            className="p-4 rounded-lg text-white flex items-center gap-3"
            style={{
              background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})`,
            }}
          >
            {community.theme?.logo && (
              <img
                src={community.theme.logo}
                alt="Logo"
                className="w-8 h-8 object-contain"
                onError={e => {
                  (e.target as HTMLImageElement).style.display = 'none'
                }}
              />
            )}
            <div className="text-sm">
              <div className="font-semibold">
                {community.theme?.nomeEscola || community.community_id}
              </div>
              <div className="text-xs opacity-80">Raiz Educação</div>
            </div>
          </div>

          {/* Color swatches */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="border border-gray-300 rounded-lg p-2">
              <div className="text-gray-600 mb-1.5">Primária</div>
              <div
                className="w-full h-8 rounded border border-gray-300"
                style={{ backgroundColor: primaryColor }}
              />
              <div className="text-gray-600 mt-1.5 font-mono text-xs">{primaryColor}</div>
            </div>
            <div className="border border-gray-300 rounded-lg p-2">
              <div className="text-gray-600 mb-1.5">Secundária</div>
              <div
                className="w-full h-8 rounded border border-gray-300"
                style={{ backgroundColor: secondaryColor }}
              />
              <div className="text-gray-600 mt-1.5 font-mono text-xs">{secondaryColor}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
