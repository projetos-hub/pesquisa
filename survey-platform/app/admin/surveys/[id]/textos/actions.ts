'use server'

import { revalidatePath, revalidateTag } from 'next/cache'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { createServiceClient } from '@/lib/supabase-service'
import type { SurveyContentOverrides } from '@/lib/survey-config'

interface TextOverridePayload {
  title?: string
  description?: string
  pergunta?: string
  thankyouMessage?: string
}

async function requireAuth() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Nao autorizado')
  return user
}

function cleanText(value: string | undefined): string | undefined {
  const clean = value?.trim()
  return clean ? clean : undefined
}

function pruneContentOverrides(settings: Record<string, unknown>) {
  const overrides = settings.contentOverrides as SurveyContentOverrides | undefined
  if (!overrides) return settings

  const hasQuestions = overrides.questions && Object.keys(overrides.questions).length > 0
  const hasThankyou = !!overrides.thankyou?.message
  if (hasQuestions || hasThankyou) return settings

  const next = { ...settings }
  delete next.contentOverrides
  return next
}

export async function saveCommunityTextOverride(
  surveyId: string,
  communityId: string,
  itemKey: string,
  payload: TextOverridePayload,
): Promise<{ error?: string }> {
  try {
    await requireAuth()
  } catch {
    return { error: 'Nao autorizado' }
  }

  if (!surveyId || !communityId || !itemKey) return { error: 'Parametros invalidos' }

  const supabase = createServiceClient()
  const { data: row, error: readError } = await supabase
    .from('survey_communities')
    .select('settings')
    .eq('survey_id', surveyId)
    .eq('community_id', communityId)
    .single()

  if (readError || !row) return { error: readError?.message ?? 'Comunidade nao encontrada' }

  const settings = { ...((row.settings ?? {}) as Record<string, unknown>) }
  const contentOverrides: SurveyContentOverrides = {
    ...((settings.contentOverrides ?? {}) as SurveyContentOverrides),
  }

  if (itemKey === '__thankyou') {
    const message = cleanText(payload.thankyouMessage)
    if (message) {
      contentOverrides.thankyou = { message }
    } else {
      delete contentOverrides.thankyou
    }
  } else {
    const nextQuestion = {
      ...(cleanText(payload.title) ? { title: cleanText(payload.title) } : {}),
      ...(cleanText(payload.description) ? { description: cleanText(payload.description) } : {}),
      ...(cleanText(payload.pergunta) ? { pergunta: cleanText(payload.pergunta) } : {}),
    }

    contentOverrides.questions = { ...(contentOverrides.questions ?? {}) }
    if (Object.keys(nextQuestion).length > 0) {
      contentOverrides.questions[itemKey] = nextQuestion
    } else {
      delete contentOverrides.questions[itemKey]
    }
    if (Object.keys(contentOverrides.questions).length === 0) {
      delete contentOverrides.questions
    }
  }

  const nextSettings = pruneContentOverrides({ ...settings, contentOverrides })

  const { error } = await supabase
    .from('survey_communities')
    .update({ settings: nextSettings })
    .eq('survey_id', surveyId)
    .eq('community_id', communityId)

  if (error) return { error: error.message }

  revalidatePath(`/admin/surveys/${surveyId}/textos`)
  revalidateTag('survey-config', 'default')
  return {}
}