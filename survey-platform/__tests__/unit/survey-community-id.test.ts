import { describe, expect, it } from 'vitest'
import { normalizeSurveyCommunityId } from '@/lib/survey-community-id'

describe('normalizeSurveyCommunityId', () => {
  it('normalizes Global Tree Botafogo legacy names and slugs', () => {
    expect(normalizeSurveyCommunityId('n6k47n81')).toBe('n6k47n81')
    expect(normalizeSurveyCommunityId('GLOBAL TREE BOTAFOGO')).toBe('n6k47n81')
    expect(normalizeSurveyCommunityId('globaltree-botafogo')).toBe('n6k47n81')
    expect(normalizeSurveyCommunityId('global_tree_botafogo')).toBe('n6k47n81')
  })
})
