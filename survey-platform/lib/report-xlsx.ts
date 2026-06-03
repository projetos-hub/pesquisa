/**
 * lib/report-xlsx.ts
 * Builder ExcelJS para os Relatórios Avançados (multi-aba).
 * Também exporta buildColumnSchema e META_HEADERS/getMetaValues
 * para compatibilidade retroativa com app/api/admin/export/route.ts.
 */

import ExcelJS from 'exceljs'
import {
  NpsRow,
  ScaleAverageRow,
  SessionRow,
  QuestionRow,
  OptionRow,
  SurveyMeta,
  calcNPS,
} from '@/lib/report-queries'

// ─── Tipos internos ────────────────────────────────────────────────────────

export type ColDef = {
  header: string
  getValue: (ans: Record<string, unknown>) => unknown
}

// ─── buildColumnSchema (extraído de export/route.ts) ──────────────────────

export function buildColumnSchema(questions: QuestionRow[], options: OptionRow[]): ColDef[] {
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
          getValue: ans => {
            const row = ans[q.key] as Record<string, number | string> | undefined
            if (!row) return ''
            const byIndex = row[String(opt.order_index)]
            if (byIndex != null) return byIndex
            return row[opt.label] ?? ''
          },
        })
      }
    } else if (q.type === 'scale_sections') {
      // Expande cada seção como coluna separada no export bruto
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

// ─── META_HEADERS / getMetaValues (extraído de export/route.ts) ───────────

export const META_HEADERS = [
  'postId', 'title', 'community', 'userId', 'userName', 'userEmail', 'tipoRespondente', 'answeredAt',
]

export function getMetaValues(s: SessionRow, surveyTitle: string): unknown[] {
  return [
    s.id,
    surveyTitle,
    s.community_id,
    s.user_id,
    s.perfil === 'aluno' ? (s.nome_aluno || '') : (s.nome_responsavel || ''),
    s.email || '',
    s.perfil === 'aluno' ? 'estudante' : 'responsavel',
    s.submitted_at,
  ]
}

// ─── Cores e helpers de formatação ────────────────────────────────────────

const COLORS = {
  headerBg:    'FF1E2433',
  headerFg:    'FFFFFFFF',
  promotor:    'FFDCFCE7',
  neutro:      'FFFEF9C3',
  detrator:    'FFFEE2E2',
  verde:       'FFD1FAE5',
  amarelo:     'FFFEF9C3',
  vermelho:    'FFFEE2E2',
  altRow:      'FFF9FAFB',
}

function applyHeaderStyle(row: ExcelJS.Row) {
  row.font = { bold: true, color: { argb: COLORS.headerFg }, size: 11 }
  row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.headerBg } }
  row.alignment = { horizontal: 'center', vertical: 'middle', wrapText: false }
  row.height = 22
}

function cellFill(argb: string): ExcelJS.Fill {
  return { type: 'pattern', pattern: 'solid', fgColor: { argb } }
}

function scaleColor(media: number | null): string {
  if (media === null || media === undefined) return 'FFFFFFFF'
  if (media >= 4.5) return COLORS.verde
  if (media >= 3.5) return COLORS.amarelo
  return COLORS.vermelho
}

// ─── Aba 1: Resumo Executivo ───────────────────────────────────────────────

function buildAbaResumo(
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

  // Título
  ws.mergeCells('A1:E1')
  const titleCell = ws.getCell('A1')
  titleCell.value = survey.title
  titleCell.font = { bold: true, size: 14, color: { argb: COLORS.headerFg } }
  titleCell.fill = cellFill(COLORS.headerBg)
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' }
  ws.getRow(1).height = 28

  ws.addRow([])

  // KPIs
  const kpiHeader = ws.addRow(['Indicador', 'Valor'])
  applyHeaderStyle(kpiHeader)
  ws.addRow(['Total de respostas', nps.total])
  ws.addRow(['NPS Geral', nps.nps])
  ws.addRow(['Promotores', nps.promotores])
  ws.addRow(['Neutros', nps.neutros])
  ws.addRow(['Detratores', nps.detratores])
  ws.addRow([
    '% Promotores',
    nps.total > 0 ? `${Math.round((nps.promotores / nps.total) * 100)}%` : '—',
  ])
  ws.addRow([
    '% Detratores',
    nps.total > 0 ? `${Math.round((nps.detratores / nps.total) * 100)}%` : '—',
  ])

  ws.addRow([])

  // NPS por escola
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

  // Médias por eixo (rede)
  const eixos = [...new Set(scaleRows.map(r => r.eixo))]
  if (eixos.length > 0) {
    const eixoHeader = ws.addRow(['Eixo', 'Média Rede', 'N Respostas'])
    applyHeaderStyle(eixoHeader)

    for (const eixo of eixos) {
      const linhas = scaleRows.filter(r => r.eixo === eixo)
      const totalN = linhas.reduce((a, b) => a + Number(b.n_respostas), 0)
      const mediaRede =
        totalN > 0
          ? linhas.reduce((a, b) => a + Number(b.media) * Number(b.n_respostas), 0) / totalN
          : null
      const row = ws.addRow([
        eixo,
        mediaRede !== null ? Number(mediaRede.toFixed(2)) : '—',
        totalN,
      ])
      if (mediaRede !== null) {
        row.getCell(2).fill = cellFill(scaleColor(mediaRede))
      }
    }
  }
}

