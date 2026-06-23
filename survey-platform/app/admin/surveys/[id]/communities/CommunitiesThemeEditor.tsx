'use client'

import { useState } from 'react'

import { CommunityDisplay } from '@/lib/community-name'
import { ThemeEditForm } from './ThemeEditForm'

export interface Community {
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
    thankyouMessage?: string
    welcomeMessage?: string
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

            return (
              <tr key={community.id} className={isExpanded ? 'bg-blue-50' : 'hover:bg-gray-50'}>
                {!isExpanded ? (
                  <>
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

                    <td className="px-4 py-3">
                      <CommunityDisplay
                        communityId={community.community_id}
                        nomeEscola={community.theme?.nomeEscola}
                      />
                    </td>

                    <td className="px-4 py-3">
                      <div className="text-sm text-gray-600">
                        {community.theme?.nomeEscola || '—'}
                      </div>
                    </td>

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
