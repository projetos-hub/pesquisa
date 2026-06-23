'use client'

import { useState } from 'react'

import { saveCommunityTheme, updateCommunityDates } from './actions'
import { buildCommunityThemePayload, getCommunityDatesPayload, toDatetimeLocal } from './community-theme-utils'
import type { Community } from './CommunitiesThemeEditor'

interface FormProps {
  surveyId: string
  community: Community
  onClose: () => void
}

export function ThemeEditForm({ surveyId, community, onClose }: FormProps) {
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
      buildCommunityThemePayload(formData)
    )

    if (result.error) {
      setIsPending(false)
      setError(result.error)
      return
    }

    const { openDate, closeDate } = getCommunityDatesPayload(formData)
    const datesResult = await updateCommunityDates(
      surveyId,
      community.community_id,
      openDate,
      closeDate,
    )

    setIsPending(false)

    if (datesResult.error) setError(datesResult.error)
    else onClose()
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-6">
        <div className="space-y-4">
          <form onSubmit={handleSubmit} className="space-y-4">
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

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">URL da Logo</label>
              <input
                type="url"
                name="logo"
                defaultValue={community.theme?.logo || community.logoUrl}
                placeholder={community.logoUrl}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#F7941D] font-mono text-xs"
              />
              <p className="text-xs text-gray-500 mt-1">Default: {community.logoUrl}</p>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">Mensagem de boas-vindas</label>
              <textarea
                name="welcomeMessage"
                rows={3}
                defaultValue={community.theme?.welcomeMessage || ''}
                placeholder="Ex: Que bom ter você aqui! Sua opinião é muito importante."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#F7941D] resize-y"
              />
              <p className="text-xs text-gray-500 mt-1">
                Variáveis: {'{{nome}}'} | {'{{nomeAluno}}'} | {'{{serie}}'} | {'{{nomeEscola}}'}
              </p>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">Mensagem de agradecimento</label>
              <textarea
                name="thankyouMessage"
                rows={3}
                defaultValue={community.theme?.thankyouMessage || ''}
                placeholder="Ex: Obrigado por participar! Sua opinião faz a diferença."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#F7941D] resize-y"
              />
              <p className="text-xs text-gray-500 mt-1">
                Se preenchida, substitui o texto padrão. Variáveis: {'{{nomeAluno}}'} | {'{{nomeEscola}}'}
              </p>
            </div>

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
                    defaultValue={toDatetimeLocal(community.open_date)}
                    className="w-full border border-gray-300 rounded-[4.8px] px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-[#F7941D] focus:border-[#F7941D]"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Encerramento</label>
                  <input
                    type="datetime-local"
                    name="close_date"
                    defaultValue={toDatetimeLocal(community.close_date)}
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

            {error && (
              <div className="p-2.5 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
                {error}
              </div>
            )}

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

        <div className="flex flex-col gap-3">
          <div className="text-xs font-medium text-gray-600">Preview ao vivo</div>
          <div
            className="p-4 rounded-lg text-white flex items-center gap-3"
            style={{ background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})` }}
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
