import type { LayersUserListItem, TargetRole } from './layers-notification-payloads'

const LAYERS_BASE_URL = 'https://api.layers.digital'

async function fetchUsersForRole(
  communityId: string,
  token: string,
  role: TargetRole | null,
  limit: number,
  offset: number,
): Promise<{ users: LayersUserListItem[]; total: number }> {
  const params = new URLSearchParams({
    active: 'true',
    limit:  String(limit),
    offset: String(offset),
  })
  if (role !== null) {
    params.set('role', role)
  }

  try {
    const res = await fetch(`${LAYERS_BASE_URL}/v1/users?${params}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'community-id':  communityId,
      },
      signal: AbortSignal.timeout(10_000),
    })

    if (!res.ok) return { users: [], total: 0 }

    const data = await res.json() as unknown
    if (Array.isArray(data)) {
      return { users: data as LayersUserListItem[], total: (data as unknown[]).length }
    }
    if (typeof data === 'object' && data !== null) {
      const d = data as { hits?: LayersUserListItem[]; total?: number }
      return { users: d.hits ?? [], total: d.total ?? 0 }
    }
    return { users: [], total: 0 }
  } catch {
    return { users: [], total: 0 }
  }
}

export async function fetchCommunityUsers(
  communityId: string,
  roles: TargetRole[],
  limit = 200,
  offset = 0,
): Promise<{ users: LayersUserListItem[]; total: number }> {
  const token = process.env.LAYERS_API_TOKEN
  if (!token) return { users: [], total: 0 }

  const allRoles: TargetRole[] = ['guardian', 'student', 'admin']
  const isAllRoles = allRoles.every(r => roles.includes(r))

  if (roles.length === 0 || isAllRoles) {
    return fetchUsersForRole(communityId, token, null, limit, offset)
  }

  if (roles.length === 1) {
    return fetchUsersForRole(communityId, token, roles[0], limit, offset)
  }

  const results = await Promise.all(
    roles.map(role => fetchUsersForRole(communityId, token, role, limit + offset, 0))
  )

  const seen = new Set<string>()
  const merged: LayersUserListItem[] = []
  for (const { users } of results) {
    for (const user of users) {
      if (!seen.has(user._id)) {
        seen.add(user._id)
        merged.push(user)
      }
    }
  }

  const total = merged.length
  const page  = merged.slice(offset, offset + limit)

  return { users: page, total }
}
