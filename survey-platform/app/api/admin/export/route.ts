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
  school: string
  onda: string
  responses: ResponseRow[]
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

    // Use service client to bypass RLS
    const serviceSupabase = createServiceClient()

    // Fetch survey metadata (to get slug)
    const { data: survey, error: surveyError } = await serviceSupabase
      .from('surveys')
      .select('id, slug')
      .eq('id', surveyId)
      .single()

    if (surveyError || !survey) {
      return new Response(JSON.stringify({ error: 'Survey not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Fetch all sessions + responses for this survey
    const { data: sessions, error: sessionsError } = await serviceSupabase
      .from('response_sessions')
      .select('id, survey_id, community_id, user_id, submitted_at, perfil, nome_responsavel, nome_aluno, serie, school, onda, responses(id, question_key, value)')
      .eq('survey_id', surveyId)
      .order('submitted_at', { ascending: false }) as { data: SessionRow[] | null; error: unknown }

    if (sessionsError || !sessions) {
      return new Response(JSON.stringify({ error: 'Failed to fetch sessions' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Discover all dynamic column names
    const allDynamicKeys = new Set<string>()
    sessions.forEach(session => {
      session.responses.forEach(resp => {
        const value = resp.value as Record<string, unknown> | unknown
        if (value && typeof value === 'object' && !Array.isArray(value)) {
          Object.keys(value as object).forEach(subkey => {
            allDynamicKeys.add(`${resp.question_key}_${subkey}`)
          })
        } else {
          allDynamicKeys.add(resp.question_key)
        }
      })
    })

    // Create workbook with ExcelJS (UTF-8 encoding nativo)
    const workbook = new ExcelJS.Workbook()
    const worksheet = workbook.addWorksheet('Respostas')

    // Define header columns
    const headers = [
      'Data',
      'Perfil',
      'Nome Responsável',
      'Nome Aluno',
      'Série',
      'Escola',
      'Comunidade',
      'Onda',
      ...Array.from(allDynamicKeys).sort(),
    ]
    worksheet.addRow(headers)

    // Style header row
    const headerRow = worksheet.getRow(1)
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } }
    headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4F46E5' } }
    headerRow.alignment = { horizontal: 'center', vertical: 'middle' }

    // Add data rows
    sessions.forEach(session => {
      const row: unknown[] = [
        session.submitted_at ? new Date(session.submitted_at).toLocaleString('pt-BR') : '',
        session.perfil,
        session.nome_responsavel,
        session.nome_aluno,
        session.serie,
        session.school,
        session.community_id,
        session.onda,
      ]

      // Build answer map
      const answerMap: Record<string, unknown> = {}
      session.responses.forEach(resp => {
        const value = resp.value as Record<string, unknown> | unknown
        if (value && typeof value === 'object' && !Array.isArray(value)) {
          Object.entries(value as Record<string, unknown>).forEach(([subkey, val]) => {
            const colName = `${resp.question_key}_${subkey}`
            answerMap[colName] = val
          })
        } else {
          answerMap[resp.question_key] = value
        }
      })

      // Add answers in same order as headers
      Array.from(allDynamicKeys)
        .sort()
        .forEach(key => {
          row.push(answerMap[key] ?? '')
        })

      worksheet.addRow(row)
    })

    // Auto-fit columns
    worksheet.columns.forEach(col => {
      col.width = 18
    })

    // Generate filename
    const now = new Date()
    const dateStr = now.toISOString().split('T')[0]
    const filename = `respostas-${survey.slug}-${dateStr}.xlsx`

    // Write to buffer with UTF-8 encoding
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
