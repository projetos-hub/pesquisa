import { Fragment } from 'react'
import { AdminPageShell } from '../AdminPageShell'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { disablePublicResponseLink } from './actions'
import { PublicLinkCreateForm } from './PublicLinkCreateForm'
import { normalizePublicResponseScope, publicResponseScopeLabel, type PublicResponseScope } from '@/lib/public-responses'

interface Survey {
  id: string
  slug: string
  title: string
  status: string
  response_sessions: { id: string }[]
}

interface PublicResponseLink {
  id: string
  survey_id: string
  token: string
  enabled: boolean
  include_pii: boolean
  access_key_hash: string | null
  created_at: string
  scope: PublicResponseScope
}

interface CommunityBrand {
  marca: string | null
}

function statusLabel(status: string) {
  if (status === 'ativa') return 'Ativa'
  if (status === 'nao_aberta') return 'Nao aberta'
  return 'Encerrada'
}

function statusClass(status: string) {
  if (status === 'ativa') return 'bg-green-100 text-green-700'
  if (status === 'nao_aberta') return 'bg-yellow-100 text-yellow-700'
  return 'bg-gray-100 text-gray-700'
}

export default async function ExportPage() {
  const supabase = await createServerSupabaseClient()
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://pesquisa-nu-sand.vercel.app'

  const { data: surveys } = await supabase
    .from('surveys')
    .select('id, slug, title, status, response_sessions(id)')
    .order('created_at', { ascending: false }) as { data: Survey[] | null }

  const { data: publicLinks } = await supabase
    .from('public_response_links')
    .select('id, survey_id, token, enabled, include_pii, access_key_hash, created_at, scope')
    .order('created_at', { ascending: false }) as { data: PublicResponseLink[] | null }

  const { data: communities } = await supabase
    .from('communities')
    .select('marca')
    .not('marca', 'is', null) as { data: CommunityBrand[] | null }

  const brandNames = [...new Set(
    (communities ?? [])
      .map(community => community.marca?.trim())
      .filter((marca): marca is string => Boolean(marca))
  )].sort((a, b) => a.localeCompare(b, 'pt-BR'))

  const linksBySurvey = new Map<string, PublicResponseLink[]>()
  for (const rawLink of publicLinks ?? []) {
    const link = {
      ...rawLink,
      scope: normalizePublicResponseScope(rawLink.scope),
    }
    const current = linksBySurvey.get(link.survey_id) ?? []
    current.push(link)
    linksBySurvey.set(link.survey_id, current)
  }

  const surveyData = (surveys ?? []).map(survey => ({
    ...survey,
    responseCount: survey.response_sessions?.length ?? 0,
    publicLinks: linksBySurvey.get(survey.id) ?? [],
  }))

  return (
    <AdminPageShell active="export" title="Exportar">
      <div className="rounded-3xl border border-white/12 bg-white p-5 text-gray-900 shadow-[0_30px_90px_rgba(0,0,0,0.45)]">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Exportar Respostas</h1>
          <p className="mt-2 text-gray-600">
            Exporte XLSX para admin ou crie links protegidos com senha para tabela, CSV, JSON e XLSX.
          </p>
        </div>

        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
          <table className="w-full min-w-[980px]">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Pesquisa</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Status</th>
                <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider text-gray-500">Respostas</th>
                <th className="w-[360px] px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">Acoes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {surveyData.map(survey => (
                <Fragment key={survey.id}>
                  <tr className="transition-colors hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900">{survey.title}</div>
                      <div className="mt-0.5 font-mono text-xs text-gray-500">{survey.slug}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${statusClass(survey.status)}`}>
                        {statusLabel(survey.status)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="font-semibold text-gray-900">{survey.responseCount}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col items-end gap-2">
                        <a
                          href={`/api/admin/export?surveyId=${survey.id}`}
                          download
                          className="inline-flex items-center rounded-lg bg-[#F7941D] px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-[#D97B10]"
                        >
                          XLSX admin
                        </a>
                        <PublicLinkCreateForm surveyId={survey.id} brandNames={brandNames} />
                      </div>
                    </td>
                  </tr>

                  {survey.publicLinks.map(link => {
                    const publicUrl = `/public/responses/${link.token}`
                    const absolutePublicUrl = `${appUrl}${publicUrl}`
                    return (
                      <tr key={link.id} className="bg-slate-50">
                        <td colSpan={4} className="px-4 py-3">
                          <div className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-white p-3 text-xs text-slate-700 lg:flex-row lg:items-center lg:justify-between">
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className={`rounded-full px-2 py-0.5 font-bold ${link.enabled ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-500'}`}>
                                  {link.enabled ? 'ativo' : 'desativado'}
                                </span>
                                <span>{link.access_key_hash ? 'com senha' : 'sem senha antiga'}</span>
                                <span>{link.include_pii ? 'com dados pessoais' : 'sem dados pessoais'}</span>
                                <span>{publicResponseScopeLabel(link.scope)}</span>
                                <span>{new Date(link.created_at).toLocaleString('pt-BR')}</span>
                              </div>
                              <div className="mt-2 flex flex-col gap-1 font-mono text-[11px]">
                                <a className="truncate text-blue-700 hover:underline" href={publicUrl} target="_blank" rel="noreferrer">
                                  {absolutePublicUrl}
                                </a>
                                <span className="truncate text-slate-500">Sheets: use a senha/key gerada como parametro ?key=...</span>
                              </div>
                            </div>
                            {link.enabled && (
                              <form action={disablePublicResponseLink}>
                                <input type="hidden" name="linkId" value={link.id} />
                                <button type="submit" className="rounded-lg border border-red-200 px-3 py-1.5 font-bold text-red-700 hover:bg-red-50">
                                  Desativar
                                </button>
                              </form>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </Fragment>
              ))}

              {surveyData.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-10 text-center text-gray-400">
                    Nenhuma pesquisa disponivel.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </AdminPageShell>
  )
}
