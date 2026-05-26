import { createServerSupabaseClient } from '@/lib/supabase-server'
import { createServiceClient } from '@/lib/supabase-service'

async function requireAuth() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authorized')
  return user
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAuth()
    const { id } = await params

    const body = await req.json() as { community_id?: string; emails?: string[] }
    const { community_id, emails } = body

    if (!community_id || !Array.isArray(emails) || emails.length === 0) {
      return Response.json({ error: 'community_id e emails são obrigatórios' }, { status: 400 })
    }

    const cleaned = emails
      .map(e => e.trim().toLowerCase())
      .filter(e => e.includes('@'))

    if (cleaned.length === 0) {
      return Response.json({ error: 'Nenhum email válido fornecido' }, { status: 400 })
    }

    const unique = [...new Set(cleaned)]

    const entries = unique.map(email => ({
      survey_id:      id,
      community_id,
      email,
      nome:           '',
      layers_user_id: null as string | null,
    }))

    const supabase = createServiceClient()

    // Upsert — ignora conflitos de (survey_id, community_id, email)
    const { data, error } = await supabase
      .from('survey_sample_lists')
      .upsert(entries, {
        onConflict:       'survey_id,community_id,email',
        ignoreDuplicates: true,
      })
      .select('id')

    if (error) {
      console.error('[sample-quick] upsert error:', error)
      return Response.json({ error: error.message }, { status: 500 })
    }

    const added = data?.length ?? 0
    const skipped_duplicates = unique.length - added

    return Response.json({ added, skipped_duplicates })
  } catch (err) {
    console.error('[sample-quick] error:', err)
    return Response.json(
      { error: err instanceof Error ? err.message : 'Erro desconhecido' },
      { status: 500 }
    )
  }
}
