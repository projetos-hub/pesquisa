'use server'

import { createServerSupabaseClient } from '@/lib/supabase-server'
import { createServiceClient } from '@/lib/supabase-service'
import ExcelJS from 'exceljs'

interface ResponseRow {
  id: string
  question_key: string
  value: unknown
}

interface SessionRow {
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
  responses: ResponseRow[]
}

interface QuestionRow {
  id: string
  key: string
  type: string
  title: string
  order_index: number
}

interface OptionRow {
  question_id: string
  order_index: number
  label: string
}

type ColDef = {
  header: string
  getValue: (ans: Record<string, unknown>) => unknown
}

function buildColumnSchema(questions: QuestionRow[], options: OptionRow[]): ColDef[] {
  const cols: ColDef[] = []

  const optsByQuestion: Record<string, OptionRow[]> = options.reduce(
    (acc, o) => {
      if (!acc[o.question_id]) acc[o.question_id] = []
      acc[o.question_id].push(o)
      return acc
    },
    {} as Record<string, OptionRow[]>
  )

  for (const q of questions) {
    if (q.type === 'welcome' || q.type === 'thankyou') continue

    if (q.type === 'nps') {
      cols.push({
        header: q.title,
        getValue: ans => (ans[q.key] as { nps?: number } | undefined)?.nps ?? '',
      })
    } else if (q.type === 'scale') {
      for (const opt of optsByQuestion[q.id] ?? []) {
        cols.push({
          header: opt.label,
          getValue: ans =>
            (ans[q.key] as Record<string, number> | undefined)?.[opt.label] ?? '',
        })
      }
    } else if (q.type === 'scale_sections') {
      // Incluir como JSON raw — tratamento completo em versão futura
      cols.push({
        header: q.title,
        getValue: ans => {
          const val = ans[q.key]
          return val ? JSON.stringify(val) : ''
        },
      })
    } else if (q.type === 'text' || q.type === 'radio' || q.type === 'checkbox') {
      cols.push({
        header: q.title,
        getValue: ans => {
          const val = ans[q.key]
          if (Array.isArray(val)) return val.join(', ')
          return typeof val === 'string' ? val : val != null ? String(val) : ''
        },
      })
    }
  }

  return cols
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

    // Metadata columns (matching Metabase format)
    const surveyTitle = survey.title
    const META_HEADERS = ['postId', 'title', 'community', 'userId', 'userName', 'userEmail', 'tipoRespondente', 'answeredAt']
    const getMetaValues = (s: SessionRow): unknown[] => [
      s.id,
      surveyTitle,
      s.community_id,
      s.user_id,
      s.perfil === 'aluno' ? (s.nome_aluno || '') : (s.nome_responsavel || ''),
      s.email || '',
      s.perfil === 'aluno' ? 'estudante' : 'responsavel',
      s.submitted_at,
    ]

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
    for (const session of sessions) {
      const ans = answersBySession.get(session.id) ?? {}
      worksheet.addRow([
        ...getMetaValues(session),
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
