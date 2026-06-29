import { notFound } from 'next/navigation'
import Link from 'next/link'
import { AdminPageShell } from '../../../AdminPageShell'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import DisparoForm from './DisparoForm'
import { getBroadcasts } from './actions'
import { formatCommunityId } from '@/lib/community-name'
import { resolveCommunityPrimaryName } from '@/lib/community-identity'

interface PageProps {
  params: Promise<{ id: string }>
}

const STATUS_BADGE: Record<string, string> = {
  sent:      'bg-green-100 text-green-700',
  pending:   'bg-yellow-100 text-yellow-700',
  scheduled: 'bg-blue-100 text-blue-700',
  failed:    'bg-red-100 text-red-700',
}

const STATUS_LABEL: Record<string, string> = {
  sent: 'Enviado', pending: 'Pendente', scheduled: 'Agendado', failed: 'Falhou',
}

export default async function DisparosPage({ params }: PageProps) {
  const { id } = await params
  const supabase = await createServerSupabaseClient()

  const { data: survey } = await supabase
    .from('surveys')
    .select('id, slug, title, status')
    .eq('id', id)
    .single()

  if (!survey) notFound()

  const { data: communities } = await supabase
    .from('survey_communities')
    .select('community_id, status')
    .eq('survey_id', id)
    .eq('active', true)
    .order('community_id')

  const broadcasts = await getBroadcasts(id)

  const communityIds = (communities ?? []).map(c => c.community_id)
  const { data: communityRows } = communityIds.length > 0
    ? await supabase
        .from('communities')
        .select('community_id, nome_escola, marca, unidade')
        .in('community_id', communityIds)
    : { data: [] }
  const nameByCommunity = new Map((communityRows ?? []).map(c => [c.community_id, resolveCommunityPrimaryName(c)]))

  const communityOptions = (communities ?? []).map(c => ({
    id: c.community_id,
    label: nameByCommunity.get(c.community_id) ?? c.community_id,
    status: c.status,
  }))

  // Mapa community_id â†’ nome legÃ­vel para o histÃ³rico de disparos
  const communityNameMap = Object.fromEntries(communityOptions.map(c => [c.id, c.label]))

  return (
    <AdminPageShell active="dispatch" title="Disparos">
      <div className="rounded-3xl border border-white/12 bg-[#12151d]/88 p-5 text-gray-900 shadow-[0_30px_90px_rgba(0,0,0,0.45)] backdrop-blur-xl">
      {/* Breadcrumb */}
      <div className="flex items-center gap-3 mb-6">
        <Link href="/admin/surveys" className="text-gray-400 hover:text-gray-600 text-sm">â† Pesquisas</Link>
        <span className="text-gray-300">/</span>
        <Link href={`/admin/surveys/${id}`} className="text-gray-400 hover:text-gray-600 text-sm truncate max-w-xs">{survey.title}</Link>
        <span className="text-gray-300">/</span>
        <h2 className="text-lg font-semibold text-gray-900">Disparos</h2>
      </div>

      <div className="grid gap-6">
        {/* FormulÃ¡rio de novo disparo */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Novo disparo</h3>
          <DisparoForm
            surveyId={id}
            surveySlug={survey.slug}
            surveyTitle={survey.title}
            communities={communityOptions}
          />
        </div>

        {/* HistÃ³rico de disparos */}
        {broadcasts.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100">
              <h3 className="text-sm font-semibold text-gray-700">HistÃ³rico de disparos</h3>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="text-left text-xs font-medium text-gray-500 px-4 py-2">Data</th>
                  <th className="text-left text-xs font-medium text-gray-500 px-4 py-2">Comunidades</th>
                  <th className="text-left text-xs font-medium text-gray-500 px-4 py-2">Canal</th>
                  <th className="text-left text-xs font-medium text-gray-500 px-4 py-2">Status</th>
                  <th className="text-right text-xs font-medium text-gray-500 px-4 py-2">Enviados</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {broadcasts.map(b => (
                  <tr key={b.id} className="hover:bg-gray-50">
                    <td className="px-4 py-2.5 text-xs text-gray-500">
                      {new Date(b.dispatched_at ?? b.created_at).toLocaleDateString('pt-BR', {
                        day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'
                      })}
                    </td>
                    <td className="px-4 py-2.5 text-xs text-gray-700">
                      {b.community_ids.length === 0
                        ? 'Todas'
                        : b.community_ids
                            .slice(0, 2)
                            .map((cid: string) => communityNameMap[cid] ?? formatCommunityId(cid))
                            .join(', ') + (b.community_ids.length > 2 ? ` +${b.community_ids.length - 2}` : '')}
                    </td>
                    <td className="px-4 py-2.5 text-xs text-gray-500 capitalize">{b.channel.replace('_', '+')}</td>
                    <td className="px-4 py-2.5">
                      <span className={`inline-flex text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_BADGE[b.status] ?? 'bg-gray-100 text-gray-600'}`}>
                        {STATUS_LABEL[b.status] ?? b.status}
                      </span>
                      {b.error_message && (
                        <span className="ml-2 text-xs text-red-500" title={b.error_message}>!</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-right font-medium text-gray-900">
                      {b.recipient_count ?? 'â€”'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      </div>
    </AdminPageShell>
  )
}
