import { resolveCommunityId } from './community-mapping'

const COMMUNITY_ID_ALIASES: Record<string, string> = {
  'globaltree-botafogo': 'n6k47n81',
  'global-tree-botafogo': 'n6k47n81',
}

function aliasKey(value: string): string {
  return value
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[\s_]+/g, '-')
}

/** Converts known legacy community names and slugs to their Layers community ID. */
export function normalizeSurveyCommunityId(value: string): string {
  const trimmed = value.trim()
  if (!trimmed) return ''

  return COMMUNITY_ID_ALIASES[aliasKey(trimmed)] ?? resolveCommunityId(trimmed) ?? trimmed
}
