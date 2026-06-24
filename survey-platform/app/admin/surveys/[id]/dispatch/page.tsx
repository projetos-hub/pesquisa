import { notFound }  from 'next/navigation'
import Link          from 'next/link'
import { AdminPageShell } from '../../../AdminPageShell'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { createServiceClient }        from '@/lib/supabase-service'
import DispatchForm    from './DispatchForm'
import DispatchHistory from './DispatchHistory'
import ManualDispatch  from './ManualDispatch'
import SamplePanel     from './SamplePanel'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function DispatchPage({ params }: PageProps) {
  const { id: surveyId } = await params
  const supabase = await createServerSupabaseClient()

  // Auth
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) notFound()

  // Survey
  const { data: survey } = await supabase
    .from('surveys')
    .select('id, slug, title, open_date')
    .eq('id', surveyId)
    .single()

  if (!survey) notFound()

  const service = createServiceClient()

  // Comunidades instaladas
  const { data: installRows } = await service
    .from('survey_communities')
    .select('community_id')
    .eq('survey_id', surveyId)
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

  // Templates salvos
  const { data: templatesRaw } = await service
    .from('survey_dispatches')
    .select(
      'id, template_name, title, body, channels, target_scope, target_roles,' +
      'push_title, push_body, email_title, email_body, email_action_label, email_background_url, sequence_steps'
    )
    .eq('survey_id', surveyId)
    .eq('is_template', true)
    .order('created_at', { ascending: false })

  const templates = (templatesRaw ?? []) as unknown as {
    id: string; template_name: string; title: string; body: string;
    channels: string[]; target_scope: string; target_roles: string[];
    push_title: string | null; push_body: string | null;
    email_title: string | null; email_body: string | null;
    email_action_label: string | null; email_background_url: string | null;
    sequence_steps: unknown[] | null;
  }[]

  // Stats da amostra
  const [
    { count: sampleTotal },
    { count: sampleResolved },
    { count: sampleNotFound },
    { count: samplePending },
  ] = await Promise.all([
    service.from('survey_sample_lists').select('*', { count: 'exact', head: true }).eq('survey_id', surveyId),
    service.from('survey_sample_lists').select('*', { count: 'exact', head: true }).eq('survey_id', surveyId).not('layers_user_id', 'is', null).neq('layers_user_id', 'NOT_FOUND'),
    service.from('survey_sample_lists').select('*', { count: 'exact', head: true }).eq('survey_id', surveyId).eq('layers_user_id', 'NOT_FOUND'),
    service.from('survey_sample_lists').select('*', { count: 'exact', head: true }).eq('survey_id', surveyId).is('layers_user_id', null),
  ])
  const sampleCount = sampleResolved ?? 0

  // Histórico de disparos (não templates)
  const { data: dispatches } = await service
    .from('survey_dispatches')
    .select(`
      id, title, target_scope, channels, status, total_jobs, completed_jobs,
      failed_jobs, personalized, sequence_step, scheduled_at, created_at, completed_at,
      jobs:survey_dispatch_jobs (
        id, community_id, status, error, retry_count, sent_at, processed_users, failed_users, total_users
      )
    `)
    .eq('survey_id', surveyId)
    .eq('is_template', false)
    .order('created_at', { ascending: false })
    .limit(30)

  return (
    <AdminPageShell active="dispatch" title="Disparos">
      <div className="rounded-3xl border border-white/12 bg-[#12151d]/88 p-5 text-gray-900 shadow-[0_30px_90px_rgba(0,0,0,0.45)] backdrop-blur-xl">
      {/* Breadcrumb */}
      <div className="flex items-center gap-3 mb-6">
        <Link href="/admin/surveys" className="text-gray-400 hover:text-gray-600 text-sm">
          ← Pesquisas
        </Link>
        <span className="text-gray-300">/</span>
        <Link href={`/admin/surveys/${surveyId}`} className="text-gray-400 hover:text-gray-600 text-sm truncate max-w-[200px]">
          {survey.title}
        </Link>
        <span className="text-gray-300">/</span>
        <h2 className="text-lg font-semibold text-gray-900">Disparos</h2>
      </div>

      <div className="grid gap-6">
        {/* Formulário */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Novo disparo</h3>
          {communities.length === 0 ? (
            <div className="bg-amber-50 border border-amber-200 text-amber-800 text-sm rounded-lg px-4 py-3">
              Nenhuma comunidade instalada nesta pesquisa.{' '}
              <Link href={`/admin/surveys/${surveyId}`} className="underline font-medium">
                Instale uma comunidade
              </Link>{' '}
              antes de disparar.
            </div>
          ) : (
            <DispatchForm
              surveyId={surveyId}
              surveySlug={survey.slug}
              communities={communities}
              templates={(templates ?? []) as unknown as Parameters<typeof DispatchForm>[0]['templates']}
              openDate={survey.open_date}
              sampleCount={sampleCount ?? 0}
            />
          )}
        </div>

        {/* Amostra de disparo */}
        <SamplePanel
          surveyId={surveyId}
          initial={{
            total:     sampleTotal     ?? 0,
            resolved:  sampleResolved  ?? 0,
            not_found: sampleNotFound  ?? 0,
            pending:   samplePending   ?? 0,
          }}
        />

        {/* Disparo rápido */}
        {communities.length > 0 && (
          <ManualDispatch surveyId={surveyId} communities={communities} />
        )}

        {/* Histórico */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-gray-700">Histórico de disparos</h3>
            {(dispatches?.length ?? 0) > 0 && (
              <span className="text-xs text-gray-400">{dispatches?.length} registro(s)</span>
            )}
          </div>
          <DispatchHistory
            dispatches={(dispatches ?? []) as Parameters<typeof DispatchHistory>[0]['dispatches']}
            surveyId={surveyId}
          />
        </div>
      </div>
      </div>
    </AdminPageShell>
  )
}
