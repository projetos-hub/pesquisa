import { NextResponse } from 'next/server'
import { unstable_cache } from 'next/cache'
import { createClient } from '@supabase/supabase-js'
import { rowsToConfig } from '@/lib/survey-config'
import type { QuestionRow, OptionRow, InstallationRow } from '@/lib/survey-config'

interface RouteContext {
  params: Promise<{ slug: string }>
}

// ── Função cacheada que busca a configuração da pesquisa ──────────────────────
// Cache por slug + communityId com TTL de 5 minutos (300s).
// Reduz 4 queries por acesso a 1 query a cada 5 minutos.
const getCachedSurveyConfig = unstable_cache(
  async (slug: string, communityId: string) => {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { auth: { persistSession: false } }
    )

    // 1. Busca o template da pesquisa pelo slug (status 'ativa' garantido pelo RLS)
    const { data: survey, error: surveyError } = await supabase
      .from('surveys')
      .select('id, slug, title, survey_type, target_roles, status, settings')
      .eq('slug', slug)
      .eq('status', 'ativa')
      .single()

    if (surveyError || !survey) {
      return { error: 'Survey not found', status: 404, data: null }
    }

    // 2. Valida acesso via survey_communities (quando communityId é fornecido)
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

    return { error: null, status: 200, data: config }
  },
  ['survey-config'], // Identificador do cache
  { revalidate: 300 } // 5 minutos = 300 segundos
)

export async function GET(req: Request, { params }: RouteContext) {
  const { slug } = await params
  const { searchParams } = new URL(req.url)
  const communityId = (searchParams.get('communityId') ?? '').replace('@', '')

  const result = await getCachedSurveyConfig(slug, communityId)

  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: result.status })
  }

  return NextResponse.json(result.data)
}
