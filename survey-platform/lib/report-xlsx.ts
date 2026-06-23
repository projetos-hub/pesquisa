/**
 * Builder ExcelJS para os Relatorios Avancados.
 *
 * Mantem as exportacoes historicas de schema/meta usadas por
 * app/api/admin/export/route.ts, mas delega a montagem das abas.
 */

import ExcelJS from 'exceljs'

import {
  NpsRow,
  OptionRow,
  QuestionRow,
  ScaleAverageRow,
  SessionRow,
  SurveyMeta,
} from '@/lib/report-queries'
import {
  buildAbaComparativo,
  buildAbaMedias,
  buildAbaNPS,
  buildAbaRespostasBrutas,
  buildAbaResumo,
  type SurveyCompareData,
} from '@/lib/report-xlsx-sheets'

export {
  buildColumnSchema,
  getMetaValues,
  META_HEADERS,
  type ColDef,
} from '@/lib/report-xlsx-schema'

export interface AdvancedXlsxInput {
  survey: SurveyMeta
  npsRows: NpsRow[]
  scaleRows: ScaleAverageRow[]
  sessions: SessionRow[]
  questions: QuestionRow[]
  options: OptionRow[]
  communityMap: Map<string, string>
  compareData?: SurveyCompareData[]
}

export async function buildAdvancedXlsx(input: AdvancedXlsxInput): Promise<ArrayBuffer> {
  const wb = new ExcelJS.Workbook()
  wb.creator = 'Raiz Educação — Relatórios'
  wb.created = new Date()

  buildAbaResumo(wb, input.survey, input.npsRows, input.scaleRows)
  buildAbaNPS(wb, input.npsRows)
  buildAbaMedias(wb, input.scaleRows)
  buildAbaRespostasBrutas(wb, input.sessions, input.survey, input.questions, input.options, input.communityMap)

  if (input.compareData && input.compareData.length > 0) {
    buildAbaComparativo(wb, input.compareData)
  }

  return wb.xlsx.writeBuffer()
}
