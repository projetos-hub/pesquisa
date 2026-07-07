export const SAMPLE_GROUP_COLORS = [
  '#6366f1',
  '#ec4899',
  '#f59e0b',
  '#10b981',
  '#3b82f6',
  '#8b5cf6',
  '#ef4444',
  '#14b8a6',
]

export interface SampleGroupFilters {
  mode: 'members' | 'add'
  community?: string
  perfil?: string
  q?: string
  status?: string
}

export function toggleSelectedId(selected: Set<string>, id: string): Set<string> {
  const next = new Set(selected)
  if (next.has(id)) next.delete(id)
  else next.add(id)
  return next
}

export function selectAllOrNone(current: Set<string>, entryIds: string[]): Set<string> {
  return current.size === entryIds.length ? new Set() : new Set(entryIds)
}

export function buildMembersQuery(filters: SampleGroupFilters): URLSearchParams {
  return new URLSearchParams({
    in_group: filters.mode === 'members' ? 'true' : 'false',
    limit: '200',
    ...(filters.community ? { community: filters.community } : {}),
    ...(filters.perfil ? { perfil: filters.perfil } : {}),
    ...(filters.q ? { q: filters.q } : {}),
    ...(filters.status ? { status: filters.status } : {}),
  })
}

export function layersResolutionStatus(layersUserId: string | null): string {
  if (layersUserId === null) return 'pending'
  if (layersUserId === 'NOT_FOUND') return 'not_found'
  return 'resolved'
}

export function layersResolutionIcon(layersUserId: string | null): string {
  const status = layersResolutionStatus(layersUserId)
  if (status === 'pending') return '...'
  if (status === 'not_found') return 'x'
  return 'ok'
}