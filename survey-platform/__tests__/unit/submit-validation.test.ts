import { describe, expect, it } from 'vitest'
import { parseSubmitBody } from '@/lib/submit-validation'

function validBody(overrides: Record<string, unknown> = {}) {
  return {
    communityId: ' comunidade-1 ',
    userId: 'user-1',
    accountId: '',
    onda: '2026-1',
    school: 'escola',
    tipo: 'Escola Raiz',
    perfil: 'responsavel',
    nomeCompleto: 'Ana Silva',
    nomeAluno: 'Pedro',
    serie: '7A',
    email: ' ANA@example.COM ',
    layersMeta: { origin: 'layers' },
    answers: { nps: 9 },
    ...overrides,
  }
}

describe('parseSubmitBody', () => {
  it('normalizes a valid submit payload', () => {
    const result = parseSubmitBody(validBody())

    expect(result.ok).toBe(true)
    if (!result.ok) return

    expect(result.body.communityId).toBe('comunidade-1')
    expect(result.body.email).toBe('ana@example.com')
    expect(result.body.answers).toEqual({ nps: 9 })
    expect(result.body.layersMeta).toEqual({ origin: 'layers' })
  })

  it('keeps identity fields optional for anonymous fallback submissions', () => {
    const result = parseSubmitBody({ answers: {} })

    expect(result.ok).toBe(true)
    if (!result.ok) return

    expect(result.body.userId).toBe('')
    expect(result.body.accountId).toBe('')
    expect(result.body.email).toBe('')
    expect(result.body.layersMeta).toEqual({})
  })

  it('rejects missing or non-object answers', () => {
    expect(parseSubmitBody(validBody({ answers: undefined }))).toEqual({
      ok: false,
      error: 'answers is required',
      status: 400,
    })

    expect(parseSubmitBody(validBody({ answers: [] }))).toEqual({
      ok: false,
      error: 'answers is required',
      status: 400,
    })
  })

  it('rejects invalid identity field types and invalid perfil', () => {
    expect(parseSubmitBody(validBody({ communityId: 123 }))).toEqual({
      ok: false,
      error: 'communityId must be a string',
      status: 400,
    })

    expect(parseSubmitBody(validBody({ perfil: 'gestor' }))).toEqual({
      ok: false,
      error: 'perfil is invalid',
      status: 422,
    })
  })

  it('rejects invalid email and abusive answer payloads', () => {
    expect(parseSubmitBody(validBody({ email: 'not-an-email' }))).toEqual({
      ok: false,
      error: 'email is invalid',
      status: 422,
    })

    expect(parseSubmitBody(validBody({ answers: { ['x'.repeat(161)]: true } }))).toEqual({
      ok: false,
      error: 'answer key is invalid',
      status: 422,
    })

    expect(parseSubmitBody(validBody({ answers: { comentario: 'x'.repeat(20_001) } }))).toEqual({
      ok: false,
      error: 'answer comentario is too large',
      status: 422,
    })
  })

  it('rejects non-object layers metadata', () => {
    expect(parseSubmitBody(validBody({ layersMeta: ['bad'] }))).toEqual({
      ok: false,
      error: 'layersMeta must be an object',
      status: 400,
    })
  })
})
