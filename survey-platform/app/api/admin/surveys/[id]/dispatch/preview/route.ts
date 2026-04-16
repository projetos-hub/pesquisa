// GET /api/admin/surveys/[id]/dispatch/preview
// Retorna estimativa de comunidades e usuários para um disparo
// Query params: scope, communityIds (comma-separated), roles (comma-separated)

import { createServerSupabaseClient } from '@/lib/supabase-server'
import { createServiceClient } from '@/lib/supabase-service'
import { resolveTargetCommunities, type TargetScope } from '@/lib/layers-notifications'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return Response.json({ error: 'Não autorizado' }, { status: 401 })

    const { id: surveyId } = await params
    const url  = new URL(request.url)
    const scope        = (url.searchParams.get('scope') ?? 'all') as TargetScope
    const communityIds = url.searchParams.get('communityIds')?.split(',').filter(Boolean) ?? []

    const communities = await resolveTargetCommunities(surveyId, scope, communityIds)

    // Busca nome de cada comunidade instalada
    const service = createServiceClient()
    const { data: rows } = await service
      .from('survey_communities')
      .select('community_id, theme')
      .eq('survey_id', surveyId)
      .in('community_id', communities)

    const communityList = communities.map(id => {
      const row  = rows?.find((r: { community_id: string }) => r.community_id === id)
      const nome = (row?.theme as { nomeEscola?: string } | null)?.nomeEscola ?? id
      return { id, nome }
    })

    return Response.json({
      communities:      communityList,
      community_count:  communities.length,
      // Estimativa de tempo para envio personalizado (150ms/usuário, ~50 usuários/comunidade médio)
      personalized_estimate_min: Math.ceil((communities.length * 50 * 150) / 1000 / 60),
    })
  } catch {
    return Response.json({ error: 'Erro interno' }, { status: 500 })
  }
}
