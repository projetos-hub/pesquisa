import { notFound } from 'next/navigation'
import Link from 'next/link'
import { AdminPageShell } from '../../../AdminPageShell'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import CommunitiesThemeEditor from './CommunitiesThemeEditor'

interface PageProps {
  params: Promise<{ id: string }>
}

type SurveyCommunityRow = {
  id: string
  community_id: string
  open_date: string | null
  close_date: string | null
  status: string | null
}

type GlobalCommunityRow = {
  community_id: string
  nome_escola: string | null
  primary_color: string | null
  secondary_color: string | null
  logo: string | null
}

export default async function CommunitiesPage({ params }: PageProps) {
  const { id } = await params
  const supabase = await createServerSupabaseClient()

  const { data: survey } = await supabase
    .from('surveys')
    .select('id, title')
    .eq('id', id)
    .single()

  if (!survey) notFound()

  const { data: installations } = await supabase
    .from('survey_communities')
    .select('id, community_id, open_date, close_date, status')
    .eq('survey_id', id)
    .order('community_id', { ascending: true })

  const installRows = (installations ?? []) as SurveyCommunityRow[]
  const communityIds = installRows.map(c => c.community_id)

  const { data: globalCommunities } = communityIds.length > 0
    ? await supabase
        .from('communities')
        .select('community_id, nome_escola, primary_color, secondary_color, logo')
        .in('community_id', communityIds)
    : { data: [] }

  const globalById = new Map(
    ((globalCommunities ?? []) as GlobalCommunityRow[]).map(community => [community.community_id, community])
  )

  const communities = installRows.map(installation => {
    const global = globalById.get(installation.community_id)
    return {
      ...installation,
      nome_escola:     global?.nome_escola ?? '',
      primary_color:   global?.primary_color ?? '',
      secondary_color: global?.secondary_color ?? '',
      logo:            global?.logo ?? '',
    }
  })

  return (
    <AdminPageShell active="communities" title="Identidade Visual">
      <section className="rounded-3xl border border-white/12 bg-[#12151d]/88 p-5 text-white shadow-[0_30px_90px_rgba(0,0,0,0.45)] backdrop-blur-xl">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <Link href={`/admin/surveys/${id}`} className="text-sm font-semibold text-[#F7941D] hover:text-[#ffb24a]">
              Voltar para pesquisa
            </Link>
            <h2 className="mt-2 text-2xl font-bold">{survey.title}</h2>
            <p className="mt-1 text-sm text-slate-400">
              Identidade herdada do cadastro global de cada comunidade.
            </p>
          </div>
          <Link
            href="/admin/communities"
            className="rounded-2xl border border-white/12 bg-white/10 px-4 py-2 text-sm font-bold text-white shadow-lg shadow-black/20 transition hover:bg-white/15"
          >
            Editar identidade global
          </Link>
        </div>

        <CommunitiesThemeEditor communities={communities} />
      </section>
    </AdminPageShell>
  )
}
