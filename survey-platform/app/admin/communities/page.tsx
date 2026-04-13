import { createServerSupabaseClient } from '@/lib/supabase-server'
import CommunitiesThemeEditor from './CommunitiesThemeEditor'

interface Community {
  id: string
  community_id: string
  logoUrl: string
  theme?: {
    nomeEscola?: string
    primaryColor?: string
    secondaryColor?: string
    logo?: string
  }
}

export default async function CommunitiesPage() {
  const supabase = await createServerSupabaseClient()

  // Busca todas as comunidades com seus temas
  const { data } = await supabase
    .from('survey_communities')
    .select('id, community_id, theme')
    .order('community_id', { ascending: true })

  // Deduplica por community_id — pega o primeiro de cada
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const seen = new Set<string>()
  const communities: Community[] = (data ?? [])
    .filter(c => {
      if (seen.has(c.community_id)) return false
      seen.add(c.community_id)
      return true
    })
    .map(c => ({
      id: c.id,
      community_id: c.community_id,
      logoUrl: `${supabaseUrl}/storage/v1/object/public/school-assets/${c.community_id}/logo.png`,
      theme: c.theme,
    }))

  // Stats
  const configuredCount = communities.filter(
    c => c.theme && Object.keys(c.theme).length > 0
  ).length
  const totalCount = communities.length

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Identidade Visual</h1>
        <p className="text-gray-600">Gerenciar temas, cores e logos das comunidades</p>
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
      <CommunitiesThemeEditor communities={communities} />
    </div>
  )
}
