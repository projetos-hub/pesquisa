import type { Perfil } from '@/components/survey-engine/utils/types'

const STRING_LIMITS = {
  communityId: 128,
  userId: 128,
  accountId: 128,
  onda: 64,
  school: 128,
  tipo: 128,
  perfil: 32,
  nomeCompleto: 256,
  nomeAluno: 256,
  serie: 64,
  email: 320,
} as const

const MAX_ANSWER_KEYS = 100
const MAX_ANSWER_KEY_LENGTH = 160
const MAX_ANSWER_VALUE_JSON_LENGTH = 20_000

const allowedPerfis = new Set<Perfil | ''>(['', 'responsavel', 'aluno', 'colaborador'])

export interface SubmitBody {
  communityId: string
  userId: string
  accountId: string
  onda: string
  school: string
  tipo: string
  perfil: Perfil | ''
  nomeCompleto: string
  nomeAluno: string
  serie: string
  email: string
  layersMeta: Record<string, unknown>
  answers: Record<string, unknown>
}

export type SubmitValidationResult =
  | { ok: true; body: SubmitBody }
  | { ok: false; error: string; status: 400 | 422 }

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function normalizeOptionalString(
  source: Record<string, unknown>,
  field: keyof typeof STRING_LIMITS,
): string | SubmitValidationResult {
  const value = source[field]
  if (value === undefined || value === null) return ''
  if (typeof value !== 'string') {
    return { ok: false, error: `${field} must be a string`, status: 400 }
  }

  const normalized = value.trim()
  if (normalized.length > STRING_LIMITS[field]) {
    return { ok: false, error: `${field} is too long`, status: 422 }
  }

  return normalized
}

function validateEmail(email: string): SubmitValidationResult | null {
  if (!email) return null
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false, error: 'email is invalid', status: 422 }
  }
  return null
}

function validateAnswers(answers: unknown): SubmitValidationResult | null {
  if (!isPlainObject(answers)) {
    return { ok: false, error: 'answers is required', status: 400 }
  }

  const entries = Object.entries(answers)
  if (entries.length > MAX_ANSWER_KEYS) {
    return { ok: false, error: 'answers has too many keys', status: 422 }
  }

  for (const [key, value] of entries) {
    if (!key || key.length > MAX_ANSWER_KEY_LENGTH) {
      return { ok: false, error: 'answer key is invalid', status: 422 }
    }

    const serialized = JSON.stringify(value)
    if (serialized === undefined || serialized.length > MAX_ANSWER_VALUE_JSON_LENGTH) {
      return { ok: false, error: `answer ${key} is too large`, status: 422 }
    }
  }

  return null
}

export function parseSubmitBody(input: unknown): SubmitValidationResult {
  if (!isPlainObject(input)) {
    return { ok: false, error: 'body must be an object', status: 400 }
  }

  const normalized: Partial<Record<keyof typeof STRING_LIMITS, string>> = {}
  for (const field of Object.keys(STRING_LIMITS) as Array<keyof typeof STRING_LIMITS>) {
    const result = normalizeOptionalString(input, field)
    if (typeof result !== 'string') return result
    normalized[field] = field === 'email' ? result.toLowerCase() : result
  }

  if (!allowedPerfis.has(normalized.perfil as Perfil | '')) {
    return { ok: false, error: 'perfil is invalid', status: 422 }
  }

  const emailError = validateEmail(normalized.email ?? '')
  if (emailError) return emailError

  const layersMeta = input.layersMeta
  if (layersMeta !== undefined && layersMeta !== null && !isPlainObject(layersMeta)) {
    return { ok: false, error: 'layersMeta must be an object', status: 400 }
  }

  const answersError = validateAnswers(input.answers)
  if (answersError) return answersError

  return {
    ok: true,
    body: {
      communityId: normalized.communityId ?? '',
      userId: normalized.userId ?? '',
      accountId: normalized.accountId ?? '',
      onda: normalized.onda ?? '',
      school: normalized.school ?? '',
      tipo: normalized.tipo ?? '',
      perfil: (normalized.perfil ?? '') as Perfil | '',
      nomeCompleto: normalized.nomeCompleto ?? '',
      nomeAluno: normalized.nomeAluno ?? '',
      serie: normalized.serie ?? '',
      email: normalized.email ?? '',
      layersMeta: (layersMeta ?? {}) as Record<string, unknown>,
      answers: input.answers as Record<string, unknown>,
    },
  }
}
