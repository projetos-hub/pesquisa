import type { LayersUserListItem, TargetRole } from './layers-notification-payloads'

const LAYERS_BASE_URL = 'https://api.layers.digital'

interface UsersPage {
  users: LayersUserListItem[]
  total: number
  hasMore: boolean
}

const GUARDIAN_ROLES = new Set([
  'guardian',
  'father',
  'mother',
  'financial_responsible',
  'academic_responsible',
])

function userMatchesRole(user: LayersUserListItem, role: TargetRole): boolean {
  const roles = user.roles ?? []
  if (role === 'guardian') return roles.some(r => GUARDIAN_ROLES.has(r))
  return roles.includes(role)
}

function userMatchesAnyRole(user: LayersUserListItem, roles: TargetRole[]): boolean {
  if (roles.length === 0) return true
  return roles.some(role => userMatchesRole(user, role))
}

async function fetchUsersPage(
  communityId: string,
  token: string,
  limit: number,
  offset: number,
): Promise<UsersPage> {
  const params = new URLSearchParams({
    active: 'true',
    limit:  String(limit),
    offset: String(offset),
  })

  try {
    const res = await fetch(`${LAYERS_BASE_URL}/v1/users?${params}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'community-id':  communityId,
      },
      signal: AbortSignal.timeout(10_000),
    })

    if (!res.ok) return { users: [], total: offset, hasMore: false }

    const data = await res.json() as unknown
    if (Array.isArray(data)) {
      const users = data as LayersUserListItem[]
      const hasMore = users.length === limit
      return {
        users,
        hasMore,
        total: offset + users.length + (hasMore ? limit : 0),
      }
    }

    if (typeof data === 'object' && data !== null) {
      const d = data as { hits?: LayersUserListItem[]; total?: number }
      const users = d.hits ?? []
      const exactTotal = typeof d.total === 'number' ? d.total : null
      const hasMore = exactTotal === null ? users.length === limit : offset + users.length < exactTotal
      return {
        users,
        hasMore,
        total: exactTotal ?? offset + users.length + (hasMore ? limit : 0),
      }
    }

    return { users: [], total: offset, hasMore: false }
  } catch {
    return { users: [], total: offset, hasMore: false }
  }
}

export async function fetchCommunityUsers(
  communityId: string,
  roles: TargetRole[],
  limit = 200,
  offset = 0,
): Promise<{ users: LayersUserListItem[]; total: number; hasMore: boolean }> {
  const token = process.env.LAYERS_API_TOKEN
  if (!token) return { users: [], total: 0, hasMore: false }

  const allRoles: TargetRole[] = ['guardian', 'student', 'admin']
  const isAllRoles = allRoles.every(r => roles.includes(r))

  if (roles.length === 0 || isAllRoles) {
    return fetchUsersPage(communityId, token, limit, offset)
  }

  const needed = offset + limit
  const matched: LayersUserListItem[] = []
  const seen = new Set<string>()
  let rawOffset = 0
  let rawHasMore = true
  let estimatedRawTotal = 0

  while (matched.length < needed && rawHasMore) {
    const page = await fetchUsersPage(communityId, token, limit, rawOffset)
    estimatedRawTotal = page.total

    for (const user of page.users) {
      if (!user._id || seen.has(user._id)) continue
      seen.add(user._id)
      if (userMatchesAnyRole(user, roles)) matched.push(user)
    }

    rawOffset += page.users.length
    rawHasMore = page.hasMore && page.users.length > 0
  }

  const users = matched.slice(offset, needed)
  const hasMore = matched.length > needed || rawHasMore
  const total = hasMore
    ? offset + users.length + limit
    : matched.length

  return {
    users,
    hasMore,
    total: Math.max(total, estimatedRawTotal === rawOffset ? matched.length : total),
  }
}
