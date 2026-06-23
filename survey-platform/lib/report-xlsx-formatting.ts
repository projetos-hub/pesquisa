import type ExcelJS from 'exceljs'

export const XLSX_COLORS = {
  headerBg: 'FF1E2433',
  headerFg: 'FFFFFFFF',
  promotor: 'FFDCFCE7',
  neutro: 'FFFEF9C3',
  detrator: 'FFFEE2E2',
  verde: 'FFD1FAE5',
  amarelo: 'FFFEF9C3',
  vermelho: 'FFFEE2E2',
  altRow: 'FFF9FAFB',
}

export function applyHeaderStyle(row: ExcelJS.Row) {
  row.font = { bold: true, color: { argb: XLSX_COLORS.headerFg }, size: 11 }
  row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: XLSX_COLORS.headerBg } }
  row.alignment = { horizontal: 'center', vertical: 'middle', wrapText: false }
  row.height = 22
}

export function cellFill(argb: string): ExcelJS.Fill {
  return { type: 'pattern', pattern: 'solid', fgColor: { argb } }
}

export function scaleColor(media: number | null | undefined): string {
  if (media === null || media === undefined) return 'FFFFFFFF'
  if (media >= 4.5) return XLSX_COLORS.verde
  if (media >= 3.5) return XLSX_COLORS.amarelo
  return XLSX_COLORS.vermelho
}
