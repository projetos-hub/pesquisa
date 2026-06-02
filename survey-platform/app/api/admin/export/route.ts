'use server'

import { createServerSupabaseClient } from '@/lib/supabase-server'
import { createServiceClient } from '@/lib/supabase-service'
import ExcelJS from 'exceljs'
import { buildColumnSchema, META_HEADERS, getMetaValues } from '@/lib/report-xlsx'
import type { SessionRow, QuestionRow, OptionRow } from '@/lib/report-queries'

interface ResponseRow {
  id: string
  question_key: string
  value: unknown
}

export async function GET(request: Request) {
  try {
    // Auth check
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Get surveyId from query params
    const url = new URL(request.url)
    const surveyId = url.searchParams.get('surveyId')
    if (!surveyId) {
      return new Response(JSON.stringify({ error: 'surveyId required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const serviceSupabase = createServiceClient()

    // Survey metadata
    const { data: survey, error: surveyError } = await serviceSupabase
      .from('surveys')
      .select('id, slug, title')
      .eq('id', surveyId)
      .single()

    if (surveyError || !survey) {
      return new Response(JSON.stringify({ error: 'Survey not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Questions ordered by order_index
    const { data: questionsRaw } = await serviceSupabase
      .from('questions')
      .select('id, key, type, title, order_index')
      .eq('survey_id', surveyId)
      .order('order_index', { ascending: true })

    const questions = (questionsRaw ?? []) as QuestionRow[]

    // Options for all questions
    const { data: optionsRaw } = questions.length > 0
      ? await serviceSupabase
          .from('question_options')
          .select('question_id, order_index, label')
          .in('question_id', questions.map(q => q.id))
          .order('order_index', { ascending: true })
      : { data: [] }

    const options = (optionsRaw ?? []) as OptionRow[]

    // All sessions + responses
    const { data: sessions, error: sessionsError } = await serviceSupabase
      .from('response_sessions')
      .select('id, survey_id, community_id, user_id, submitted_at, perfil, nome_responsavel, nome_aluno, serie, email, school, onda, responses(id, question_key, value)')
      .eq('survey_id', surveyId)
      .order('submitted_at', { ascending: false }) as { data: SessionRow[] | null; error: unknown }

    if (sessionsError || !sessions) {
      return new Response(JSON.stringify({ error: 'Failed to fetch sessions' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Build column schema from questions
    const columnSchema = buildColumnSchema(questions, options)

    // Build answer lookup
    const answersBySession = new Map<string, Record<string, unknown>>()
    for (const session of sessions) {
      const ans: Record<string, unknown> = {}
      for (const r of session.responses) {
        ans[r.question_key] = r.value
      }
      answersBySession.set(session.id, ans)
    }

    // Create workbook
    const workbook = new ExcelJS.Workbook()
    const worksheet = workbook.addWorksheet('Respostas')

    // Header row
    worksheet.addRow([
      ...META_HEADERS,
      ...columnSchema.map(c => c.header),
    ])

    const headerRow = worksheet.getRow(1)
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } }
    headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4F46E5' } }
    headerRow.alignment = { horizontal: 'center', vertical: 'middle' }

    // Data rows
    const surveyTitle = survey.title
    for (const session of sessions) {
      const ans = answersBySession.get(session.id) ?? {}
      worksheet.addRow([
        ...getMetaValues(session, surveyTitle),
        ...columnSchema.map(c => c.getValue(ans)),
      ])
    }

    // Column widths
    worksheet.columns.forEach((col, i) => {
      col.width = i < META_HEADERS.length ? 24 : 32
    })

    const now = new Date()
    const dateStr = now.toISOString().split('T')[0]
    const filename = `respostas-${survey.slug}-${dateStr}.xlsx`

    const buffer = await workbook.xlsx.writeBuffer()

    return new Response(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch (error) {
    console.error('[export] error:', error)
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
