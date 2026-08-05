import { Fragment } from 'react'
import { AdminPageShell } from '../AdminPageShell'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { disablePublicResponseLink, regeneratePublicResponseLinkAccessKey } from './actions'
import { PublicLinkCreateForm } from './PublicLinkCreateForm'
import { PublicJsonPreview } from './PublicJsonPreview'
import { normalizePublicResponseScope, publicResponseScopeLabel, type PublicResponseScope } from '@/lib/public-responses'
import { fetchSampleResponseSummary, type SampleResponseSummary } from '@/lib/report-queries'
import { resolveCommunityPrimaryName } from '@/lib/community-identity'

interface Survey {
  id: string
  slug: string
  title: string
  status: string
  access_control: string | null
}

interface PublicResponseLink {
  id: string
  survey_id: string
  token: string
  enabled: boolean
  include_pii: boolean
  access_key_hash: string | null
  access_key: string | null
  created_at: string
  scope: PublicResponseScope
}

interface CommunityRow {
  community_id: string
  nome_escola: string | null
  marca: string | null
  unidade: string | null
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
    .select('id, slug, title, status, access_control')
    .order('created_at', { ascending: false }) as { data: Survey[] | null }

  const { data: publicLinks } = await supabase
    .from('public_response_links')
    .select('id, survey_id, token, enabled, include_pii, access_key_hash, access_key, created_at, scope')
    .order('created_at', { ascending: false }) as { data: PublicResponseLink[] | null }

  const { data: communities } = await supabase
    .from('communities')
    .select('community_id, nome_escola, marca, unidade')
    .not('marca', 'is', null) as { data: CommunityRow[] | null }

  const communityOptions = (communities ?? []).map(community => ({
    id: community.community_id,
    brandName: community.marca?.trim() ?? '',
    unitLabel: community.unidade?.trim() || resolveCommunityPrimaryName(community) || community.community_id,
  })).filter(community => Boolean(community.id && community.brandName)).sort((a, b) => a.brandName.localeCompare(b.brandName, 'pt-BR') || a.unitLabel.localeCompare(b.unitLabel, 'pt-BR'))

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