// ─── Aba 2: NPS Breakdown ─────────────────────────────────────────────────

function buildAbaNPS(wb: ExcelJS.Workbook, npsRows: NpsRow[]) {
  const ws = wb.addWorksheet('NPS Breakdown')
  ws.columns = [
    { header: 'Nome',       key: 'nome',        width: 28 },
    { header: 'Email',      key: 'email',       width: 32 },
    { header: 'Escola',     key: 'nome_escola', width: 28 },
    { header: 'Perfil',     key: 'perfil',      width: 14 },
    { header: 'Série',      key: 'serie',       width: 14 },
    { header: 'Onda',       key: 'onda',        width: 14 },
    { header: 'Nota NPS',   key: 'nps_score',   width: 12 },
    { header: 'Categoria',  key: 'categoria',   width: 14 },
    { header: 'Data',       key: 'submitted_at',width: 22 },
  ]

  applyHeaderStyle(ws.getRow(1))

  for (let i = 0; i < npsRows.length; i++) {
    const r = npsRows[i]
    const row = ws.addRow({
      nome:        r.nome,
      email:       r.email,
      nome_escola: r.nome_escola,
      perfil:      r.perfil,
      serie:       r.serie ?? '',
      onda:        r.onda ?? '',
      nps_score:   r.nps_score,
      categoria:   r.categoria,
      submitted_at: new Date(r.submitted_at).toLocaleString('pt-BR'),
    })

    const bgColor =
      r.categoria === 'promotor' ? COLORS.promotor :
      r.categoria === 'neutro'   ? COLORS.neutro :
                                   COLORS.detrator

    row.eachCell((cell: ExcelJS.Cell) => {
      cell.fill = cellFill(bgColor)
    })
  }
}

// ─── Aba 3: Médias por Eixo ───────────────────────────────────────────────

function buildAbaMedias(wb: ExcelJS.Workbook, scaleRows: ScaleAverageRow[]) {
  const ws = wb.addWorksheet('Médias por Eixo')

  const eixos = [...new Set(scaleRows.map(r => r.eixo))].sort()
  const escolas = [...new Set(scaleRows.map(r => r.school))]

  // Pivot: Map<school, Map<eixo, media>>
  const pivot = new Map<string, { nome_escola: string; medias: Map<string, number | null> }>()
  for (const row of scaleRows) {
    if (!pivot.has(row.school)) {
      pivot.set(row.school, { nome_escola: row.nome_escola, medias: new Map() })
    }
    pivot.get(row.school)!.medias.set(row.eixo, row.media !== null ? Number(row.media) : null)
  }

  // Headers
  ws.columns = [
    { header: 'Escola', key: 'escola', width: 32 },
    ...eixos.map(e => ({ header: e, key: e, width: 18 })),
  ]
  applyHeaderStyle(ws.getRow(1))

  // Data rows — sorted by school name
  const sorted = [...pivot.entries()].sort((a, b) =>
    a[1].nome_escola.localeCompare(b[1].nome_escola, 'pt-BR')
  )

  for (const [school, { nome_escola, medias }] of sorted) {
    const values: (string | number)[] = [nome_escola]
    const colors: (string | null)[] = [null]

    for (const eixo of eixos) {
      const m = medias.get(eixo) ?? null
      values.push(m !== null ? Number(m.toFixed(2)) : '—')
      colors.push(m !== null ? scaleColor(m) : null)
    }

    const row = ws.addRow(values)
    colors.forEach((color, i) => {
      if (color) {
        row.getCell(i + 1).fill = cellFill(color)
      }
    })
  }

  // Média rede (footer)
  ws.addRow([])
  const footerValues: (string | number)[] = ['MÉDIA REDE']
  for (const eixo of eixos) {
    const linhas = scaleRows.filter(r => r.eixo === eixo)
    const totalN = linhas.reduce((a, b) => a + Number(b.n_respostas), 0)
    const mediaRede =
      totalN > 0
        ? linhas.reduce((a, b) => a + Number(b.media) * Number(b.n_respostas), 0) / totalN
        : null
    footerValues.push(mediaRede !== null ? Number(mediaRede.toFixed(2)) : '—')
  }
  const footerRow = ws.addRow(footerValues)
  footerRow.font = { bold: true }
  footerRow.eachCell((cell: ExcelJS.Cell) => {
    cell.fill = cellFill(COLORS.altRow)
  })
}

