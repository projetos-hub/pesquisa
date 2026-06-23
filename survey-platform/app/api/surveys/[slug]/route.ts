import { NextResponse } from 'next/server'
import { unstable_cache } from 'next/cache'
import { createClient } from '@supabase/supabase-js'
import { createServiceClient } from '@/lib/supabase-service'
import { rowsToConfig } from '@/lib/survey-config'
import type { QuestionRow, OptionRow, InstallationRow } from '@/lib/survey-config'

interface RouteContext {
  params: Promise<{ slug: string }>
}

// ── Função cacheada que busca a configuração da pesquisa ──────────────────────
// Cache por slug + communityId com TTL de 60s.
// Reduz 4 queries por acesso a 1 query por minuto.
const getCachedSurveyConfig = unstable_cache(
  async (slug: string, communityId: string) => {
    const anonClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
      { auth: { persistSession: false } }
    )
    // Com communityId: service client bypassa RLS para ler surveys não-ativas
    // (o controle de acesso é feito pela survey_communities.status)
    // Sem communityId: anon client + RLS garante apenas surveys 'ativa'
    const supabase = communityId ? createServiceClient() : anonClient

    // 1. Busca o template da pesquisa pelo slug
    //    - Sem communityId: RLS exige surveys.status = 'ativa' (controle global)
    //    - Com communityId: service client lê qualquer status; survey_communities.status controla acesso
    const baseQuery = supabase
      .from('surveys')
      .select('id, slug, title, survey_type, target_roles, status, settings, access_control, open_date, close_date')
      .eq('slug', slug)

    const { data: survey, error: surveyError } = await (
      communityId ? baseQuery : baseQuery.eq('status', 'ativa')
    ).single()

    if (surveyError || !survey) {
      return { error: 'Survey not found', status: 404, data: null }
    }

    // 2. Valida acesso via survey_communities (quando communityId é fornecido)
    //    A instalação por comunidade é a fonte de verdade de status quando communityId existe.
    let installation: InstallationRow | undefined
    if (communityId) {
      const { data: inst, error: instError } = await supabase
        .from('survey_communities')
        .select('status, open_date, close_date, theme, settings')
        .eq('survey_id', survey.id)
        .eq('community_id', communityId)
        .eq('active', true)
        .single()

      if (instError || !inst) {
        return { error: 'Community not authorized', status: 403, data: null }
      }

      installation = inst as InstallationRow

      // Tema: communities é fonte de verdade para logo/cores; survey_communities só
      // tem overrides per-survey (ex: indicacaoLink). Sempre mesclar nessa ordem.
      const { data: community } = await supabase
        .from('communities')
        .select('nome_escola, primary_color, secondary_color, logo')
        .eq('community_id', communityId)
        .maybeSingle()

      if (community) {
        const baseTheme = {
          nomeEscola:     community.nome_escola,
          primaryColor:   community.primary_color,
          secondaryColor: community.secondary_color,
          logo:           community.logo,
        }
        // Survey-level theme (settings.theme) serve como fallback padrão
        // Community-level theme (installation.theme) tem prioridade máxima
        const surveyTheme = (survey.settings as { theme?: Record<string, unknown> })?.theme ?? {}
        installation = {
          ...installation,
          theme: { ...baseTheme, ...surveyTheme, ...(installation.theme ?? {}) }
        }
      }
    }

    // 2b. Sem communityId: monta instalação sintética a partir das datas da survey
    //     Garante que open_date/close_date salvos no admin reflitam para o respondente
    //     Também propaga surveys.settings.theme para que thankyouMessage e outros overrides
    //     cheguem ao respondente mesmo sem communityId.
    if (!installation) {
      const now = new Date()
      let respondentStatus = survey.status ?? 'ativa'
      if (survey.close_date && new Date(survey.close_date) < now) {
        respondentStatus = 'encerrada'
      } else if (survey.open_date && new Date(survey.open_date) > now) {
        respondentStatus = 'nao_aberta'
      }
      const surveyTheme = (survey.settings as { theme?: Record<string, unknown> })?.theme ?? {}
      installation = {
        status: respondentStatus,
        open_date: survey.open_date as string | null,
        close_date: survey.close_date as string | null,
        theme: { ...surveyTheme },
        settings: {},
      } as InstallationRow
    }

    // 3. Busca questions ordenadas
    const { data: questions, error: questionsError } = await supabase
      .from('questions')
      .select('id, survey_id, order_index, type, key, title, description, required, only_for_roles, conditional_on, settings')
      .eq('survey_id', survey.id)
      .order('order_index')

    if (questionsError || !questions?.length) {
      return { error: 'Survey has no questions', status: 404, data: null }
    }

    // 4. Busca options de todas as questions de uma vez
    const questionIds = questions.map(q => q.id)
    const { data: options, error: optionsError } = await supabase
      .from('question_options')
      .select('question_id, order_index, label, value, section_key, section_title')
      .in('question_id', questionIds)
      .order('order_index')

    if (optionsError) {
      return { error: 'Failed to load options', status: 500, data: null }
    }

    const config = rowsToConfig(
      survey,
      questions as QuestionRow[],
      (options ?? []) as OptionRow[],
      installation
    )

    return { error: null, status: 200, data: config, surveyId: survey.id, accessControl: survey.access_control }
  },
  ['survey-config'],
  { revalidate: 60, tags: ['survey-config'] }
)

export async function GET(req: Request, { params }: RouteContext) {
  const { slug } = await params
  const { searchParams } = new URL(req.url)
  // Sanitiza communityId: apenas alfanumérico + hífen + underscore, max 64 chars
  // Evita cache poisoning via communityIds aleatórios acumulando memória no cache
  const communityId = (searchParams.get('communityId') ?? '')
    .replace('@', '')
    .replace(/[^a-z0-9_\-]/gi, '')
    .slice(0, 64)
  const email = searchParams.get('email')

  const result = await getCachedSurveyConfig(slug, communityId)

  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: result.status })
  }

  // Validar email na amostra se survey possui segmentação (access_control = 'amostra')
  if (result.accessControl === 'amostra') {
    const supabase = createServiceClient()

    if (!communityId) {
      return NextResponse.json(
        { error: 'community_required', message: 'Comunidade obrigatoria para pesquisa segmentada' },
        { status: 403 }
      )
    }

    if (!email) {
      return NextResponse.json(
        { error: 'not_in_sample', message: 'Email não fornecido para pesquisa segmentada' },
        { status: 403 }
      )
    }

    const { data: userInSample } = await supabase
      .from('survey_sample_lists')
      .select('id')
      .eq('survey_id', result.surveyId!)
      .eq('community_id', communityId)
      .eq('email', email.toLowerCase())
      .limit(1)

    if (!userInSample || userInSample.length === 0) {
      return NextResponse.json(
        { error: 'not_in_sample', message: 'Você não está na amostra desta pesquisa' },
        { status: 403 }
      )
    }
  }

  return NextResponse.json(result.data)
}
