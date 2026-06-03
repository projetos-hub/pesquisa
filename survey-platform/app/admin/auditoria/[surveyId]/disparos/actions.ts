'use server'

import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { createServiceClient } from '@/lib/supabase-service'

async function requireAuth() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Não autorizado')
  return user
}

const CreateBroadcastSchema = z.object({
  survey_id:     z.string().uuid(),
  fired_at:      z.string().min(1, 'Data/hora obrigatória'),
  channel:       z.enum(['layers', 'whatsapp', 'email', 'outro']),
  community_ids: z.array(z.string()).default([]),
  notes:         z.string().max(500).optional(),
})

export async function createBroadcast(
  formData: FormData
): Promise<{ error?: string; ok?: boolean }> {
  let user
  try {
    user = await requireAuth()
  } catch {
    return { error: 'Não autorizado' }
  }

  const raw = {
    survey_id:     formData.get('survey_id') as string,
    fired_at:      formData.get('fired_at') as string,
    channel:       formData.get('channel') as string,
    community_ids: formData.getAll('community_ids') as string[],
    notes:         (formData.get('notes') as string) || undefined,
  }

  const parsed = CreateBroadcastSchema.safeParse(raw)
  if (!parsed.success) {
    const firstError = parsed.error.issues[0]?.message ?? 'Dados inválidos'
    return { error: firstError }
  }

  const { survey_id, fired_at, channel, community_ids, notes } = parsed.data

  // Converte datetime-local para ISO 8601
  let firedAtIso: string
  try {
    firedAtIso = new Date(fired_at).toISOString()
  } catch {
    return { error: 'Data/hora inválida' }
  }

  const db = createServiceClient()

  const { error } = await db
    .from('audit_broadcasts')
    .insert({
      survey_id,
      fired_at:      firedAtIso,
      fired_by:      user.id,
      channel,
      community_ids,
      notes:         notes ?? null,
    })

  if (error) {
    return { error: 'Erro ao registrar disparo: ' + error.message }
  }

  revalidatePath(`/admin/auditoria/${survey_id}`)
  return { ok: true }
}
