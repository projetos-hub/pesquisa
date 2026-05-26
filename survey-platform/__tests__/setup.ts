// Global setup for unit/integration tests
// Patches fetch to prepend BASE_URL for relative URLs (/api/...)
import { beforeAll } from 'vitest'

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000'
const originalFetch = globalThis.fetch

beforeAll(() => {
  globalThis.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
    if (typeof input === 'string' && input.startsWith('/')) {
      return originalFetch(`${BASE_URL}${input}`, init)
    }
    return originalFetch(input, init)
  }
})
