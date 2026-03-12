import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { rowsToConfig } from '@/lib/survey-config'
import type { QuestionRow, OptionRow, InstallationRow } from '@/lib/survey-config'

interface RouteContext {
  params: Promise<{ slug: string }>
}

export async function GET(req: Request, { params }: RouteContext) {
  const { slug } = await params
  const { searchParams } = new URL(req.url)
  const communityId = (searchParams.get('communityId') ?? '').replace('@', '')

  // Anon client: RLS filtra automaticamente surveys com status != 'ativa'
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
    return NextResponse.json({ error: 'Survey not found' }, { status: 404 })
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
      return NextResponse.json({ error: 'Community not authorized' }, { status: 403 })
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
    return NextResponse.json({ error: 'Survey has no questions' }, { status: 404 })
  }

  // 4. Busca options de todas as questions de uma vez
  const questionIds = questions.map(q => q.id)
  const { data: options, error: optionsError } = await supabase
    .from('question_options')
    .select('question_id, order_index, label, value, section_key, section_title')
    .in('question_id', questionIds)
    .order('order_index')

  if (optionsError) {
    return NextResponse.json({ error: 'Failed to load options' }, { status: 500 })
  }

  const config = rowsToConfig(
    survey,
    questions as QuestionRow[],
    (options ?? []) as OptionRow[],
    installation
  )

  return NextResponse.json(config)
}
