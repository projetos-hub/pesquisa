import { describe, expect, it } from 'vitest'
import {
  hashPublicResponseAccessKey,
  verifyPublicResponseAccessKey,
  type PublicResponseLink,
} from '@/lib/public-responses'

function makeLink(accessKeyHash: string | null): PublicResponseLink {
  return {
    id: 'link-1',
    survey_id: 'survey-1',
    token: 'token-1',
    label: null,
    enabled: true,
    include_pii: false,
    access_key_hash: accessKeyHash,
    expires_at: null,
  }
}

describe('public response access key', () => {
  it('verifies a matching access key', () => {
    const accessKey = 'secret-key'
    const link = makeLink(hashPublicResponseAccessKey(accessKey))

    expect(verifyPublicResponseAccessKey(link, accessKey)).toBe(true)
  })

  it('rejects missing, wrong, and legacy links without a hash', () => {
    const link = makeLink(hashPublicResponseAccessKey('secret-key'))

    expect(verifyPublicResponseAccessKey(link, null)).toBe(false)
    expect(verifyPublicResponseAccessKey(link, 'wrong-key')).toBe(false)
    expect(verifyPublicResponseAccessKey(makeLink(null), 'secret-key')).toBe(false)
  })
})
