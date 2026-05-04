// POST /api/admin/surveys/[id]/sample/resolve
// Resolve layers_user_id para entradas ainda null (em lotes de 50)
// Idempotente — pode ser chamado várias vezes até completar

import { createServerSupabaseClient } from '@/lib/supabase-server'
import { createServiceClient }        from '@/lib/supabase-service'
import { fetchLayersUserProfileByEmail } from '@/lib/layers-hub'

async function requireAuth() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authorized')
}

const BATCH_SIZE  = 500  // por chamada ao endpoint
const CONCURRENCY = 20   // chamadas Layers em paralelo

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireAuth()
    const { id } = await params
    const supabase = createServiceClient()

    // Busca próximo lote de entradas sem layers_user_id
    // Processa apenas entradas ainda não processadas (null)
    // NOT_FOUND = já processado, não retenta automaticamente
    const { data: pending } = await supabase
      .from('survey_sample_lists')
      .select('id, community_id, email')
      .eq('survey_id', id)
      .is('layers_user_id', null)
      .limit(BATCH_SIZE)

    if (!pending || pending.length === 0) {
      return Response.json({ ok: true, resolved: 0, remaining: 0, done: true })
    }

    let resolved = 0
    let failed   = 0

    // Resolve em paralelo (janelas de CONCURRENCY)
    for (let i = 0; i < pending.length; i += CONCURRENCY) {
      const window = pending.slice(i, i + CONCURRENCY)
      await Promise.all(window.map(async (entry) => {
        const profile = await fetchLayersUserProfileByEmail(entry.community_id, entry.email).catch(() => null)
        if (profile) {
          await supabase
            .from('survey_sample_lists')
            .update({
              layers_user_id: profile.id,
              ...(profile.name   ? { nome:   profile.name }   : {}),
              ...(profile.perfil ? { perfil: profile.perfil } : {}),
            })
            .eq('id', entry.id)
          resolved++
        } else {
          // Marca com string especial para não reprocessar indefinidamente
          await supabase
            .from('survey_sample_lists')
            .update({ layers_user_id: 'NOT_FOUND' })
            .eq('id', entry.id)
          failed++
        }
      }))
    }

    // Conta quantos ainda faltam
    // "remaining" conta só NULL — NOT_FOUND = processado (não retenta)
    const { count: remaining } = await supabase
      .from('survey_sample_lists')
      .select('*', { count: 'exact', head: true })
      .eq('survey_id', id)
      .is('layers_user_id', null)

    return Response.json({
      ok:        true,
      resolved,
      failed,
      remaining: remaining ?? 0,
      done:      (remaining ?? 0) === 0,
    })
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: err instanceof Error && err.message === 'Not authorized' ? 401 : 500 },
    )
  }
}
