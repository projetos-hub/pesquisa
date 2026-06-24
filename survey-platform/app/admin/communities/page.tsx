import { createServiceClient } from '@/lib/supabase-service'
import { AdminPageShell } from '../AdminPageShell'
import CommunitiesThemeEditor from './CommunitiesThemeEditor'

export interface Community {
  community_id: string
  nome_escola: string
  primary_color: string
  secondary_color: string
  logo: string
}

export default async function CommunitiesPage() {
  const supabase = createServiceClient()

  const { data } = await supabase
    .from('communities')
    .select('community_id, nome_escola, primary_color, secondary_color, logo')
    .order('community_id', { ascending: true })

  const communities: Community[] = data ?? []

  const configuredCount = communities.filter(
    c => c.primary_color !== '#667eea' || c.logo !== ''
  ).length

  return (
    <AdminPageShell active="communities" title="Identidade Visual">
      <div className="rounded-3xl border border-white/12 bg-[#12151d]/88 p-5 text-gray-900 shadow-[0_30px_90px_rgba(0,0,0,0.45)] backdrop-blur-xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Identidade Visual</h1>
        <p className="text-gray-600">Gerenciar temas, cores e logos das comunidades</p>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="text-2xl font-bold text-[#F7941D]">{communities.length}</div>
          <div className="text-xs text-gray-500 mt-0.5">Total de comunidades</div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="text-2xl font-bold text-green-600">{configuredCount}</div>
          <div className="text-xs text-gray-500 mt-0.5">Com tema configurado</div>
        </div>
      </div>

      <CommunitiesThemeEditor communities={communities} />
      </div>
    </AdminPageShell>
  )
}
