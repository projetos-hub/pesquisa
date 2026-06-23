/**
 * lib/report-queries.ts
 * Tipos e funções de fetch para os Relatórios Avançados.
 * Usado por: app/api/admin/reports/[surveyId]/route.ts
 *            app/api/admin/reports/compare/route.ts
 *            app/admin/reports/actions.ts
 */

import { createServiceClient } from '@/lib/supabase-service'
export { calcNPS, npsCategoria, type NpsMetrics } from '@/lib/report-metrics'

// ─── Tipos ────────────────────────────────────────────────────────────────

export interface ReportFilters {
  communityIds?: string[]   // filtra por school (IDs)
  perfil?: 'aluno' | 'responsavel' | 'todos'
  serieIds?: string[]
  dateFrom?: string         // ISO date "YYYY-MM-DD"
  dateTo?: string           // ISO date "YYYY-MM-DD"
  onda?: string
  npsKey?: string           // default 'nps'
}

export interface NpsRow {
  session_id: string
  school: string
  nome_escola: string
  perfil: string
  serie: string | null
  onda: string | null
  email: string
  nome: string
  nps_score: number
  categoria: 'promotor' | 'neutro' | 'detrator'
  submitted_at: string
}

export interface ScaleAverageRow {
  school: string
  nome_escola: string
  eixo: string
  n_respostas: number
  media: number
}

export interface SurveyMeta {
  id: string
  slug: string
  title: string
  status: string
  open_date: string | null
  close_date: string | null
}

export interface SessionRow {
  id: string
  survey_id: string
  community_id: string
  user_id: string
  submitted_at: string
  perfil: string
  nome_responsavel: string
  nome_aluno: string
  serie: string
  email: string
  school: string
  onda: string
  responses: { question_key: string; value: unknown }[]
}

export interface QuestionRow {
  id: string
  key: string
  type: string
  title: string
  order_index: number
}

export interface OptionRow {
  question_id: string
  order_index: number
  label: string
}

export interface FilterOptions {
  communities: { id: string; nome: string }[]
  series: string[]
  ondas: string[]
  perfis: string[]
}

// ─── NPS helpers ──────────────────────────────────────────────────────────

// ─── Fetch: NPS Breakdown ─────────────────────────────────────────────────

export async function fetchNpsBreakdown(
  surveyId: string,
  filters: ReportFilters = {}
): Promise<NpsRow[]> {
  const sb = createServiceClient()
  const { data, error } = await sb.rpc('rpc_nps_breakdown', {
    p_survey_id:     surveyId,
    p_community_ids: filters.communityIds?.length ? filters.communityIds : null,
    p_perfil:        filters.perfil ?? 'todos',
    p_serie_ids:     filters.serieIds?.length ? filters.serieIds : null,
    p_date_from:     filters.dateFrom ? `${filters.dateFrom}T00:00:00Z` : null,
    p_date_to:       filters.dateTo   ? `${filters.dateTo}T00:00:00Z`   : null,
    p_onda:          filters.onda ?? null,
    p_nps_key:       filters.npsKey ?? 'nps',
  })
  if (error) throw new Error(`rpc_nps_breakdown: ${error.message}`)
  return (data ?? []) as NpsRow[]
}

// ─── Fetch: Scale Averages ────────────────────────────────────────────────

export async function fetchScaleAverages(
  surveyId: string,
  filters: ReportFilters = {}
): Promise<ScaleAverageRow[]> {
  const sb = createServiceClient()
  const { data, error } = await sb.rpc('rpc_scale_averages', {
    p_survey_id:     surveyId,
    p_community_ids: filters.communityIds?.length ? filters.communityIds : null,
    p_perfil:        filters.perfil ?? 'todos',
    p_serie_ids:     filters.serieIds?.length ? filters.serieIds : null,
    p_date_from:     filters.dateFrom ? `${filters.dateFrom}T00:00:00Z` : null,
    p_date_to:       filters.dateTo   ? `${filters.dateTo}T00:00:00Z`   : null,
    p_onda:          filters.onda ?? null,
  })
  if (error) throw new Error(`rpc_scale_averages: ${error.message}`)
  return (data ?? []) as ScaleAverageRow[]
}

// ─── Fetch: Raw Sessions ──────────────────────────────────────────────────

