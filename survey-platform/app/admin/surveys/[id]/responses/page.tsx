import { notFound } from 'next/navigation'
import Link from 'next/link'
import { AdminPageShell } from '../../../AdminPageShell'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { CommunityDisplay } from '@/lib/community-name'

interface PageProps {
  params: Promise<{ id: string }>
  searchParams: Promise<{ page?: string }>
}

function npsClass(score: number | undefined) {
  if (score === undefined) return 'text-gray-400'
  if (score >= 9) return 'text-green-600 font-semibold'
  if (score >= 7) return 'text-yellow-600 font-semibold'
  return 'text-red-600 font-semibold'
}

function npsCategory(score: number | undefined) {
  if (score === undefined) return 'Ã¢â‚¬â€'
  if (score >= 9) return `${score} Ã¢Å“â€œ`
  if (score >= 7) return `${score} ~`
  return `${score} Ã¢Å“â€”`
}

export default async function ResponsesPage({ params, searchParams }: PageProps) {
  const { id } = await params
  const { page: pageStr } = await searchParams
  const pageNum = Math.max(1, parseInt(pageStr ?? '1', 10))
  const pageSize = 100

  const supabase = await createServerSupabaseClient()

  // Survey
  const { data: survey } = await supabase
    .from('surveys')
    .select('id, title, slug')
    .eq('id', id)
    .single()

  if (!survey) notFound()

  // Conta total de sessÃƒÂµes para paginaÃƒÂ§ÃƒÂ£o
  const { count: totalSessions } = await supabase
    .from('response_sessions')
    .select('id', { count: 'exact', head: true })
    .eq('survey_id', id)

  const totalPages = Math.ceil((totalSessions ?? 0) / pageSize)

  // Sessions com todas as respostas embutidas Ã¢â‚¬â€ com LIMIT e OFFSET
  const offset = (pageNum - 1) * pageSize
  const { data: sessions } = await supabase
    .from('response_sessions')
    .select('id, submitted_at, perfil, nome_responsavel, nome_aluno, serie, school, onda, responses(question_key, value)')
    .eq('survey_id', id)
    .order('submitted_at', { ascending: false })
    .range(offset, offset + pageSize - 1)

  const communityIds = [...new Set((sessions ?? []).map(session => session.school).filter(Boolean))]
  const { data: communityRows } = communityIds.length > 0
    ? await supabase
        .from('communities')
        .select('community_id, nome_escola, marca, unidade')
        .in('community_id', communityIds)
    : { data: [] }
  const communityById = new Map((communityRows ?? []).map(community => [community.community_id, community]))

  return (
    <AdminPageShell active="surveys" title="Respostas">
      <div className="rounded-3xl border border-white/12 bg-[#12151d]/88 p-5 text-gray-900 shadow-[0_30px_90px_rgba(0,0,0,0.45)] backdrop-blur-xl">
      {/* Breadcrumb */}
      <div className="flex items-center gap-3 mb-6">
        <Link href="/admin/surveys" className="text-gray-400 hover:text-gray-600 text-sm">
          Ã¢â€ Â Pesquisas
        </Link>
        <span className="text-gray-300">/</span>
        <Link
          href={`/admin/surveys/${id}`}
          className="text-gray-400 hover:text-gray-600 text-sm truncate max-w-xs"
        >
          {survey.title}
        </Link>
        <span className="text-gray-300">/</span>
        <h2 className="text-lg font-semibold text-gray-900">Respostas</h2>
        <span className="ml-auto text-sm text-gray-400">
          {sessions?.length ?? 0} resposta{sessions?.length !== 1 ? 's' : ''}
        </span>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
        <table className="w-full text-sm whitespace-nowrap">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">Data</th>
              <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">Nome</th>
              <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">Perfil</th>
              <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">Escola</th>
              <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">SÃƒÂ©rie</th>
              <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">Onda</th>
              <th className="text-center text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">NPS</th>
              <th className="text-center text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">BilÃƒÂ­ngue</th>
              <th className="text-center text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">PedagÃƒÂ³gico</th>
              <th className="text-center text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">Admin</th>
              <th className="text-center text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">Infra</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {sessions?.map(session => {
              // Indexa respostas por question_key
              const ans: Record<string, unknown> = {}
              for (const r of session.responses ?? []) {
                ans[r.question_key] = r.value
              }

              const nps     = ans.nps as { nps?: number; participa_bilingue?: string } | undefined
              const npsScore = nps?.nps
              const bilingue = nps?.participa_bilingue

              // MÃƒÂ©dia de uma escala (objeto de scores numÃƒÂ©ricos)
              function avg(key: string): string {
                const val = ans[key]
                if (!val || typeof val !== 'object') return 'Ã¢â‚¬â€'
                const scores = Object.values(val as Record<string, unknown>)
                  .map(Number)
                  .filter(n => !isNaN(n) && n > 0)
                if (!scores.length) return 'Ã¢â‚¬â€'
                return (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1)
              }

              const nome = session.perfil === 'aluno'
                ? session.nome_aluno || 'Ã¢â‚¬â€'
                : session.nome_responsavel || 'Ã¢â‚¬â€'
              return (
                <tr key={session.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-2.5 text-gray-500 text-xs">
                    {new Date(session.submitted_at).toLocaleDateString('pt-BR', {
                      day: '2-digit', month: '2-digit', year: '2-digit',
                      hour: '2-digit', minute: '2-digit',
                    })}
                  </td>
                  <td className="px-4 py-2.5 text-gray-900 max-w-[160px] truncate">{nome}</td>
                  <td className="px-4 py-2.5">
                    <span className={`inline-flex text-xs px-2 py-0.5 rounded-full font-medium ${
                      session.perfil === 'aluno'
                        ? 'bg-purple-100 text-purple-700'
                        : 'bg-blue-100 text-blue-700'
                    }`}>
                      {session.perfil === 'aluno' ? 'Aluno' : 'ResponsÃƒÂ¡vel'}
                    </span>
                  </td>
                  <td className="px-4 py-2.5">
                    <CommunityDisplay
                      communityId={session.school || ''}
                      nomeEscola={communityById.get(session.school)?.nome_escola}
                      marca={communityById.get(session.school)?.marca}
                      unidade={communityById.get(session.school)?.unidade}
                    />
                  </td>
                  <td className="px-4 py-2.5 text-gray-500 text-xs">{session.serie || 'Ã¢â‚¬â€'}</td>
                  <td className="px-4 py-2.5 text-gray-500 text-xs">{session.onda || 'Ã¢â‚¬â€'}</td>
                  <td className={`px-4 py-2.5 text-center text-sm ${npsClass(npsScore)}`}>
                    {npsCategory(npsScore)}
                  </td>
                  <td className="px-4 py-2.5 text-center text-xs text-gray-500">
                    {bilingue === 'Sim' ? avg('bilingue') : 'Ã¢â‚¬â€'}
                  </td>
                  <td className="px-4 py-2.5 text-center text-sm text-gray-700">{avg('pedagogico')}</td>
                  <td className="px-4 py-2.5 text-center text-sm text-gray-700">{avg('administrativo')}</td>
                  <td className="px-4 py-2.5 text-center text-sm text-gray-700">{avg('infraestrutura')}</td>
                </tr>
              )
            })}

            {!sessions?.length && (
              <tr>
                <td colSpan={11} className="px-4 py-10 text-center text-gray-400">
                  Nenhuma resposta recebida ainda.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* PaginaÃƒÂ§ÃƒÂ£o */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-6">
          <div className="text-sm text-gray-500">
            PÃƒÂ¡gina {pageNum} de {totalPages} Ã¢â‚¬Â¢ Total: {totalSessions ?? 0} {(totalSessions ?? 0) === 1 ? 'resposta' : 'respostas'}
          </div>
          <div className="flex gap-2">
            {pageNum > 1 && (
              <Link
                href={`?page=${pageNum - 1}`}
                className="px-3 py-1.5 text-sm font-medium bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
              >
                Ã¢â€ Â Anterior
              </Link>
            )}
            {pageNum < totalPages && (
              <Link
                href={`?page=${pageNum + 1}`}
                className="px-3 py-1.5 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                PrÃƒÂ³xima Ã¢â€ â€™
              </Link>
            )}
          </div>
        </div>
      )}
      </div>
    </AdminPageShell>
  )
}
