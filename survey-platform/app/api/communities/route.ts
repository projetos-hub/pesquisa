import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    { auth: { persistSession: false } }
  )

  // Busca comunidades únicas com seus temas
  const { data, error } = await supabase
    .from('survey_communities')
    .select('id, community_id, theme')
    .order('community_id', { ascending: true })

  if (error) {
    console.error('[GET /api/communities] error:', error)
    return NextResponse.json(
      { error: 'Erro ao carregar comunidades' },
      { status: 500 }
    )
  }

  // Remove duplicatas (mesma community_id) e monta com logoUrl
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const uniqueCommunities = Array.from(
    new Map((data || []).map(c => [c.community_id, c])).values()
  ).map(c => ({
    id: c.id,
    community_id: c.community_id,
    logoUrl: `${supabaseUrl}/storage/v1/object/public/school-assets/${c.community_id}/logo.png`,
    theme: c.theme,
  }))

  return NextResponse.json(uniqueCommunities)
}
