import ExcelJS from 'exceljs'
import { describe, expect, it } from 'vitest'

import { buildAdvancedXlsx } from '@/lib/report-xlsx'
import type {
  NpsRow,
  OptionRow,
  QuestionRow,
  ScaleAverageRow,
  SessionRow,
  SurveyMeta,
} from '@/lib/report-queries'

const survey: SurveyMeta = {
  id: 'survey-1',
  slug: 'csat',
  title: 'Pesquisa CSAT',
  status: 'ativa',
  open_date: null,
  close_date: null,
}

const npsRows: NpsRow[] = [{
  session_id: 'session-1',
  school: 'school-1',
  nome_escola: 'Colegio Qi Valqueire',
  marca: 'Colegio Qi',
  unidade: 'Valqueire',
  perfil: 'responsavel',
  serie: '3A',
  onda: '1',
  email: 'maria@example.com',
  nome: 'Maria',
  nps_score: 10,
  categoria: 'promotor',
  submitted_at: '2026-06-23T10:00:00.000Z',
}]

const scaleRows: ScaleAverageRow[] = [{
  school: 'school-1',
  nome_escola: 'Colegio Qi Valqueire',
  marca: 'Colegio Qi',
  unidade: 'Valqueire',
  eixo: 'Pedagogico',
  n_respostas: 1,
  media: 4.5,
}]

const questions: QuestionRow[] = [
  { id: 'q-nps', key: 'nps', type: 'nps', title: 'NPS', order_index: 0 },
  { id: 'q-scale', key: 'pedagogico', type: 'scale', title: 'Pedagogico', order_index: 1 },
  { id: 'q-text', key: 'comentario', type: 'text', title: 'Comentario', order_index: 2 },
]

const options: OptionRow[] = [
  { question_id: 'q-scale', order_index: 0, label: 'Clareza' },
]

const sessions: SessionRow[] = [{
  id: 'session-1',
  survey_id: 'survey-1',
  community_id: 'community-1',
  nome_escola: 'Colegio Qi Valqueire',
  marca: 'Colegio Qi',
  unidade: 'Valqueire',
  user_id: 'user-1',
  submitted_at: '2026-06-23T10:00:00.000Z',
  perfil: 'responsavel',
  nome_responsavel: 'Maria',
  nome_aluno: 'Joao',
  serie: '3A',
  email: 'maria@example.com',
  school: 'school-1',
  onda: '1',
  responses: [
    { question_key: 'nps', value: { nps: 10 } },
    { question_key: 'pedagogico', value: { 0: 5 } },
    { question_key: 'comentario', value: 'Otimo atendimento' },
  ],
}]

describe('buildAdvancedXlsx', () => {
  it('creates workbook with expected sheets, headers and raw values', async () => {
    const buffer = await buildAdvancedXlsx({
      survey,
      npsRows,
      scaleRows,
      sessions,
      questions,
      options,
      communityMap: new Map([['school-1', 'Colegio Qi Valqueire']]),
      compareData: [{ survey, npsMetrics: { total: 1, promotores: 1, neutros: 0, detratores: 0, nps: 100 } }],
    })

    const workbook = new ExcelJS.Workbook()
    await workbook.xlsx.load(buffer)

    expect(workbook.worksheets.map(sheet => sheet.name)).toEqual([
      'Resumo Executivo',
      'NPS Breakdown',
      'M\u00e9dias por Eixo',
      'Respostas Brutas',
      'Comparativo',
    ])

    const resumo = workbook.getWorksheet('Resumo Executivo')
    expect(resumo?.getCell('A1').value).toBe('Pesquisa CSAT')
    expect(resumo?.getCell('A5').value).toBe('NPS Geral')
    expect(resumo?.getCell('B5').value).toBe(100)

    const nps = workbook.getWorksheet('NPS Breakdown')
    expect(nps?.getRow(1).values).toContain('Nota NPS')
    expect(nps?.getCell('A2').value).toBe('Maria')
    expect(nps?.getCell('C2').value).toBe('Colegio Qi')
    expect(nps?.getCell('D2').value).toBe('Valqueire')
    expect(nps?.getCell('E2').value).toBe('Colegio Qi Valqueire')
    expect(nps?.getCell('I2').value).toBe(10)
    expect(nps?.getCell('J2').value).toBe('promotor')

    const medias = workbook.getWorksheet('M\u00e9dias por Eixo')
    expect(medias?.getCell('A2').value).toBe('Colegio Qi')
    expect(medias?.getCell('B2').value).toBe('Valqueire')
    expect(medias?.getCell('C2').value).toBe('Colegio Qi Valqueire')
    expect(medias?.getCell('D2').value).toBe(4.5)

    const raw = workbook.getWorksheet('Respostas Brutas')
    expect(raw?.getRow(1).values).toEqual(expect.arrayContaining([
      'postId',
      'Marca',
      'Unidade',
      'Nome da Comunidade',
      'community_id',
      'categoriaNPS',
      'NPS',
      'Clareza',
      'Comentario',
    ]))
    expect(raw?.getCell('A2').value).toBe('session-1')
    expect(raw?.getCell('C2').value).toBe('Colegio Qi')
    expect(raw?.getCell('D2').value).toBe('Valqueire')
    expect(raw?.getCell('E2').value).toBe('Colegio Qi Valqueire')
    expect(raw?.getCell('F2').value).toBe('community-1')
    expect(raw?.getCell('M2').value).toBe('promotor')
    expect(raw?.getCell('O2').value).toBe(10)
    expect(raw?.getCell('P2').value).toBe(5)
    expect(raw?.getCell('Q2').value).toBe('Otimo atendimento')

    const compare = workbook.getWorksheet('Comparativo')
    expect(compare?.getCell('A2').value).toBe('Pesquisa CSAT')
    expect(compare?.getCell('F2').value).toBe(100)
  })
})
