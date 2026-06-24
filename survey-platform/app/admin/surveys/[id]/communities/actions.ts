'use server'

import { revalidatePath, revalidateTag } from 'next/cache'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { createServiceClient } from '@/lib/supabase-service'

async function requireAuth() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Nao autorizado')
  return user
}

function calcStatus(open: string | null, close: string | null): string {
  const now = new Date()
  if (close && new Date(close) < now) return 'encerrada'
  if (open && new Date(open) > now) return 'nao_aberta'
  return 'ativa'
}

export async function updateCommunityDates(
  surveyId: string,
  communityId: string,
  openDate: string | null,
  closeDate: string | null,
): Promise<{ error?: string }> {
  try {
    await requireAuth()
  } catch {
    return { error: 'Nao autorizado' }
  }

  if (!surveyId || !communityId) return { error: 'Parametros invalidos' }

  const toTimestamptz = (v: string | null): string | null => {
    if (!v) return null
    if (/[Z+\-]\d{0,2}:?\d{0,2}$/.test(v)) return v
    return `${v}:00-03:00`
  }

  const open = toTimestamptz(openDate)
  const close = toTimestamptz(closeDate)

  if (open && close && new Date(open) >= new Date(close)) {
    return { error: 'Data de abertura deve ser anterior ao encerramento' }
  }

  const supabase = createServiceClient()
  const updatePayload: Record<string, unknown> = {
    open_date: open,
    close_date: close,
    status: (open || close) ? calcStatus(open, close) : 'ativa',
  }

  const { error } = await supabase
    .from('survey_communities')
    .update(updatePayload)
    .eq('survey_id', surveyId)
    .eq('community_id', communityId)

  if (error) return { error: error.message }

  revalidatePath(`/admin/surveys/${surveyId}/communities`)
  revalidateTag('survey-config', 'default')
  return {}
}
