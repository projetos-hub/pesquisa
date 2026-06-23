import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'

export const E2E_COMMUNITY_ID = 'raizeducacao'
export const E2E_PREFIX = 'e2e-qa'
export const STATE_FILE = path.join(__dirname, '../../.auth/test-state.json')

export interface SurveyFixture {
  surveyId: string
  slug: string
}

export function serviceDb(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required for E2E data setup')
  }
  return createClient(url, key, { auth: { persistSession: false } })
}

export function readState(): Record<string, string> {
  if (!fs.existsSync(STATE_FILE)) return {}
  return JSON.parse(fs.readFileSync(STATE_FILE, 'utf-8')) as Record<string, string>
}

export function writeState(data: Record<string, string>) {
  const dir = path.dirname(STATE_FILE)
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  fs.writeFileSync(STATE_FILE, JSON.stringify({ ...readState(), ...data }, null, 2))
}

export async function cleanupE2ESurveys(db = serviceDb()) {
  const { data: surveys, error } = await db
    .from('surveys')
    .select('id')
    .like('slug', `${E2E_PREFIX}-%`)

  if (error) throw new Error(`Failed to list E2E surveys: ${error.message}`)
  const ids = (surveys ?? []).map((row: { id: string }) => row.id)
  if (ids.length === 0) return

  await db.from('response_sessions').delete().in('survey_id', ids)
  await db.from('surveys').delete().in('id', ids)
}

export async function cleanupSurveyFixtures(slugs: string[], db = serviceDb()) {
  const fullSlugs = slugs.map(slug => `${E2E_PREFIX}-${slug}`)
  const { data: surveys, error } = await db
    .from('surveys')
    .select('id')
    .in('slug', fullSlugs)

  if (error) throw new Error(`Failed to list E2E fixture surveys: ${error.message}`)
  const ids = (surveys ?? []).map((row: { id: string }) => row.id)
  if (ids.length === 0) return

  await db.from('response_sessions').delete().in('survey_id', ids)
  await db.from('surveys').delete().in('id', ids)
}

export async function createSurveyFixture(options: {
  slug: string
  title: string
  accessControl?: 'aberta' | 'amostra'
  status?: 'ativa' | 'rascunho' | 'pausada' | 'encerrada'
  targetRoles?: string[]
  bilingualNps?: boolean
}, db = serviceDb()): Promise<SurveyFixture> {
  const slug = `${E2E_PREFIX}-${options.slug}`

  await db.from('surveys').delete().eq('slug', slug)

  const { data: survey, error: surveyError } = await db
    .from('surveys')
    .insert({
      title: options.title,
      slug,
      survey_type: 'quantitativa',
      status: options.status ?? 'ativa',
      target_roles: options.targetRoles ?? ['responsavel'],
      access_control: options.accessControl ?? 'aberta',
      settings: {
        allow_all_roles: true,
        theme: {
          nomeEscola: 'Raiz Educacao E2E',
          thankyouMessage: 'Obrigado pelo teste E2E.',
        },
      },
    })
    .select('id, slug')
    .single()

  if (surveyError || !survey) {
    throw new Error(`Failed to create E2E survey: ${surveyError?.message}`)
  }

  const { error: installError } = await db.from('survey_communities').insert({
    survey_id: survey.id,
    community_id: E2E_COMMUNITY_ID,
    status: 'ativa',
    active: true,
    theme: { nomeEscola: 'Raiz Educacao E2E' },
  })
  if (installError) throw new Error(`Failed to install E2E community: ${installError.message}`)

  const { data: questions, error: questionsError } = await db
    .from('questions')
    .insert([
      {
        survey_id: survey.id,
        order_index: 0,
        type: 'welcome',
        key: 'welcome',
        title: 'Boas-vindas E2E',
        required: false,
        settings: {},
      },
      {
        survey_id: survey.id,
        order_index: 1,
        type: 'nps',
        key: 'nps',
        title: 'Quanto voce recomenda a escola?',
        required: true,
        settings: { perguntaBilingue: options.bilingualNps ?? false },
      },
      {
        survey_id: survey.id,
        order_index: 2,
        type: 'scale',
        key: 'pedagogico',
        title: 'Pedagogico',
        required: true,
        settings: {},
      },
      {
        survey_id: survey.id,
        order_index: 3,
        type: 'thankyou',
        key: 'thankyou',
        title: 'Obrigado',
        required: false,
        settings: {},
      },
    ])
    .select('id, key')

  if (questionsError || !questions) {
    throw new Error(`Failed to create E2E questions: ${questionsError?.message}`)
  }

  const scaleQuestion = questions.find((question: { key: string }) => question.key === 'pedagogico')
  if (!scaleQuestion) throw new Error('Failed to create E2E scale question')

  const { error: optionsError } = await db.from('question_options').insert([
    { question_id: scaleQuestion.id, order_index: 0, label: 'Clareza das aulas', value: 'opt_0' },
    { question_id: scaleQuestion.id, order_index: 1, label: 'Atendimento da escola', value: 'opt_1' },
  ])
  if (optionsError) throw new Error(`Failed to create E2E options: ${optionsError.message}`)

  return { surveyId: survey.id, slug: survey.slug }
}

export function submitAnswers() {
  return {
    nps: { nps: 10, participa_bilingue: 'Nao' },
    pedagogico: { 0: 5, 1: 4 },
  }
}
