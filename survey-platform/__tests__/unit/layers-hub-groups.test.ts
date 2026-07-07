import { describe, expect, it } from 'vitest'

import { extractSerieTurmaFromGroups } from '@/lib/layers-hub'

describe('extractSerieTurmaFromGroups', () => {
  it('separates grade/series from classroom code when Layers returns both groups', () => {
    const result = extractSerieTurmaFromGroups([
      { _id: 'grade', name: '2026-4? ano', alias: '2026-4? anoTarde', type: 'classroom', season: '2026' },
      { _id: 'class', name: 'AME-4AA', alias: '2026 - AME-4AA', type: 'classroom', season: '2026' },
    ])

    expect(result).toEqual({ serie: '2026-4? ano', turma: 'AME-4AA' })
  })

  it('falls back to the group alias as classroom when only one group exists', () => {
    const result = extractSerieTurmaFromGroups([
      { _id: 'grade', name: '2026-8? ano', alias: '2026-8? anoManh?', type: 'classroom' },
    ])

    expect(result).toEqual({ serie: '2026-8? ano', turma: '2026-8? anoManh?' })
  })
})
