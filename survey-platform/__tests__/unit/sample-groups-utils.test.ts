import { describe, expect, it } from 'vitest'

import {
  buildMembersQuery,
  layersResolutionIcon,
  layersResolutionStatus,
  selectAllOrNone,
  toggleSelectedId,
} from '@/app/admin/surveys/[id]/sample/sample-groups-utils'

describe('sample-groups-utils', () => {
  it('toggles selected ids immutably', () => {
    const initial = new Set(['a'])
    const added = toggleSelectedId(initial, 'b')
    const removed = toggleSelectedId(added, 'a')

    expect([...initial]).toEqual(['a'])
    expect([...added].sort()).toEqual(['a', 'b'])
    expect([...removed]).toEqual(['b'])
  })

  it('selects all or clears all according to current size', () => {
    expect([...selectAllOrNone(new Set(), ['a', 'b'])].sort()).toEqual(['a', 'b'])
    expect([...selectAllOrNone(new Set(['a', 'b']), ['a', 'b'])]).toEqual([])
  })

  it('builds members query with only active filters', () => {
    const qs = buildMembersQuery({
      mode: 'add',
      community: 'school-a',
      perfil: '',
      q: 'ana',
      status: 'resolved',
    })

    expect(qs.toString()).toBe('in_group=false&limit=200&community=school-a&q=ana&status=resolved')
  })

  it('classifies Layers resolution status', () => {
    expect(layersResolutionStatus(null)).toBe('pending')
    expect(layersResolutionStatus('NOT_FOUND')).toBe('not_found')
    expect(layersResolutionStatus('user-1')).toBe('resolved')
    expect(layersResolutionIcon(null)).toBe('...')
    expect(layersResolutionIcon('NOT_FOUND')).toBe('x')
    expect(layersResolutionIcon('user-1')).toBe('ok')
  })
})
