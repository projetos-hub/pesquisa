import { afterEach, describe, expect, it, vi } from 'vitest'
import { fetchCommunityUsers } from '@/lib/layers-notification-users'

const originalFetch = globalThis.fetch
const originalToken = process.env.LAYERS_API_TOKEN

describe('fetchCommunityUsers', () => {
  afterEach(() => {
    globalThis.fetch = originalFetch
    process.env.LAYERS_API_TOKEN = originalToken
    vi.restoreAllMocks()
  })

  it('keeps paging array responses without total and filters guardian roles locally', async () => {
    process.env.LAYERS_API_TOKEN = 'token'

    const pages: Record<string, unknown[]> = {
      '0': [
        { _id: 'admin-1', name: 'Admin', roles: ['admin'] },
        { _id: 'guardian-1', name: 'Guardian 1', roles: ['father'] },
      ],
      '2': [
        { _id: 'student-1', name: 'Student', roles: ['student'] },
        { _id: 'guardian-2', name: 'Guardian 2', roles: ['financial_responsible'] },
      ],
      '4': [
        { _id: 'guardian-3', name: 'Guardian 3', roles: ['guardian'] },
      ],
    }

    globalThis.fetch = vi.fn(async (input: RequestInfo | URL) => {
      const url = new URL(String(input))
      const offset = url.searchParams.get('offset') ?? '0'
      return {
        ok: true,
        json: async () => pages[offset] ?? [],
      } as Response
    })

    const first = await fetchCommunityUsers('qi-rio2', ['guardian'], 2, 0)
    expect(first.users.map(user => user._id)).toEqual(['guardian-1', 'guardian-2'])
    expect(first.hasMore).toBe(true)

    const second = await fetchCommunityUsers('qi-rio2', ['guardian'], 2, 2)
    expect(second.users.map(user => user._id)).toEqual(['guardian-3'])
    expect(second.hasMore).toBe(false)
  })
})
