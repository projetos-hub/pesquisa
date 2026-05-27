import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import CommunitiesThemeEditor from './CommunitiesThemeEditor'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function CommunitiesPage({ params }: PageProps) {
  const { id } = await params
  const supabase = await createServerSupabaseClient()

  // Busca survey
  const { data: survey } = await supabase
    .from('surveys')
    .select('id, title')
    .eq('id', id)
    .single()

  if (!survey) notFound()

  // Busca todas as comunidades da pesquisa
  const { data: communities } = await supabase
    .from('survey_communities')
    .select('id, community_id, theme, open_date, close_date, status')
    .eq('survey_id', id)
    .order('community_id', { ascending: true })

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const communityIds = (communities ?? []).map(c => c.community_id)

  // Busca temas globais (de qualquer pesquisa) para comunidades sem tema nesta pesquisa
  // Tema é configurado globalmente — nova pesquisa exibe o tema já cadastrado automaticamente
  const { data: globalThemeRows } = communityIds.length > 0
    ? await supabase
        .from('survey_communities')
        .select('community_id, theme')
        .in('community_id', communityIds)
        .neq('survey_id', id)
        .not('theme', 'is', null)
        .order('id', { ascending: false })
    : { data: [] }

  // Mapeia community_id → tema global (primeiro encontrado = mais recente)
  const globalThemeMap = new Map<string, Record<string, unknown>>()
  for (const row of (globalThemeRows ?? [])) {
    if (!globalThemeMap.has(row.community_id) && row.theme && Object.keys(row.theme as object).length > 0) {
      globalThemeMap.set(row.community_id, row.theme as Record<string, unknown>)
    }
  }

  // Mescla: tema da pesquisa atual tem prioridade; usa global se vazio
  const communitiesWithLogoUrl = (communities ?? []).map(c => ({
    ...c,
    theme: (c.theme && Object.keys(c.theme as object).length > 0)
      ? c.theme
      : (globalThemeMap.get(c.community_id) ?? c.theme),
    logoUrl: `${supabaseUrl}/storage/v1/object/public/school-assets/${c.community_id}/logo.png`,
    open_date:  c.open_date  ?? null,
    close_date: c.close_date ?? null,
    status:     c.status     ?? null,
  }))

  // Conta comunidades com tema configurado
  const configuredCount = communitiesWithLogoUrl.filter(c => c.theme && Object.keys(c.theme as object).length > 0).length
  const totalCount = communitiesWithLogoUrl.length

  return (
    <div className="p-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-3 mb-6">
        <Link href="/admin/surveys" className="text-gray-400 hover:text-gray-600 text-sm">
          ← Pesquisas
        </Link>
        <span className="text-gray-300">/</span>
        <Link
          href={`/admin/surveys/${id}`}
          className="text-gray-400 hover:text-gray-600 text-sm truncate max-w-xs"
        >
          {survey.title}
        </Link>
        <span className="text-gray-300">/</span>
        <h2 className="text-lg font-semibold text-gray-900">Identidade Visual</h2>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="text-2xl font-bold text-[#F7941D]">{totalCount}</div>
          <div className="text-xs text-gray-500 mt-0.5">Total de comunidades</div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="text-2xl font-bold text-green-600">{configuredCount}</div>
          <div className="text-xs text-gray-500 mt-0.5">Com tema configurado</div>
        </div>
      </div>

      {/* Editor */}
      <CommunitiesThemeEditor
        surveyId={id}
        communities={communitiesWithLogoUrl}
      />
    </div>
  )
}
