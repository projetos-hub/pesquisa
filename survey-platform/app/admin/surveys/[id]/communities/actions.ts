'use server'

import { revalidatePath, revalidateTag } from 'next/cache'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { createServiceClient } from '@/lib/supabase-service'

async function requireAuth() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Não autorizado')
  return user
}

export async function saveCommunityTheme(
  surveyId: string,
  communityId: string,
  theme: {
    nomeEscola?: string
    primaryColor?: string
    secondaryColor?: string
    logo?: string
    indicacaoLink?: string
    welcomeMessage?: string
    thankyouMessage?: string
  }
): Promise<{ error?: string }> {
  try {
    await requireAuth()
  } catch {
    return { error: 'Não autorizado' }
  }

  if (!surveyId || !communityId) {
    return { error: 'Parâmetros inválidos' }
  }

  // Valida URL da logo (deve ser http/https ou vazia para limpar)
  if (theme.logo && !/^https?:\/\//i.test(theme.logo)) {
    return { error: 'URL da logo deve começar com https://' }
  }

  // Valida cores (hex format #RRGGBB)
  if (theme.primaryColor && !/^#[0-9A-F]{6}$/i.test(theme.primaryColor)) {
    return { error: 'Cor primária inválida' }
  }
  if (theme.secondaryColor && !/^#[0-9A-F]{6}$/i.test(theme.secondaryColor)) {
    return { error: 'Cor secundária inválida' }
  }

  const supabase = createServiceClient()

  // Lê o tema atual para fazer MERGE — evita sobrescrever campos não enviados
  // (ex: salvar cor primária não deve apagar indicacaoLink já cadastrado)
  const { data: current } = await supabase
    .from('survey_communities')
    .select('theme')
    .eq('survey_id', surveyId)
    .eq('community_id', communityId)
    .single()

  const existingTheme = (current?.theme ?? {}) as Record<string, unknown>

  // Aplica campos enviados sobre o tema existente
  const merged: Record<string, unknown> = { ...existingTheme }

  // Campos com valor: atualiza. Campo com '' explícito: remove (limpar).
  const fields = ['nomeEscola', 'primaryColor', 'secondaryColor', 'logo',
    'indicacaoLink', 'welcomeMessage', 'thankyouMessage'] as const
  for (const field of fields) {
    const val = theme[field]
    if (val === undefined) continue          // não enviado → preserva existente
    if (val === '') delete merged[field]     // string vazia → remove o campo
    else merged[field] = val                 // valor presente → atualiza
  }

  const { error } = await supabase
    .from('survey_communities')
    .update({ theme: merged })
    .eq('survey_id', surveyId)
    .eq('community_id', communityId)

  if (error) {
    console.error('[saveCommunityTheme] update error:', error)
    return { error: 'Erro ao salvar tema' }
  }

  revalidatePath(`/admin/surveys/${surveyId}/communities`)
  revalidateTag('survey-config', 'default')
  return {}
}

function calcStatus(open: string | null, close: string | null): string {
  const now = new Date()
  if (close && new Date(close) < now) return 'encerrada'
  if (open  && new Date(open)  > now) return 'nao_aberta'
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
    return { error: 'Não autorizado' }
  }

  if (!surveyId || !communityId) return { error: 'Parâmetros inválidos' }

  // Normaliza datetime-local (sem tz) para TIMESTAMPTZ com offset de Brasília
  const toTimestamptz = (v: string | null): string | null => {
    if (!v) return null
    // Se já tem offset (+/-HH:MM ou Z), usa como está
    if (/[Z+\-]\d{0,2}:?\d{0,2}$/.test(v)) return v
    // datetime-local: 'YYYY-MM-DDTHH:mm' → append '-03:00'
    return `${v}:00-03:00`
  }

  const open  = toTimestamptz(openDate)
  const close = toTimestamptz(closeDate)

  if (open && close && new Date(open) >= new Date(close)) {
    return { error: 'Data de abertura deve ser anterior ao encerramento' }
  }

  const supabase = createServiceClient()

  const updatePayload: Record<string, unknown> = {
    open_date:  open,
    close_date: close,
  }

  // Sempre recalcula status — se ambas as datas forem removidas, volta para 'ativa'
  updatePayload.status = (open || close) ? calcStatus(open, close) : 'ativa'

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

export async function inheritThemesFromPreviousSurvey(surveyId: string) {
  try {
    await requireAuth()
    if (!surveyId) return { error: 'Parâmetros inválidos' }

    const supabase = createServiceClient()

    const { data: communities } = await supabase
      .from('survey_communities')
      .select('community_id')
      .eq('survey_id', surveyId)

    if (!communities?.length) return { error: 'Nenhuma comunidade nesta pesquisa' }

    let updated = 0
    for (const { community_id } of communities) {
      const { data: recent } = await supabase
        .from('survey_communities')
        .select('theme')
        .eq('community_id', community_id)
        .neq('survey_id', surveyId)
        .not('theme', 'is', null)
        .order('id', { ascending: false })
        .limit(1)
        .single()

      if (recent?.theme && Object.keys(recent.theme as object).length > 0) {
        await supabase
          .from('survey_communities')
          .update({ theme: recent.theme })
          .eq('survey_id', surveyId)
          .eq('community_id', community_id)
        updated++
      }
    }

    revalidatePath(`/admin/surveys/${surveyId}/communities`)
    revalidateTag('survey-config', 'default')
    return { updated }
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erro desconhecido'
    console.error('[inheritThemesFromPreviousSurvey]', msg)
    return { error: msg }
  }
}
