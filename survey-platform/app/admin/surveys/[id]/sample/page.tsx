import { createServerSupabaseClient } from '@/lib/supabase-server'
import { createServiceClient } from '@/lib/supabase-service'
import { redirect } from 'next/navigation'
import { AdminPageShell } from '../../../AdminPageShell'
import SampleUpload from './SampleUpload'

interface Props {
  params: Promise<{ id: string }>
}

export default async function SamplePage({ params }: Props) {
  const { id } = await params
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/admin/login')
  }

  const { data: survey } = await supabase
    .from('surveys')
    .select('id, title, slug')
    .eq('id', id)
    .single()

  if (!survey) {
    return <div className="p-6 text-red-600">Pesquisa não encontrada</div>
  }

  const service = createServiceClient()
  const { data: installRows } = await service
    .from('survey_communities')
    .select('community_id')
    .eq('survey_id', id)
    .eq('active', true)
    .order('community_id')

  const communityIds = (installRows ?? []).map((r: { community_id: string }) => r.community_id)
  const { data: communityRows } = communityIds.length > 0
    ? await service
        .from('communities')
        .select('community_id, nome_escola')
        .in('community_id', communityIds)
    : { data: [] }
  const nameByCommunity = new Map((communityRows ?? []).map(c => [c.community_id, c.nome_escola ?? c.community_id]))

  const communities = (installRows ?? []).map((r: { community_id: string }) => ({
    id:   r.community_id,
    nome: nameByCommunity.get(r.community_id) ?? r.community_id,
  }))

  return (
    <AdminPageShell active="surveys" title="Amostra">
      <div className="rounded-3xl border border-white/12 bg-[#12151d]/88 p-5 text-gray-900 shadow-[0_30px_90px_rgba(0,0,0,0.45)] backdrop-blur-xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Amostra — {survey.title}</h1>
        <p className="text-gray-600">Fazer upload de Excel com usuários da amostra segmentada</p>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <SampleUpload surveyId={id} surveySlug={survey.slug} communities={communities} />
      </div>
      </div>
    </AdminPageShell>
  )
}
