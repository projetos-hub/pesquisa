import { createServerSupabaseClient } from '@/lib/supabase-server'
import { createServiceClient } from '@/lib/supabase-service'
import { read, utils } from 'xlsx'
import { resolveCommunityId } from '@/lib/community-mapping'
import { fetchLayersUserByEmail } from '@/lib/layers-hub'

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

    // Parse Excel
    const buffer = await file.arrayBuffer()
    const workbook = read(buffer)
    const sheet = workbook.Sheets[workbook.SheetNames[0]]
    const rows = utils.sheet_to_json(sheet) as Record<string, any>[]

    if (rows.length === 0) {
      return Response.json({ error: 'Empty sheet' }, { status: 400 })
    }

    // Preparar entradas para inserção
    const entries: Array<{
      survey_id: string
      community_id: string
      email: string
      nome: string
      layers_user_id: string | null
    }> = []

    const supabase = createServiceClient()

    // Para cada linha, extrair 3 emails e resolver community_id
    for (const row of rows) {
      const nome = row.NOME || ''
      const nomefantasia = row.NOMEFANTASIA || ''
      const emails = [
        row['EMAIL INSTITUCIONAL'],
        row['EMAIL RESP FIN'],
        row['EMAIL RESP ACAD'],
      ].filter(Boolean) as string[]

      if (!nome || !nomefantasia || emails.length === 0) {
        continue // Skip linhas incompletas
      }

      const communityId = resolveCommunityId(nomefantasia)
      if (!communityId) {
        console.warn(`[sample-upload] Community não encontrado para: ${nomefantasia}`)
        continue // Skip escolas não mapeadas
      }

      // Para cada email, resolver layers_user_id
      for (const email of emails) {
        let layersUserId: string | null = null

        try {
          layersUserId = await fetchLayersUserByEmail(communityId, email)
        } catch (err) {
          console.warn(`[sample-upload] Erro ao buscar layers_user_id para ${email}:`, err)
        }

        entries.push({
          survey_id: id,
          community_id: communityId,
          email: email.toLowerCase(),
          nome,
          layers_user_id: layersUserId,
        })
      }
    }

    if (entries.length === 0) {
      return Response.json({ error: 'No valid entries found' }, { status: 400 })
    }

    // Limpar amostra antiga (DELETE all para essa survey)
    await supabase
      .from('survey_sample_lists')
      .delete()
      .eq('survey_id', id)

    // INSERT em batch com UPSERT
    const { error } = await supabase
      .from('survey_sample_lists')
      .upsert(entries, {
        onConflict: 'survey_id,community_id,email',
        ignoreDuplicates: false,
      })

    if (error) {
      console.error('[sample-upload] Insert error:', error)
      return Response.json({ error: 'Failed to save sample' }, { status: 500 })
    }

    const resolvedCount = entries.filter(e => e.layers_user_id).length

    return Response.json({
      total_entries: entries.length,
      resolved_layers_ids: resolvedCount,
      message: `Amostra salva: ${entries.length} entradas, ${resolvedCount} IDs resolvidos`,
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

    const supabase = createServiceClient()

    const { data } = await supabase
      .from('survey_sample_lists')
      .select('*')
      .eq('survey_id', id)
      .order('community_id, email')

    // Agrupar por community
    const byCommunity: Record<string, any[]> = {}
    data?.forEach(entry => {
      if (!byCommunity[entry.community_id]) {
        byCommunity[entry.community_id] = []
      }
      byCommunity[entry.community_id].push({
        email: entry.email,
        nome: entry.nome,
        layers_user_id: entry.layers_user_id,
        created_at: entry.created_at,
      })
    })

    const totalEntries = data?.length || 0
    const schools = Object.keys(byCommunity).length
    const resolved = data?.filter(e => e.layers_user_id).length || 0

    return Response.json({
      by_community: byCommunity,
      totals: {
        total_entries: totalEntries,
        schools,
        resolved,
      },
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
