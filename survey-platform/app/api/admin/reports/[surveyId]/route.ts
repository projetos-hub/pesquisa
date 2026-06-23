/**
 * GET /api/admin/reports/[surveyId]
 * Endpoint de Relatórios Avançados com filtros.
 *
 * Query params:
 *   communityIds  string (vírgula)
 *   perfil        "aluno" | "responsavel" | "todos"
 *   serieIds      string (vírgula)
 *   dateFrom      "YYYY-MM-DD"
 *   dateTo        "YYYY-MM-DD"
 *   onda          string
 *   format        "xlsx" | "json"   (default: xlsx)
 *   report        "full" | "nps" | "scale" | "summary"  (default: full)
 *   npsKey        string  (default: "nps")
 */

import { adminAuthErrorResponse, requireAdmin } from '@/lib/admin-auth'
import {
  fetchSurveyMeta,
  fetchNpsBreakdown,
  fetchScaleAverages,
  fetchRawSessions,
  fetchQuestionsAndOptions,
  calcNPS,
  type ReportFilters,
} from '@/lib/report-queries'
import { buildAdvancedXlsx } from '@/lib/report-xlsx'

// Vercel Pro: allow up to 60s for large surveys
export const maxDuration = 60

function parseFilters(params: URLSearchParams): ReportFilters {
  const communityIds = params.get('communityIds')
  const serieIds = params.get('serieIds')
  const perfil = params.get('perfil') as ReportFilters['perfil']

  return {
    communityIds: communityIds ? communityIds.split(',').filter(Boolean) : undefined,
    perfil: perfil && ['aluno', 'responsavel', 'todos'].includes(perfil) ? perfil : 'todos',
    serieIds: serieIds ? serieIds.split(',').filter(Boolean) : undefined,
    dateFrom: params.get('dateFrom') ?? undefined,
    dateTo:   params.get('dateTo')   ?? undefined,
    onda:     params.get('onda')     ?? undefined,
    npsKey:   params.get('npsKey')   ?? 'nps',
  }
}

export async function GET(
  request: Request,
  context: { params: Promise<{ surveyId: string }> }
) {
  try {
    await requireAdmin()

    const { surveyId } = await context.params
    if (!surveyId) {
      return Response.json({ error: 'surveyId required' }, { status: 400 })
    }

    const url = new URL(request.url)
    const filters = parseFilters(url.searchParams)
    const format = url.searchParams.get('format') ?? 'xlsx'
    const report = url.searchParams.get('report') ?? 'full'

    // Survey metadata
    const survey = await fetchSurveyMeta(surveyId)

    // Fetch data in parallel where possible
    const [npsRows, scaleRows] = await Promise.all([
      fetchNpsBreakdown(surveyId, filters),
      fetchScaleAverages(surveyId, filters),
    ])

    // JSON format — return structured data for preview
    if (format === 'json') {
      const npsMetrics = calcNPS(npsRows)

      if (report === 'nps') {
        return Response.json({ survey, npsMetrics, npsRows })
      }

      if (report === 'scale') {
        return Response.json({ survey, scaleRows })
      }

      if (report === 'summary') {
        return Response.json({ survey, npsMetrics, scaleRows })
      }

      // full
      return Response.json({ survey, npsMetrics, npsRows, scaleRows })
    }

    // XLSX format
    const [sessions, { questions, options }] = await Promise.all([
      fetchRawSessions(surveyId, filters),
      fetchQuestionsAndOptions(surveyId),
    ])

    // Build community map (school_id → nome_escola)
    const communityMap = new Map<string, string>()
    for (const row of npsRows) {
      communityMap.set(row.school, row.nome_escola)
    }
    // Also cover sessions without NPS
    for (const s of sessions) {
      if (s.school && !communityMap.has(s.school)) {
        communityMap.set(s.school, s.school)
      }
    }

    const buffer = await buildAdvancedXlsx({
      survey,
      npsRows,
      scaleRows,
      sessions,
      questions,
      options,
      communityMap,
    })

    const now = new Date()
    const dateStr = now.toISOString().split('T')[0]
    const filename = `relatorio-${survey.slug}-${dateStr}.xlsx`

    return new Response(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch (err) {
    const authResponse = adminAuthErrorResponse(err)
    if (authResponse) return authResponse

    console.error('[reports/surveyId] error:', err)
    const message = err instanceof Error ? err.message : 'Internal server error'
    return Response.json({ error: message }, { status: 500 })
  }
}
