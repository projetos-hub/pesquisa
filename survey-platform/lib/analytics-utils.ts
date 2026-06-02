/**
 * Shared analytics utility functions
 * Extracted from responses/page.tsx to avoid duplication
 */

/**
 * Extract average score from a JSONB value (object of numeric scores)
 * Pattern: { q1: 4, q2: 5, q3: 3 } → 4.0
 */
export function avgFromJsonbScore(value: unknown): number | null {
  if (!value || typeof value !== 'object') return null
  const scores = Object.values(value as Record<string, unknown>)
    .map(Number)
    .filter(n => !isNaN(n) && n > 0)
  if (!scores.length) return null
  return scores.reduce((a, b) => a + b, 0) / scores.length
}

/**
 * Calculate NPS score from raw scores array
 * Formula: (promotores - detratores) / total * 100
 */
export function calcNpsScore(scores: number[]): number {
  if (!scores.length) return 0
  const promotores = scores.filter(s => s >= 9).length
  const detratores = scores.filter(s => s <= 6).length
  return Math.round(((promotores - detratores) / scores.length) * 100)
}

/**
 * Categorize an NPS score (0-10) as promotor, neutro, or detrator
 */
export function npsCategory(score: number): 'promotor' | 'neutro' | 'detrator' {
  if (score >= 9) return 'promotor'
  if (score >= 7) return 'neutro'
  return 'detrator'
}

/**
 * Format an ISO date string as BR locale date (dd/mm/yyyy)
 */
export function formatDateBR(iso: string): string {
  return new Date(iso).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}
