import ExcelJS from 'exceljs'

import {
  NpsRow,
  OptionRow,
  QuestionRow,
  ScaleAverageRow,
  SessionRow,
  SurveyMeta,
} from '@/lib/report-queries'
import { calcNPS } from '@/lib/report-metrics'
import { applyHeaderStyle, cellFill, scaleColor, XLSX_COLORS } from '@/lib/report-xlsx-formatting'
import { buildColumnSchema } from '@/lib/report-xlsx-schema'

export interface SurveyCompareData {
  survey: SurveyMeta
  npsMetrics: ReturnType<typeof calcNPS>
}

export function buildAbaResumo(
  wb: ExcelJS.Workbook,
  survey: SurveyMeta,
  npsRows: NpsRow[],
  scaleRows: ScaleAverageRow[]
) {
  const ws = wb.addWorksheet('Resumo Executivo')
  ws.columns = [
    { width: 32 }, { width: 20 }, { width: 20 }, { width: 20 }, { width: 20 },
  ]

  const nps = calcNPS(npsRows)

  ws.mergeCells('A1:E1')
  const titleCell = ws.getCell('A1')
  titleCell.value = survey.title
  titleCell.font = { bold: true, size: 14, color: { argb: XLSX_COLORS.headerFg } }
  titleCell.fill = cellFill(XLSX_COLORS.headerBg)
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' }
  ws.getRow(1).height = 28

  ws.addRow([])

  const kpiHeader = ws.addRow(['Indicador', 'Valor'])
  applyHeaderStyle(kpiHeader)
  ws.addRow(['Total de respostas', nps.total])
  ws.addRow(['NPS Geral', nps.nps])
  ws.addRow(['Promotores', nps.promotores])
  ws.addRow(['Neutros', nps.neutros])
  ws.addRow(['Detratores', nps.detratores])
  ws.addRow(['% Promotores', nps.total > 0 ? `${Math.round((nps.promotores / nps.total) * 100)}%` : 'Ã¢â‚¬â€'])
  ws.addRow(['% Detratores', nps.total > 0 ? `${Math.round((nps.detratores / nps.total) * 100)}%` : 'Ã¢â‚¬â€'])

  ws.addRow([])

  const escolasNPS = [...new Set(npsRows.map(r => r.school))]
  if (escolasNPS.length > 0) {
    const npsEscolaHeader = ws.addRow(['Escola', 'Total', 'Promotores', 'Detratores', 'NPS'])
    applyHeaderStyle(npsEscolaHeader)

    for (const school of escolasNPS) {
      const rows = npsRows.filter(r => r.school === school)
      const m = calcNPS(rows)
      const nome = rows[0]?.nome_escola ?? school
      ws.addRow([nome, m.total, m.promotores, m.detratores, m.nps])
    }
  }

  ws.addRow([])

  const eixos = [...new Set(scaleRows.map(r => r.eixo))]
  if (eixos.length > 0) {
    const eixoHeader = ws.addRow(['Eixo', 'MÃƒÂ©dia Rede', 'N Respostas'])
    applyHeaderStyle(eixoHeader)

    for (const eixo of eixos) {
      const linhas = scaleRows.filter(r => r.eixo === eixo)
      const totalN = linhas.reduce((a, b) => a + Number(b.n_respostas), 0)
      const mediaRede =
        totalN > 0
          ? linhas.reduce((a, b) => a + Number(b.media) * Number(b.n_respostas), 0) / totalN
          : null
      const row = ws.addRow([eixo, mediaRede !== null ? Number(mediaRede.toFixed(2)) : 'Ã¢â‚¬â€', totalN])
      if (mediaRede !== null) row.getCell(2).fill = cellFill(scaleColor(mediaRede))
    }
  }
}

