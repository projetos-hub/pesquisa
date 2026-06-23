/**
 * GET /api/admin/reports/compare
 * Comparativo de NPS entre múltiplas surveys.
 *
 * Query params:
 *   surveyIds  string (vírgula, obrigatório, 2+)
 *   format     "xlsx" | "json"  (default: xlsx)
 */

import { adminAuthErrorResponse, requireAdmin } from '@/lib/admin-auth'
import {
  fetchSurveyMeta,
  fetchNpsBreakdown,
  fetchScaleAverages,
  calcNPS,
} from '@/lib/report-queries'
import { buildAdvancedXlsx } from '@/lib/report-xlsx'

export const maxDuration = 60

export async function GET(request: Request) {
  try {
    await requireAdmin()

    const url = new URL(request.url)
    const surveyIdsParam = url.searchParams.get('surveyIds')
    if (!surveyIdsParam) {
      return Response.json({ error: 'surveyIds required' }, { status: 400 })
    }

    const surveyIds = surveyIdsParam.split(',').filter(Boolean)
    if (surveyIds.length < 2) {
      return Response.json({ error: 'At least 2 surveyIds required for comparison' }, { status: 400 })
    }

    const format = url.searchParams.get('format') ?? 'xlsx'

    // Fetch all surveys in parallel
    const surveysData = await Promise.all(
      surveyIds.map(async id => {
        const [survey, npsRows] = await Promise.all([
          fetchSurveyMeta(id),
          fetchNpsBreakdown(id),
        ])
        return { survey, npsMetrics: calcNPS(npsRows), npsRows }
      })
    )

    if (format === 'json') {
      return Response.json(
        surveysData.map(({ survey, npsMetrics }) => ({ survey, npsMetrics }))
      )
    }

    // XLSX — usa o primeiro survey como base, adiciona aba comparativo
    const primary = surveysData[0]
    const [scaleRows] = await Promise.all([
      fetchScaleAverages(primary.survey.id),
    ])

    const now = new Date()
    const dateStr = now.toISOString().split('T')[0]
    const filename = `comparativo-surveys-${dateStr}.xlsx`

    const communityMap = new Map<string, string>()
    for (const row of primary.npsRows) {
      communityMap.set(row.school, row.nome_escola)
    }

    const buffer = await buildAdvancedXlsx({
      survey: primary.survey,
      npsRows: primary.npsRows,
      scaleRows,
      sessions: [],
      questions: [],
      options: [],
      communityMap,
      compareData: surveysData.map(({ survey, npsMetrics }) => ({ survey, npsMetrics })),
    })

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

    console.error('[reports/compare] error:', err)
    const message = err instanceof Error ? err.message : 'Internal server error'
    return Response.json({ error: message }, { status: 500 })
  }
}
