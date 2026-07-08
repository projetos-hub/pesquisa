import { excelText } from './sample-upload-text'

export type SampleEmailMode = 'all' | 'financial_responsible'

export interface SampleExcelRow {
  nome: string
  nomefantasia: string
  emails: string[]
}

type SheetRow = Record<string, unknown>

const NAME_COLUMNS = ['NOME', 'ALUNO', 'NOME DO ALUNO', 'NOMEALUNO', 'NOME ALUNO']
const SCHOOL_COLUMNS = ['NOMEFANTASIA', 'FILIAL', 'ESCOLA', 'UNIDADE']
const EMAIL_COLUMNS: Record<SampleEmailMode, string[][]> = {
  all: [
    ['EMAIL INSTITUCIONAL', 'EMAIL_ALUNO', 'EMAIL ALUNO'],
    ['EMAIL RESP FIN', 'EMAIL_RESP_FINANCEIRO', 'EMAIL RESP FINANCEIRO', 'EMAIL'],
    ['EMAIL RESP ACAD', 'EMAIL_RESP_ACADEMICO', 'EMAIL RESP ACADEMICO'],
  ],
  financial_responsible: [
    ['EMAIL RESP FIN', 'EMAIL_RESP_FINANCEIRO', 'EMAIL RESP FINANCEIRO', 'EMAIL'],
  ],
}

export function isSampleEmailMode(value: unknown): value is SampleEmailMode {
  return value === 'all' || value === 'financial_responsible'
}

function normalizeHeader(value: string): string {
  return excelText(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
}

export function getSampleCell(row: SheetRow, aliases: string[]): string {
  for (const alias of aliases) {
    const value = row[alias]
    if (value !== undefined && value !== null && excelText(value).trim() !== '') {
      return excelText(value).trim()
    }
  }

  const normalizedAliases = new Set(aliases.map(normalizeHeader))
  for (const [key, value] of Object.entries(row)) {
    if (
      normalizedAliases.has(normalizeHeader(key)) &&
      value !== undefined &&
      value !== null &&
      excelText(value).trim() !== ''
    ) {
      return excelText(value).trim()
    }
  }

  return ''
}

export function extractSampleExcelRow(row: SheetRow, emailMode: SampleEmailMode = 'all'): SampleExcelRow {
  const emails = EMAIL_COLUMNS[emailMode]
    .map(columns => getSampleCell(row, columns).toLowerCase())
    .filter(Boolean)

  return {
    nome: getSampleCell(row, NAME_COLUMNS),
    nomefantasia: getSampleCell(row, SCHOOL_COLUMNS),
    emails: [...new Set(emails)],
  }
}

export const SAMPLE_EXCEL_REQUIRED_COLUMNS =
  'NOME/ALUNO/NOMEALUNO; NOMEFANTASIA ou FILIAL; EMAIL INSTITUCIONAL/EMAIL_ALUNO, EMAIL RESP FIN/EMAIL_RESP_FINANCEIRO/EMAIL, EMAIL RESP ACAD/EMAIL_RESP_ACADEMICO'