export function buildAbaNPS(wb: ExcelJS.Workbook, npsRows: NpsRow[]) {
  const ws = wb.addWorksheet('NPS Breakdown')
  ws.columns = [
    { header: 'Nome', key: 'nome', width: 28 },
    { header: 'Email', key: 'email', width: 32 },
    { header: 'Marca', key: 'marca', width: 24 },
    { header: 'Unidade', key: 'unidade', width: 24 },
    { header: 'Nome da Comunidade', key: 'nome_escola', width: 32 },
    { header: 'Perfil', key: 'perfil', width: 14 },
    { header: 'SÃƒÂ©rie', key: 'serie', width: 14 },
    { header: 'Onda', key: 'onda', width: 14 },
    { header: 'Nota NPS', key: 'nps_score', width: 12 },
    { header: 'Categoria', key: 'categoria', width: 14 },
    { header: 'Data', key: 'submitted_at', width: 22 },
  ]

  applyHeaderStyle(ws.getRow(1))

  for (const r of npsRows) {
    const row = ws.addRow({
      nome: r.nome,
      email: r.email,
      marca: r.marca,
      unidade: r.unidade,
      nome_escola: r.nome_escola,
      perfil: r.perfil,
      serie: r.serie ?? '',
      onda: r.onda ?? '',
      nps_score: r.nps_score,
      categoria: r.categoria,
      submitted_at: new Date(r.submitted_at).toLocaleString('pt-BR'),
    })

    const bgColor =
      r.categoria === 'promotor' ? XLSX_COLORS.promotor :
      r.categoria === 'neutro' ? XLSX_COLORS.neutro :
      XLSX_COLORS.detrator

    row.eachCell((cell: ExcelJS.Cell) => {
      cell.fill = cellFill(bgColor)
    })
  }
}

export function buildAbaMedias(wb: ExcelJS.Workbook, scaleRows: ScaleAverageRow[]) {
  const ws = wb.addWorksheet('M\u00e9dias por Eixo')

  const eixos = [...new Set(scaleRows.map(r => r.eixo))].sort()
  const pivot = new Map<string, { nome_escola: string; marca: string; unidade: string; medias: Map<string, number | null> }>()

  for (const row of scaleRows) {
    if (!pivot.has(row.school)) {
      pivot.set(row.school, { nome_escola: row.nome_escola, marca: row.marca, unidade: row.unidade, medias: new Map() })
    }
    pivot.get(row.school)!.medias.set(row.eixo, row.media !== null ? Number(row.media) : null)
  }

  ws.columns = [
    { header: 'Marca', key: 'marca', width: 24 },
    { header: 'Unidade', key: 'unidade', width: 24 },
    { header: 'Nome da Comunidade', key: 'escola', width: 32 },
    ...eixos.map(e => ({ header: e, key: e, width: 18 })),
  ]
  applyHeaderStyle(ws.getRow(1))

  const sorted = [...pivot.values()].sort((a, b) =>
    a.nome_escola.localeCompare(b.nome_escola, 'pt-BR')
  )

  for (const { nome_escola, marca, unidade, medias } of sorted) {
    const values: (string | number)[] = [marca, unidade, nome_escola]
    const colors: (string | null)[] = [null, null, null]

    for (const eixo of eixos) {
      const m = medias.get(eixo) ?? null
      values.push(m !== null ? Number(m.toFixed(2)) : 'Ã¢â‚¬â€')
      colors.push(m !== null ? scaleColor(m) : null)
    }

    const row = ws.addRow(values)
    colors.forEach((color, i) => {
      if (color) row.getCell(i + 1).fill = cellFill(color)
    })
  }

  ws.addRow([])
  const footerValues: (string | number)[] = ['', '', 'MÃƒâ€°DIA REDE']
  for (const eixo of eixos) {
    const linhas = scaleRows.filter(r => r.eixo === eixo)
    const totalN = linhas.reduce((a, b) => a + Number(b.n_respostas), 0)
    const mediaRede =
      totalN > 0
        ? linhas.reduce((a, b) => a + Number(b.media) * Number(b.n_respostas), 0) / totalN
        : null
    footerValues.push(mediaRede !== null ? Number(mediaRede.toFixed(2)) : 'Ã¢â‚¬â€')
  }
  const footerRow = ws.addRow(footerValues)
  footerRow.font = { bold: true }
  footerRow.eachCell((cell: ExcelJS.Cell) => {
    cell.fill = cellFill(XLSX_COLORS.altRow)
  })
}

