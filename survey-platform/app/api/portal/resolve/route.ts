import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export interface ResolvedSurvey {
  slug: string
  title: string
  status: 'ativa' | 'pausada' | 'encerrada' | 'nao_aberta'
  open_date: string | null
  close_date: string | null
  target_roles: string[]
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const communityId = (searchParams.get('communityId') ?? '').replace('@', '')

  if (!communityId) {
    return NextResponse.json({ error: 'communityId is required' }, { status: 400 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } }
  )

  // Busca pesquisas instaladas e ativas para esta comunidade
  // Junta com surveys para garantir que o template também está ativo
  const { data, error } = await supabase
    .from('survey_communities')
    .select(`
      status,
      open_date,
      close_date,
      surveys!inner (
        slug,
        title,
        target_roles,
        status,
        open_date,
        close_date
      )
    `)
    .eq('community_id', communityId)
    .eq('active', true)
    .eq('surveys.status', 'ativa')
    .order('close_date', { ascending: true, nullsFirst: false })

  if (error) {
    return NextResponse.json({ error: 'Failed to resolve surveys' }, { status: 500 })
  }

  if (!data || data.length === 0) {
    return NextResponse.json({ surveys: [] })
  }

  const surveys: ResolvedSurvey[] = data.map(row => {
    const s = (Array.isArray(row.surveys) ? row.surveys[0] : row.surveys) as {
      slug: string; title: string; target_roles: string[]; status: string
      open_date: string | null; close_date: string | null
    }
    return {
      slug: s.slug,
      title: s.title,
      target_roles: s.target_roles,
      status: row.status as ResolvedSurvey['status'],
      open_date:  row.open_date  ?? s.open_date,
      close_date: row.close_date ?? s.close_date,
    }
  })

  return NextResponse.json({ surveys })
}
