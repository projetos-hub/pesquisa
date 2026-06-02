'use server'

import { revalidatePath } from 'next/cache'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { createServiceClient } from '@/lib/supabase-service'
import { sendNotification } from '@/lib/layers-api'

async function requireAuth() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Não autorizado')
  return user
}

export async function createDisparo(
  surveyId: string,
  formData: FormData
): Promise<{ error?: string; ok?: boolean }> {
  let user
  try { user = await requireAuth() } catch { return { error: 'Não autorizado' } }

  const communityIds = formData.getAll('community_ids') as string[]
  const targetRoles  = formData.getAll('target_roles') as string[]
  const channel      = formData.get('channel') as string || 'push_email'
  const scheduledAt  = formData.get('scheduled_at') as string || null
  const surveySlug   = formData.get('survey_slug') as string
  const surveyTitle  = formData.get('survey_title') as string

  if (!communityIds.length) return { error: 'Selecione ao menos uma comunidade' }
  if (!targetRoles.length)  return { error: 'Selecione ao menos um perfil' }

  const supabase = createServiceClient()

  // Monta targets para a Layers API
  // community_ids vazio = todas; senão, um target por comunidade
  const targets = communityIds.length > 0
    ? communityIds.map(cId => ({
        kind: 'group' as const,
        alias: cId,
        roles: targetRoles,
      }))
    : [{ kind: 'group' as const, alias: 'all', roles: targetRoles }]

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://pesquisa-nu-sand.vercel.app'
  const surveyUrl = `${appUrl}/p/${surveySlug}`

  const notificationTitle = `Pesquisa de Satisfação — ${surveyTitle}`
  const notificationBody  = 'Sua opinião é muito importante. Responda em menos de 2 minutos.'

  // Layers API v2 espera channels como objeto, não array de strings
  const buildChannels = () => {
    const usePush  = channel === 'push_email' || channel === 'push'
    const useEmail = channel === 'push_email' || channel === 'email'
    return {
      ...(usePush  ? { pushNotification: { title: notificationTitle, body: notificationBody } } : {}),
      ...(useEmail ? { email: { title: notificationTitle, body: notificationBody, actionLabel: 'Ver pesquisa' } } : {}),
    }
  }

  const payload = {
    title:       notificationTitle,
    description: notificationBody,
    targets,
    action: { type: 'external' as const, url: surveyUrl },
    ...(scheduledAt ? { scheduleDate: new Date(scheduledAt).toISOString() } : {}),
    channels: buildChannels(),
  }

  // Registra o broadcast antes de tentar enviar
  const { data: broadcast, error: broadcastError } = await supabase
    .from('survey_broadcasts')
    .insert({
      survey_id:     surveyId,
      community_ids: communityIds,
      target_roles:  targetRoles,
      channel,
      scheduled_at:  scheduledAt || null,
      dispatched_by: user.email,
      status:        scheduledAt ? 'scheduled' : 'pending',
    })
    .select('id')
    .single()

  if (broadcastError || !broadcast) {
    return { error: 'Erro ao registrar disparo' }
  }

  // Se agendado, não dispara agora
  if (scheduledAt) {
    revalidatePath(`/admin/surveys/${surveyId}`)
    return { ok: true }
  }

  // Dispara — cada communityId tem token diferente, itera
  let totalSent = 0
  let lastError = ''

  for (const commId of communityIds) {
    const commTargets = targets.filter(t => t.alias === commId)
    try {
      const { ok, response } = await sendNotification(commId, { ...payload, targets: commTargets })
      if (ok) totalSent++
      else lastError = JSON.stringify(response)
    } catch (e) {
      lastError = e instanceof Error ? e.message : 'unknown'
    }
  }

  // Atualiza status do broadcast
  await supabase
    .from('survey_broadcasts')
    .update({
      status:          totalSent > 0 ? 'sent' : 'failed',
      dispatched_at:   new Date().toISOString(),
      recipient_count: totalSent,
      error_message:   lastError || null,
    })
    .eq('id', broadcast.id)

  revalidatePath(`/admin/surveys/${surveyId}`)
  return totalSent > 0 ? { ok: true } : { error: `Falha no envio: ${lastError}` }
}

export async function getBroadcasts(surveyId: string) {
  const supabase = await createServerSupabaseClient()
  const { data } = await supabase
    .from('survey_broadcasts')
    .select('id, community_ids, target_roles, channel, scheduled_at, dispatched_at, dispatched_by, status, recipient_count, error_message, created_at')
    .eq('survey_id', surveyId)
    .order('created_at', { ascending: false })
  return data ?? []
}