export function buildAbaRespostasBrutas(
  wb: ExcelJS.Workbook,
  sessions: SessionRow[],
  survey: SurveyMeta,
  questions: QuestionRow[],
  options: OptionRow[],
  communityMap: Map<string, string>
) {
  const ws = wb.addWorksheet('Respostas Brutas')
  const metaHeadersExtended = [
    'postId', 'title', 'Marca', 'Unidade', 'Nome da Comunidade', 'community_id', 'userId', 'userName',
    'userEmail', 'tipoRespondente', 'serie', 'onda', 'categoriaNPS', 'answeredAt',
  ]
  const colSchema = buildColumnSchema(questions, options)

  ws.addRow([...metaHeadersExtended, ...colSchema.map(c => c.header)])
  applyHeaderStyle(ws.getRow(1))

  const answersBySession = new Map<string, Record<string, unknown>>()
  for (const s of sessions) {
    const ans: Record<string, unknown> = {}
    for (const r of s.responses) ans[r.question_key] = r.value
    answersBySession.set(s.id, ans)
  }

  for (const session of sessions) {
    const ans = answersBySession.get(session.id) ?? {}
    const npsVal = ans.nps as { nps?: number } | undefined
    const npsScore = npsVal?.nps
    const categoria =
      npsScore === undefined ? '' :
      npsScore >= 9 ? 'promotor' :
      npsScore >= 7 ? 'neutro' : 'detrator'
    const nomeEscola = session.nome_escola ?? communityMap.get(session.school) ?? session.school ?? ''
    const nome = session.perfil === 'aluno' ? session.nome_aluno || '' : session.nome_responsavel || ''

    ws.addRow([
      session.id,
      survey.title,
      session.marca ?? '',
      session.unidade ?? '',
      nomeEscola,
      session.community_id,
      session.user_id,
      nome,
      session.email || '',
      session.perfil === 'aluno' ? 'estudante' : 'responsavel',
      session.serie ?? '',
      session.onda ?? '',
      categoria,
      session.submitted_at,
      ...colSchema.map(c => c.getValue(ans)),
    ])
  }

  ws.columns.forEach((col: Partial<ExcelJS.Column>, i: number) => {
    if (!col.width) col.width = i < metaHeadersExtended.length ? 24 : 32
  })
}

export function buildAbaComparativo(wb: ExcelJS.Workbook, surveys: SurveyCompareData[]) {
  const ws = wb.addWorksheet('Comparativo')
  ws.columns = [
    { header: 'Pesquisa', key: 'title', width: 40 },
    { header: 'Total', key: 'total', width: 12 },
    { header: 'Promotores', key: 'promotores', width: 14 },
    { header: 'Neutros', key: 'neutros', width: 12 },
    { header: 'Detratores', key: 'detratores', width: 14 },
    { header: 'NPS', key: 'nps', width: 10 },
  ]
  applyHeaderStyle(ws.getRow(1))

  for (const { survey, npsMetrics: m } of surveys) {
    const row = ws.addRow({
      title: survey.title,
      total: m.total,
      promotores: m.promotores,
      neutros: m.neutros,
      detratores: m.detratores,
      nps: m.nps,
    })
    row.getCell('nps').fill = cellFill(
      m.nps >= 50 ? XLSX_COLORS.verde : m.nps >= 0 ? XLSX_COLORS.amarelo : XLSX_COLORS.vermelho
    )
  }
}
