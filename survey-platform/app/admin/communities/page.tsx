import { createServiceClient } from '@/lib/supabase-service'
import CommunitiesThemeEditor from './CommunitiesThemeEditor'
import { Building2Icon, CheckCircleIcon } from '@/app/admin/icons'

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
    <div className="p-6">
      {/* Page header */}
      <div className="mb-6">
        <h1 className="text-xl font-semibold tracking-tight text-[#1A202C]">Identidade Visual</h1>
        <p className="text-sm text-[#718096] mt-0.5">Gerenciar temas, cores e logos das comunidades</p>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="h-0.5 w-full" style={{ backgroundColor: '#F7941D' }} />
          <div className="p-4">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <p className="text-xs text-[#718096]">Total de comunidades</p>
                <p className="text-xl font-semibold text-[#1A202C] tabular-nums">{communities.length}</p>
              </div>
              <div className="rounded-lg p-2" style={{ backgroundColor: '#FDE8C8' }}>
                <Building2Icon style={{ color: '#F7941D' }} size={20} strokeWidth={1.75} />
              </div>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="h-0.5 w-full" style={{ backgroundColor: '#2D9E6B' }} />
          <div className="p-4">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <p className="text-xs text-[#718096]">Com tema configurado</p>
                <p className="text-xl font-semibold text-[#1A202C] tabular-nums">{configuredCount}</p>
              </div>
              <div className="rounded-lg p-2 bg-emerald-50">
                <CheckCircleIcon className="text-emerald-600" size={20} strokeWidth={1.75} />
              </div>
            </div>
          </div>
        </div>
      </div>

      <CommunitiesThemeEditor communities={communities} />
    </div>
  )
}
