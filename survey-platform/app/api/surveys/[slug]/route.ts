import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { rowsToConfig } from '@/lib/survey-config'
import type { QuestionRow, OptionRow } from '@/lib/survey-config'

interface RouteContext {
  params: Promise<{ slug: string }>
}

export async function GET(_req: Request, { params }: RouteContext) {
  const { slug } = await params

  // Anon client: RLS filtra automaticamente surveys com status != 'ativa'
  // Não usar service client aqui — leitura pública não precisa contornar RLS
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } }
  )

  // 1. Busca survey ativa pelo slug
  const { data: survey, error: surveyError } = await supabase
    .from('surveys')
    .select('id, slug, title, survey_type, target_roles, status')
    .eq('slug', slug)
    .eq('status', 'ativa')
    .single()

  if (surveyError || !survey) {
    return NextResponse.json({ error: 'Survey not found' }, { status: 404 })
  }

  // 2. Busca questions ordenadas
  const { data: questions, error: questionsError } = await supabase
    .from('questions')
    .select('id, survey_id, order_index, type, key, title, description, required, only_for_roles, conditional_on, settings')
    .eq('survey_id', survey.id)
    .order('order_index')

  if (questionsError || !questions?.length) {
    return NextResponse.json({ error: 'Survey has no questions' }, { status: 404 })
  }

  // 3. Busca options de todas as questions de uma vez
  const questionIds = questions.map(q => q.id)
  const { data: options, error: optionsError } = await supabase
    .from('question_options')
    .select('question_id, order_index, label, value, section_key, section_title')
    .in('question_id', questionIds)
    .order('order_index')

  if (optionsError) {
    return NextResponse.json({ error: 'Failed to load options' }, { status: 500 })
  }

  const config = rowsToConfig(survey, questions as QuestionRow[], (options ?? []) as OptionRow[])

  return NextResponse.json(config)
}
