export interface NpsMetrics {
  promotores: number
  neutros: number
  detratores: number
  total: number
  nps: number
}

export interface NpsScoreRow {
  nps_score: number
}

export function calcNPS(rows: NpsScoreRow[]): NpsMetrics {
  const promotores = rows.filter(r => r.nps_score >= 9).length
  const neutros = rows.filter(r => r.nps_score >= 7 && r.nps_score < 9).length
  const detratores = rows.filter(r => r.nps_score < 7).length
  const total = rows.length
  return {
    promotores,
    neutros,
    detratores,
    total,
    nps: total > 0 ? Math.round(((promotores - detratores) / total) * 100) : 0,
  }
}

export function npsCategoria(score: number): 'promotor' | 'neutro' | 'detrator' {
  if (score >= 9) return 'promotor'
  if (score >= 7) return 'neutro'
  return 'detrator'
}
