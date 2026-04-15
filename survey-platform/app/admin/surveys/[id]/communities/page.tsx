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
    .select('id, community_id, theme')
    .eq('survey_id', id)
    .order('community_id', { ascending: true })

  // Auto-gera logoUrl para cada comunidade
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const communitiesWithLogoUrl = (communities ?? []).map(c => ({
    ...c,
    logoUrl: `${supabaseUrl}/storage/v1/object/public/school-assets/${c.community_id}/logo.png`,
  }))

  // Conta comunidades com tema configurado
  const configuredCount = communitiesWithLogoUrl.filter(c => c.theme && Object.keys(c.theme).length > 0).length
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
          <div className="text-2xl font-bold text-indigo-600">{totalCount}</div>
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
