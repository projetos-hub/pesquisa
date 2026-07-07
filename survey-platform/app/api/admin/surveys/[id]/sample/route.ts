import { createServerSupabaseClient } from '@/lib/supabase-server'
import { createServiceClient } from '@/lib/supabase-service'
import { read, utils } from 'xlsx'
import { resolveCommunityId } from '@/lib/community-mapping'
import { extractSampleExcelRow, isSampleEmailMode } from '@/lib/sample-excel'

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

    const formData = await req.formData()
    const file = formData.get('file') as File
    if (!file) {
      return Response.json({ error: 'No file provided' }, { status: 400 })
    }

    const emailModeValue = formData.get('emailMode') ?? 'all'
    if (!isSampleEmailMode(emailModeValue)) {
      return Response.json({ error: 'Invalid email mode' }, { status: 400 })
    }

    const buffer = await file.arrayBuffer()
    const workbook = read(buffer, { type: 'array' })
    const sheet = workbook.Sheets[workbook.SheetNames[0]]
    const rows = utils.sheet_to_json(sheet) as Record<string, unknown>[]

    if (rows.length === 0) {
      return Response.json({ error: 'Empty sheet' }, { status: 400 })
    }

    const entries: Array<{
      survey_id: string
      community_id: string
      email: string
      nome: string
      layers_user_id: string | null
    }> = []

    const supabase = createServiceClient()

    const skipped = { sem_email: 0, sem_community: 0, community_map: {} as Record<string, number> }

    for (const row of rows) {
      const { nome, nomefantasia, emails } = extractSampleExcelRow(row, emailModeValue)

      if (emails.length === 0) {
        skipped.sem_email++
        continue
      }

      const communityId = nomefantasia ? resolveCommunityId(nomefantasia) : null
      if (!communityId) {
        skipped.sem_community++
        const key = nomefantasia || '(vazio)'
        skipped.community_map[key] = (skipped.community_map[key] || 0) + 1
        continue
      }

      for (const email of emails) {
        entries.push({
          survey_id:      id,
          community_id:   communityId,
          email:          email.toLowerCase(),
          nome,
          layers_user_id: null,
        })
      }
    }

    if (entries.length === 0) {
      return Response.json({ error: 'No valid entries found' }, { status: 400 })
    }

    const seen = new Set<string>()
    const unique = entries.filter(e => {
      const key = `${e.community_id}::${e.email}`
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })

    console.log(`[sample-upload] ${entries.length} entradas -> ${unique.length} unicas para survey ${id}`)

    const { error: delErr } = await supabase
      .from('survey_sample_lists')
      .delete()
      .eq('survey_id', id)

    if (delErr) {
      console.error('[sample-upload] Delete error:', delErr)
      return Response.json({ error: `Erro ao limpar amostra anterior: ${delErr.message}` }, { status: 500 })
    }

    const BATCH_SIZE = 100
    for (let i = 0; i < unique.length; i += BATCH_SIZE) {
      const batch = unique.slice(i, i + BATCH_SIZE)
      const { error: insertErr } = await supabase
        .from('survey_sample_lists')
        .insert(batch)

      if (insertErr) {
        console.error(`[sample-upload] Insert error (lote ${i}):`, insertErr)
        return Response.json({ error: `Erro ao salvar lote ${i}: ${insertErr.message}` }, { status: 500 })
      }
    }

    const resolvedCount = unique.filter(e => e.layers_user_id).length

    const topUnmapped = Object.entries(skipped.community_map)
      .sort(([,a],[,b]) => b - a).slice(0, 10)
      .map(([nome, count]) => `${nome} (${count} linhas)`)

    return Response.json({
      total_entries:       unique.length,
      resolved_layers_ids: resolvedCount,
      diagnostico: {
        total_linhas_excel:          rows.length,
        entradas_antes_dedup:        entries.length,
        duplicatas_removidas:        entries.length - unique.length,
        descartadas_sem_email:       skipped.sem_email,
        descartadas_sem_community:   skipped.sem_community,
        nomefantasia_nao_mapeados:   topUnmapped,
        modo_emails:                 emailModeValue,
      },
    })
  } catch (err) {
    console.error('[sample-upload] Error:', err)
    return Response.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAuth()
    const { id } = await params
    const url = new URL(req.url)
    const page = Number(url.searchParams.get('page') ?? 0)
    const limit = Math.min(Number(url.searchParams.get('limit') ?? 200), 500)
    const filter = url.searchParams.get('filter') ?? 'all'

    const supabase = createServiceClient()

    const [
      { count: total },
      { count: resolved },
      { count: notFound },
      { count: pending },
    ] = await Promise.all([
      supabase.from('survey_sample_lists').select('*', { count: 'exact', head: true }).eq('survey_id', id),
      supabase.from('survey_sample_lists').select('*', { count: 'exact', head: true }).eq('survey_id', id).not('layers_user_id', 'is', null).neq('layers_user_id', 'NOT_FOUND'),
      supabase.from('survey_sample_lists').select('*', { count: 'exact', head: true }).eq('survey_id', id).eq('layers_user_id', 'NOT_FOUND'),
      supabase.from('survey_sample_lists').select('*', { count: 'exact', head: true }).eq('survey_id', id).is('layers_user_id', null),
    ])

    let query = supabase
      .from('survey_sample_lists')
      .select('id, community_id, email, nome, layers_user_id, created_at')
      .eq('survey_id', id)
      .order('community_id, email')
      .range(page * limit, (page + 1) * limit - 1)

    if (filter === 'resolved') query = query.not('layers_user_id', 'is', null).neq('layers_user_id', 'NOT_FOUND')
    if (filter === 'not_found') query = query.eq('layers_user_id', 'NOT_FOUND')
    if (filter === 'pending') query = query.is('layers_user_id', null)

    const { data: entries } = await query

    return Response.json({
      totals: {
        total:     total     ?? 0,
        resolved:  resolved  ?? 0,
        not_found: notFound  ?? 0,
        pending:   pending   ?? 0,
      },
      entries:   entries ?? [],
      page,
      limit,
      has_more:  (page + 1) * limit < (
        filter === 'resolved'  ? (resolved  ?? 0) :
        filter === 'not_found' ? (notFound  ?? 0) :
        filter === 'pending'   ? (pending   ?? 0) :
        (total ?? 0)
      ),
    })
  } catch (err) {
    console.error('[sample-get] Error:', err)
    return Response.json({ error: 'Unauthorized' }, { status: 403 })
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAuth()
    const { id } = await params

    const supabase = createServiceClient()

    const { error } = await supabase
      .from('survey_sample_lists')
      .delete()
      .eq('survey_id', id)

    if (error) {
      return Response.json({ error: 'Failed to delete' }, { status: 500 })
    }

    return Response.json({ message: 'Sample cleared' })
  } catch (err) {
    console.error('[sample-delete] Error:', err)
    return Response.json({ error: 'Unauthorized' }, { status: 403 })
  }
}