// ─── Aba 4: Respostas Brutas ──────────────────────────────────────────────

function buildAbaRespostasBrutas(
  wb: ExcelJS.Workbook,
  sessions: SessionRow[],
  survey: SurveyMeta,
  questions: QuestionRow[],
  options: OptionRow[],
  communityMap: Map<string, string>
) {
  const ws = wb.addWorksheet('Respostas Brutas')

  // Adiciona resolução de nome_escola nas meta columns
  const META_HEADERS_EXTENDED = [
    'postId', 'title', 'escola', 'community', 'userId', 'userName',
    'userEmail', 'tipoRespondente', 'serie', 'onda', 'categoriaNPS', 'answeredAt',
  ]

  const colSchema = buildColumnSchema(questions, options)

  ws.addRow([...META_HEADERS_EXTENDED, ...colSchema.map(c => c.header)])
  applyHeaderStyle(ws.getRow(1))

  const answersBySession = new Map<string, Record<string, unknown>>()
  for (const s of sessions) {
    const ans: Record<string, unknown> = {}
    for (const r of s.responses) {
      ans[r.question_key] = r.value
    }
    answersBySession.set(s.id, ans)
  }

  for (const session of sessions) {
    const ans = answersBySession.get(session.id) ?? {}
    const npsVal = ans['nps'] as { nps?: number } | undefined
    const npsScore = npsVal?.nps
    const categoria =
      npsScore === undefined ? '' :
      npsScore >= 9 ? 'promotor' :
      npsScore >= 7 ? 'neutro' : 'detrator'

    const nomeEscola = communityMap.get(session.school) ?? session.school ?? ''
    const nome = session.perfil === 'aluno'
      ? (session.nome_aluno || '')
      : (session.nome_responsavel || '')

    ws.addRow([
      session.id,
      survey.title,
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
    if (!col.width) col.width = i < META_HEADERS_EXTENDED.length ? 24 : 32
  })
}

// ─── Aba 5 (condicional): Comparativo Surveys ─────────────────────────────

interface SurveyCompareData {
  survey: SurveyMeta
  npsMetrics: ReturnType<typeof calcNPS>
}

function buildAbaComparativo(wb: ExcelJS.Workbook, surveys: SurveyCompareData[]) {
  const ws = wb.addWorksheet('Comparativo')
  ws.columns = [
    { header: 'Pesquisa',    key: 'title',       width: 40 },
    { header: 'Total',       key: 'total',        width: 12 },
    { header: 'Promotores',  key: 'promotores',   width: 14 },
    { header: 'Neutros',     key: 'neutros',      width: 12 },
    { header: 'Detratores',  key: 'detratores',   width: 14 },
    { header: 'NPS',         key: 'nps',          width: 10 },
  ]
  applyHeaderStyle(ws.getRow(1))

  for (const { survey, npsMetrics: m } of surveys) {
    const row = ws.addRow({
      title:      survey.title,
      total:      m.total,
      promotores: m.promotores,
      neutros:    m.neutros,
      detratores: m.detratores,
      nps:        m.nps,
    })
    row.getCell('nps').fill = cellFill(
      m.nps >= 50 ? COLORS.verde : m.nps >= 0 ? COLORS.amarelo : COLORS.vermelho
    )
  }
}

// ─── Builder principal ────────────────────────────────────────────────────

export interface AdvancedXlsxInput {
  survey: SurveyMeta
  npsRows: NpsRow[]
  scaleRows: ScaleAverageRow[]
  sessions: SessionRow[]
  questions: QuestionRow[]
  options: OptionRow[]
  communityMap: Map<string, string>     // school_id → nome_escola
  compareData?: SurveyCompareData[]     // aba 5 (condicional)
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