  const surveyData = await Promise.all((surveys ?? []).map(async survey => {
    const { count } = await supabase
      .from('response_sessions')
      .select('*', { count: 'exact', head: true })
      .eq('survey_id', survey.id)

    const responseCount = count ?? 0
    const sampleResponse: SampleResponseSummary = await fetchSampleResponseSummary(survey.id, responseCount)

    return {
      ...survey,
      responseCount,
      sampleResponse,
      publicLinks: linksBySurvey.get(survey.id) ?? [],
    }
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
                <th className="w-[440px] px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">Acoes</th>
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
                      {survey.sampleResponse.isSampleSurvey && (
                        <div className="mt-1 text-[11px] font-medium text-emerald-700">
                          {survey.sampleResponse.responseRatePct !== null ? `${survey.sampleResponse.responseRatePct}%` : '-'} da amostra
                        </div>
                      )}
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
                        <PublicLinkCreateForm surveyId={survey.id} communities={communityOptions} />
                      </div>
                    </td>
                  </tr>

                  {survey.publicLinks.length > 0 && (
                    <tr className="bg-slate-50">
                      <td colSpan={4} className="px-4 py-3">
                        <details className="group rounded-lg border border-slate-200 bg-white text-xs text-slate-700">
                          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-3 py-2 marker:hidden">
                            <div className="min-w-0">
                              <span className="font-bold text-slate-900">Links criados</span>
                              <span className="ml-2 text-slate-500">
                                {survey.publicLinks.length} {survey.publicLinks.length === 1 ? 'link' : 'links'} para esta pesquisa
                              </span>
                            </div>
                            <span className="shrink-0 rounded-md border border-slate-200 px-2 py-1 text-[11px] font-bold text-slate-600 group-open:hidden">
                              Ver
                            </span>
                            <span className="hidden shrink-0 rounded-md border border-slate-200 px-2 py-1 text-[11px] font-bold text-slate-600 group-open:inline-flex">
                              Ocultar
                            </span>
                          </summary>

                          <div className="space-y-2 border-t border-slate-100 p-3">
                            {survey.publicLinks.map(link => {
                              const publicUrl = `/public/responses/${link.token}`
                              const absolutePublicUrl = `${appUrl}${publicUrl}`
                              const keyQuery = link.access_key ? `?key=${encodeURIComponent(link.access_key)}` : ''
                              const jsonPath = `/api/public/responses/${link.token}.json${keyQuery}`
                              const jsonUrl = `${appUrl}${jsonPath}`
                              const csvUrl = `${appUrl}/api/public/responses/${link.token}.csv${keyQuery}`
                              const sheetsFormula = link.access_key ? `=IMPORTDATA("${csvUrl}")` : null

                              return (
                                <div key={link.id} className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 lg:flex-row lg:items-start lg:justify-between">
                                  <div className="min-w-0 flex-1">
                                    <div className="flex flex-wrap items-center gap-2">
                                      <span className={`rounded-full px-2 py-0.5 font-bold ${link.enabled ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-500'}`}>
                                        {link.enabled ? 'ativo' : 'desativado'}
                                      </span>
                                      <span>{link.access_key ? 'senha visivel' : link.access_key_hash ? 'senha antiga nao armazenada' : 'sem senha antiga'}</span>
                                      <span>{link.include_pii ? 'com dados pessoais' : 'sem dados pessoais'}</span>
                                      <span>{publicResponseScopeLabel(link.scope)}</span>
                                      <span>{new Date(link.created_at).toLocaleString('pt-BR')}</span>
                                    </div>

                                    <div className="mt-2 grid gap-1 font-mono text-[11px] text-slate-600">
                                      <p className="min-w-0 truncate">
                                        <span className="font-sans font-bold text-slate-500">Link: </span>
                                        <a className="text-blue-700 hover:underline" href={publicUrl} target="_blank" rel="noreferrer">
                                          {absolutePublicUrl}
                                        </a>
                                      </p>
                                      <p className="min-w-0 truncate">
                                        <span className="font-sans font-bold text-slate-500">Senha/key: </span>
                                        {link.access_key ?? 'nao armazenada; gere uma nova senha'}
                                      </p>
                                      <p className="min-w-0 truncate">
                                        <span className="font-sans font-bold text-slate-500">API JSON: </span>
                                        {link.access_key ? jsonUrl : 'gere uma nova senha para habilitar URL pronta'}
                                      </p>
                                      <p className="min-w-0 truncate">
                                        <span className="font-sans font-bold text-slate-500">CSV: </span>
                                        {link.access_key ? csvUrl : 'gere uma nova senha para habilitar URL pronta'}
                                      </p>
                                      <p className="min-w-0 truncate">
                                        <span className="font-sans font-bold text-slate-500">Sheets: </span>
                                        {sheetsFormula ?? 'gere uma nova senha para habilitar formula pronta'}
                                      </p>
                                    </div>

                                    <div className="mt-3">
                                      <PublicJsonPreview
                                        fetchUrl={link.access_key ? jsonPath : null}
                                        displayUrl={link.access_key ? jsonUrl : null}
                                      />
                                    </div>
                                  </div>

                                  <div className="flex shrink-0 flex-wrap justify-end gap-2">
                                    {!link.access_key && link.enabled && (
                                      <form action={regeneratePublicResponseLinkAccessKey}>
                                        <input type="hidden" name="linkId" value={link.id} />
                                        <button type="submit" className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 font-bold text-slate-700 hover:bg-slate-100">
                                          Gerar nova senha
                                        </button>
                                      </form>
                                    )}
                                    {link.enabled && (
                                      <form action={disablePublicResponseLink}>
                                        <input type="hidden" name="linkId" value={link.id} />
                                        <button type="submit" className="rounded-lg border border-red-200 px-3 py-1.5 font-bold text-red-700 hover:bg-red-50">
                                          Desativar
                                        </button>
                                      </form>
                                    )}
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        </details>
                      </td>
                    </tr>
                  )}
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
