import { notFound } from 'next/navigation'
import Link from 'next/link'
import { AdminPageShell } from '../../../AdminPageShell'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { resolveCommunityPrimaryName } from '@/lib/community-identity'
import TextOverridesEditor from './TextOverridesEditor'
import type { SurveyContentOverrides } from '@/lib/survey-config'

interface PageProps {
  params: Promise<{ id: string }>
}

type QuestionRow = {
  id: string
  key: string
  type: string
  title: string
  description: string | null
  settings: Record<string, unknown> | null
}

type InstallationRow = {
  community_id: string
  settings: Record<string, unknown> | null
}

type CommunityRow = {
  community_id: string
  nome_escola: string | null
  marca: string | null
  unidade: string | null
}

function itemLabel(question: QuestionRow): string {
  if (question.type === 'welcome') return 'Boas-vindas'
  if (question.type === 'thankyou') return 'Agradecimento'
  return question.title || question.key
}

function normalizeQuestion(question: QuestionRow) {
  const settings = question.settings ?? {}
  return {
    key: question.key || question.type,
    type: question.type,
    label: itemLabel(question),
    defaultTitle: question.title ?? '',
    defaultDescription: question.description ?? '',
    defaultPergunta: typeof settings.pergunta === 'string' ? settings.pergunta : '',
  }
}

export default async function SurveyTextOverridesPage({ params }: PageProps) {
  const { id } = await params
  const supabase = await createServerSupabaseClient()

  const { data: survey } = await supabase
    .from('surveys')
    .select('id, slug, title, settings')
    .eq('id', id)
    .single()

  if (!survey) notFound()

  const { data: questionsRaw } = await supabase
    .from('questions')
    .select('id, key, type, title, description, settings')
    .eq('survey_id', id)
    .order('order_index', { ascending: true })

  const { data: installationsRaw } = await supabase
    .from('survey_communities')
    .select('community_id, settings')
    .eq('survey_id', id)
    .eq('active', true)
    .order('community_id', { ascending: true })

  const installations = (installationsRaw ?? []) as InstallationRow[]
  const communityIds = installations.map(installation => installation.community_id)
  const { data: communitiesRaw } = communityIds.length > 0
    ? await supabase
        .from('communities')
        .select('community_id, nome_escola, marca, unidade')
        .in('community_id', communityIds)
    : { data: [] }

  const communityById = new Map(
    ((communitiesRaw ?? []) as CommunityRow[]).map(community => [community.community_id, community])
  )

  const questionItems = ((questionsRaw ?? []) as QuestionRow[])
    .filter(question => question.type !== 'thankyou')
    .map(normalizeQuestion)

  const surveyTheme = ((survey.settings as { theme?: Record<string, unknown> } | null)?.theme ?? {})
  const defaultThankyou = typeof surveyTheme.thankyouMessage === 'string' ? surveyTheme.thankyouMessage : ''
  const items = [
    ...questionItems,
    {
      key: '__thankyou',
      type: 'thankyou',
      label: 'Agradecimento',
      defaultTitle: '',
      defaultDescription: defaultThankyou,
      defaultPergunta: '',
    },
  ]

  const communities = installations.map(installation => {
    const community = communityById.get(installation.community_id)
    const overrides = ((installation.settings ?? {}).contentOverrides ?? {}) as SurveyContentOverrides
    return {
      communityId: installation.community_id,
      name: resolveCommunityPrimaryName({
        community_id: installation.community_id,
        nome_escola: community?.nome_escola ?? null,
        marca: community?.marca ?? null,
        unidade: community?.unidade ?? null,
      }),
      subtitle: [community?.marca, community?.unidade].filter(Boolean).join(' / '),
      overrides,
      marca: community?.marca ?? '',
      unidade: community?.unidade ?? '',
    }
  })

  return (
    <AdminPageShell active="surveys" title="Adaptações por comunidade">
      <section className="rounded-3xl border border-white/12 bg-[#12151d]/88 p-5 text-white shadow-[0_30px_90px_rgba(0,0,0,0.45)] backdrop-blur-xl">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <Link href={`/admin/surveys/${id}`} className="text-sm font-semibold text-[#F7941D] hover:text-[#ffb24a]">
              Voltar para pesquisa
            </Link>
            <h2 className="mt-2 text-2xl font-bold">{survey.title}</h2>
            <p className="mt-1 max-w-3xl text-sm text-slate-400">
              Personalize textos por comunidade sem duplicar a estrutura, as respostas ou os relatórios da pesquisa.
            </p>
          </div>
          <Link
            href={`/p/${survey.slug}${communities[0]?.communityId ? `?communityId=${communities[0].communityId}` : ''}`}
            className="rounded-2xl border border-white/12 bg-white/10 px-4 py-2 text-sm font-bold text-white shadow-lg shadow-black/20 transition hover:bg-white/15"
          >
            Abrir preview
          </Link>
        </div>

        <TextOverridesEditor surveyId={id} surveySlug={survey.slug} items={items} communities={communities} />
      </section>
    </AdminPageShell>
  )
}