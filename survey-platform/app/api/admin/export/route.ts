'use server'

import { createServerSupabaseClient } from '@/lib/supabase-server'
import { createServiceClient } from '@/lib/supabase-service'
import * as XLSX from 'xlsx'

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

    // Build flattened rows: one row per session, all question answers as columns
    const allDynamicKeys = new Set<string>()

    // First pass: discover all dynamic column names
    sessions.forEach(session => {
      session.responses.forEach(resp => {
        const value = resp.value as Record<string, unknown> | unknown
        if (value && typeof value === 'object' && !Array.isArray(value)) {
          // It's an object: expand into subkeys
          Object.keys(value as object).forEach(subkey => {
            allDynamicKeys.add(`${resp.question_key}_${subkey}`)
          })
        } else {
          // It's a scalar: use question_key as column
          allDynamicKeys.add(resp.question_key)
        }
      })
    })

    // Build final data rows
    const rows = sessions.map(session => {
      const row: Record<string, unknown> = {
        'Data': session.submitted_at ? new Date(session.submitted_at).toLocaleString('pt-BR') : '',
        'Perfil': session.perfil,
        'Nome Responsável': session.nome_responsavel,
        'Nome Aluno': session.nome_aluno,
        'Série': session.serie,
        'Escola': session.school,
        'Comunidade': session.community_id,
        'Onda': session.onda,
      }

      // Add dynamic columns
      allDynamicKeys.forEach(key => {
        row[key] = ''
      })

      // Fill in answers
      session.responses.forEach(resp => {
        const value = resp.value as Record<string, unknown> | unknown
        if (value && typeof value === 'object' && !Array.isArray(value)) {
          // Expand object into subkeys
          Object.entries(value as Record<string, unknown>).forEach(([subkey, val]) => {
            const colName = `${resp.question_key}_${subkey}`
            row[colName] = val
          })
        } else {
          // Scalar value
          row[resp.question_key] = value
        }
      })

      return row
    })

    // Create workbook and sheet
    const ws = XLSX.utils.json_to_sheet(rows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Respostas')

    // Generate filename with current date
    const now = new Date()
    const dateStr = now.toISOString().split('T')[0]
    const filename = `respostas-${survey.slug}-${dateStr}.xlsx`

    // Write to buffer and return
    const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'buffer' })

    return new Response(buf, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
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
