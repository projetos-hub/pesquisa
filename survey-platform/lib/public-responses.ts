import ExcelJS from 'exceljs'
import { createServiceClient } from '@/lib/supabase-service'
import {
  fetchQuestionsAndOptions,
  fetchRawSessions,
  fetchSurveyMeta,
  type QuestionRow,
  type SessionRow,
  type SurveyMeta,
} from '@/lib/report-queries'
import { buildColumnSchema, getMetaValues, META_HEADERS } from '@/lib/report-xlsx-schema'

export type PublicResponseFormat = 'csv' | 'json' | 'xlsx'

export interface PublicResponseLink {
  id: string
  survey_id: string
  token: string
  label: string | null
  enabled: boolean
  include_pii: boolean
  expires_at: string | null
}

export interface PublicResponsesDataset {
  link: PublicResponseLink
  survey: SurveyMeta
  headers: string[]
  rows: unknown[][]
  rowCount: number
  updatedAt: string
}

const PII_META_HEADERS = new Set(['userId', 'userName', 'userEmail'])

export function parsePublicResponseFormat(rawToken: string, searchParams: URLSearchParams) {
  const queryFormat = searchParams.get('format')
  if (queryFormat === 'csv' || queryFormat === 'json' || queryFormat === 'xlsx') {
    return { token: rawToken, format: queryFormat as PublicResponseFormat }
  }

  const match = rawToken.match(/^(.+)\.(csv|json|xlsx)$/)
  if (match?.[1] && match[2]) {
    return {
      token: match[1],
      format: match[2] as PublicResponseFormat,
    }
  }

  return { token: rawToken, format: 'json' as PublicResponseFormat }
}

export async function getPublicResponsesDataset(token: string): Promise<PublicResponsesDataset | null> {
  const supabase = createServiceClient()
  const { data: link, error } = await supabase
    .from('public_response_links')
    .select('id, survey_id, token, label, enabled, include_pii, expires_at')
    .eq('token', token)
    .maybeSingle()

  if (error || !link) return null

  const publicLink = link as PublicResponseLink
  if (!publicLink.enabled) return null
  if (publicLink.expires_at && new Date(publicLink.expires_at).getTime() < Date.now()) return null

  const [survey, sessions, questionData] = await Promise.all([
    fetchSurveyMeta(publicLink.survey_id),
    fetchRawSessions(publicLink.survey_id),
    fetchQuestionsAndOptions(publicLink.survey_id),
  ])

  return buildPublicResponsesDataset(publicLink, survey, sessions, questionData.questions, questionData.options)
}

function buildPublicResponsesDataset(
  link: PublicResponseLink,
  survey: SurveyMeta,
  sessions: SessionRow[],
  questions: QuestionRow[],
  options: Awaited<ReturnType<typeof fetchQuestionsAndOptions>>['options']
): PublicResponsesDataset {
  const questionColumns = buildColumnSchema(questions, options)
  const allHeaders = [...META_HEADERS, ...questionColumns.map(column => column.header)]
  const visibleIndexes = allHeaders
    .map((header, index) => ({ header, index }))
    .filter(item => link.include_pii || !PII_META_HEADERS.has(item.header))

  const rows = sessions.map(session => {
    const answers: Record<string, unknown> = {}
    for (const response of session.responses ?? []) {
      answers[response.question_key] = response.value
    }

    const values = [
      ...getMetaValues(session, survey.title),
      ...questionColumns.map(column => column.getValue(answers)),
    ]

    return visibleIndexes.map(item => values[item.index] ?? '')
  })

  return {
    link,
    survey,
    headers: visibleIndexes.map(item => item.header),
    rows,
    rowCount: rows.length,
    updatedAt: new Date().toISOString(),
  }
}

function csvCell(value: unknown): string {
  if (value == null) return ''
  const text = typeof value === 'string' ? value : JSON.stringify(value)
  if (/[",\r\n;]/.test(text)) return `"${text.replace(/"/g, '""')}"`
  return text
}

export function publicResponsesToCsv(dataset: PublicResponsesDataset): string {
  const lines = [
    dataset.headers.map(csvCell).join(','),
    ...dataset.rows.map(row => row.map(csvCell).join(',')),
  ]

  return lines.join('\r\n')
}

export function publicResponsesToJson(dataset: PublicResponsesDataset) {
  return {
    survey: dataset.survey,
    rowCount: dataset.rowCount,
    updatedAt: dataset.updatedAt,
    rows: dataset.rows.map(row => Object.fromEntries(
      dataset.headers.map((header, index) => [header, row[index] ?? ''])
    )),
  }
}

export async function publicResponsesToXlsx(dataset: PublicResponsesDataset): Promise<ArrayBuffer> {
  const workbook = new ExcelJS.Workbook()
  const worksheet = workbook.addWorksheet('Respostas')

  worksheet.addRow(dataset.headers)
  const headerRow = worksheet.getRow(1)
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } }
  headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F172A' } }
  headerRow.alignment = { horizontal: 'center', vertical: 'middle' }

  for (const row of dataset.rows) {
    worksheet.addRow(row)
  }

  worksheet.columns.forEach(column => {
    column.width = 24
  })

  return workbook.xlsx.writeBuffer()
}

export function publicResponsesFilename(dataset: PublicResponsesDataset, format: PublicResponseFormat) {
  const date = new Date().toISOString().slice(0, 10)
  return `respostas-${dataset.survey.slug}-${date}.${format}`
}
