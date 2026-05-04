// POST /api/admin/surveys/[id]/dispatch-manual
// Disparo rápido para lista manual de emails — para testes e casos pontuais.
// Resolve layers_user_id on-the-fly (sem usar survey_sample_lists).

import { z }                              from 'zod'
import { createServerSupabaseClient }     from '@/lib/supabase-server'
import { createServiceClient }            from '@/lib/supabase-service'
import { sendToOneCommunity, interpolatePlaceholders } from '@/lib/layers-notifications'
import { fetchLayersUserProfileByEmail }              from '@/lib/layers-hub'

const PORTAL_ALIAS = '@raizeducacao:pesquisa'

const Schema = z.object({
  community_id:       z.string().min(1),
  emails:             z.array(z.string().email()).min(1).max(50),
  title:              z.string().min(1).max(150),
  body:               z.string().min(1),
  channels:           z.array(z.enum(['pushNotification', 'email'])).min(1),
  roles:              z.array(z.enum(['guardian', 'student', 'admin'])).min(1),
  push_title:         z.string().max(150).optional().nullable(),
  push_body:          z.string().optional().nullable(),
  email_title:        z.string().max(150).optional().nullable(),
  email_body:         z.string().optional().nullable(),
  email_action_label: z.string().max(50).optional().nullable(),
})

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return Response.json({ error: 'Não autorizado' }, { status: 401 })

    const { id: surveyId } = await params
    const raw    = await request.json() as unknown
    const parsed = Schema.safeParse(raw)
    if (!parsed.success) {
      return Response.json({ error: 'Dados inválidos', details: parsed.error.flatten() }, { status: 400 })
    }

    const { community_id, emails, title, body, channels, roles,
            push_title, push_body, email_title, email_body, email_action_label } = parsed.data

    // Busca nomeEscola da tabela communities (fonte única de verdade)
    const serviceSupabase = createServiceClient()
    const { data: commRow } = await serviceSupabase
      .from('communities')
      .select('nome_escola')
      .eq('community_id', community_id)
      .maybeSingle()
    const nomeEscola = commRow?.nome_escola ?? ''

    // Processa cada email em paralelo (com limite de 10 simultâneos)
    const results: { email: string; status: 'sent' | 'not_found' | 'failed'; error?: string }[] = []

    const CONCURRENCY = 10
    for (let i = 0; i < emails.length; i += CONCURRENCY) {
      const batch = emails.slice(i, i + CONCURRENCY)
      const batchResults = await Promise.all(batch.map(async (email) => {
        // 1. Resolve userId + nome do usuário
        const profile = await fetchLayersUserProfileByEmail(community_id, email).catch(() => null)
        if (!profile) {
          return { email, status: 'not_found' as const }
        }

        // 2. Interpola placeholders com dados do usuário
        const firstName = profile.name
          ? profile.name.trim().split(/\s+/)[0]!.charAt(0).toUpperCase() +
            profile.name.trim().split(/\s+/)[0]!.slice(1).toLowerCase()
          : ''
        const vars = { nome: firstName, nomeAluno: '', nomeEscola, serie: '' }

        const resolvedTitle     = interpolatePlaceholders(push_title  ?? title,       vars)
        const resolvedBody      = interpolatePlaceholders(push_body   ?? body,        vars)
        const resolvedEmailTitle = interpolatePlaceholders(email_title ?? title,       vars)
        const resolvedEmailBody  = interpolatePlaceholders(email_body  ?? body,        vars)

        // 3. Monta payload direcionado ao usuário
        const payload = {
          targets: {
            topics: [{ kind: 'user' as const, id: profile.id }],
            roles,
          },
          title:  resolvedTitle,
          body:   resolvedBody,
          action: { type: 'portal' as const, portalAlias: PORTAL_ALIAS, path: '/' },
          ...(channels.length > 0 ? {
            channels: {
              ...(channels.includes('pushNotification') ? {
                pushNotification: { title: resolvedTitle, body: resolvedBody },
              } : {}),
              ...(channels.includes('email') ? {
                email: {
                  title:       resolvedEmailTitle,
                  body:        resolvedEmailBody,
                  actionLabel: email_action_label ?? 'Responder Pesquisa',
                },
              } : {}),
            },
          } : {}),
        }

        // 4. Envia
        const result = await sendToOneCommunity(community_id, payload)
        if (result.success) return { email, status: 'sent' as const }
        return { email, status: 'failed' as const, error: result.error }
      }))
      results.push(...batchResults)
    }

    const sent      = results.filter(r => r.status === 'sent').length
    const not_found = results.filter(r => r.status === 'not_found').length
    const failed    = results.filter(r => r.status === 'failed').length

    console.log(`[dispatch-manual] survey=${surveyId} community=${community_id} sent=${sent} not_found=${not_found} failed=${failed}`)

    return Response.json({ ok: true, sent, not_found, failed, results })
  } catch (err) {
    console.error('[dispatch-manual] error:', err)
    return Response.json({ error: 'Erro interno' }, { status: 500 })
  }
}