export async function fetchRawSessions(
  surveyId: string,
  filters: ReportFilters = {}
): Promise<SessionRow[]> {
  const sb = createServiceClient()
  let q = sb
    .from('response_sessions')
    .select('id, survey_id, community_id, user_id, submitted_at, perfil, nome_responsavel, nome_aluno, serie, email, school, onda, responses(question_key, value)')
    .eq('survey_id', surveyId)
    .order('submitted_at', { ascending: false })

  if (filters.communityIds?.length) {
    q = q.in('school', filters.communityIds)
  }
  if (filters.perfil && filters.perfil !== 'todos') {
    q = q.eq('perfil', filters.perfil)
  }
  if (filters.serieIds?.length) {
    q = q.in('serie', filters.serieIds)
  }
  if (filters.dateFrom) {
    q = q.gte('submitted_at', `${filters.dateFrom}T00:00:00Z`)
  }
  if (filters.dateTo) {
    q = q.lte('submitted_at', `${filters.dateTo}T23:59:59Z`)
  }
  if (filters.onda) {
    q = q.eq('onda', filters.onda)
  }

  const { data, error } = await q
  if (error) throw new Error(`fetchRawSessions: ${error.message}`)
  return (data ?? []) as SessionRow[]
}

// ─── Fetch: Survey metadata ───────────────────────────────────────────────

export async function fetchSurveyMeta(surveyId: string): Promise<SurveyMeta> {
  const sb = createServiceClient()
  const { data, error } = await sb
    .from('surveys')
    .select('id, slug, title, status, open_date, close_date')
    .eq('id', surveyId)
    .single()
  if (error || !data) throw new Error(`Survey ${surveyId} not found`)
  return data as SurveyMeta
}

// ─── Fetch: Questions + Options ───────────────────────────────────────────

export async function fetchQuestionsAndOptions(surveyId: string): Promise<{
  questions: QuestionRow[]
  options: OptionRow[]
}> {
  const sb = createServiceClient()
  const { data: questionsRaw } = await sb
    .from('questions')
    .select('id, key, type, title, order_index')
    .eq('survey_id', surveyId)
    .order('order_index', { ascending: true })

  const questions = (questionsRaw ?? []) as QuestionRow[]

  const { data: optionsRaw } = questions.length > 0
    ? await sb
        .from('question_options')
        .select('question_id, order_index, label')
        .in('question_id', questions.map(q => q.id))
        .order('order_index', { ascending: true })
    : { data: [] }

  return {
    questions,
    options: (optionsRaw ?? []) as OptionRow[],
  }
}

// ─── Fetch: All surveys (for selector) ───────────────────────────────────

export async function fetchAllSurveys(): Promise<SurveyMeta[]> {
  const sb = createServiceClient()
  const { data, error } = await sb
    .from('surveys')
    .select('id, slug, title, status, open_date, close_date')
    .order('created_at', { ascending: false })
  if (error) throw new Error(`fetchAllSurveys: ${error.message}`)
  return (data ?? []) as SurveyMeta[]
}

// ─── Fetch: Filter options for a survey ───────────────────────────────────

export async function getFilterOptions(surveyId: string): Promise<FilterOptions> {
  const sb = createServiceClient()

  // Communities present in this survey
  const { data: schoolRows } = await sb
    .from('response_sessions')
    .select('school')
    .eq('survey_id', surveyId)

  const schoolIds: string[] = [...new Set(
    ((schoolRows ?? []) as { school: string | null }[])
      .map(r => r.school)
      .filter((s): s is string => typeof s === 'string' && s.length > 0)
  )]

  let communities: { id: string; nome: string }[] = []
  if (schoolIds.length > 0) {
    const { data: communityRows } = await sb
      .from('communities')
      .select('community_id, nome_escola')
      .in('community_id', schoolIds)
    communities = (communityRows ?? []).map((c: { community_id: string; nome_escola: string }) => ({
      id: c.community_id,
      nome: c.nome_escola ?? c.community_id,
    }))
  }

  // Series
  const { data: serieRows } = await sb
    .from('response_sessions')
    .select('serie')
    .eq('survey_id', surveyId)
    .not('serie', 'is', null)
  const series: string[] = [...new Set(
    ((serieRows ?? []) as { serie: string | null }[])
      .map(r => r.serie)
      .filter((s): s is string => typeof s === 'string' && s.length > 0)
  )].sort()

  // Ondas
  const { data: ondaRows } = await sb
    .from('response_sessions')
    .select('onda')
    .eq('survey_id', surveyId)
    .not('onda', 'is', null)
  const ondas: string[] = [...new Set(
    ((ondaRows ?? []) as { onda: string | null }[])
      .map(r => r.onda)
      .filter((s): s is string => typeof s === 'string' && s.length > 0)
  )].sort()

  return {
    communities,
    series,
    ondas,
    perfis: ['aluno', 'responsavel'],
  }
}
