import { beforeEach, describe, expect, it, vi } from 'vitest'

const state = vi.hoisted(() => ({
  supabase: null as unknown,
  layersProfile: null as unknown,
}))

vi.mock('@/lib/supabase-service', () => ({
  createServiceClient: () => state.supabase,
}))

vi.mock('@/lib/rate-limit', () => ({
  checkRateLimit: () => ({ allowed: true, retryAfter: 0 }),
  getClientIp: () => '127.0.0.1',
}))

vi.mock('@/lib/layers-hub', () => ({
  fetchLayersUser: () => Promise.resolve(state.layersProfile),
  fetchLayersUserAnyRole: () => Promise.resolve(state.layersProfile),
}))

interface Scenario {
  survey?: Record<string, unknown> | null
  installation?: Record<string, unknown> | null
  sampleRows?: Array<Record<string, unknown>>
  sessionUpserts?: Array<{ data: Array<{ id: string }> | null; error: unknown }>
  existingSession?: { id: string } | null
  responseCount?: number | null
  responseCountError?: unknown
  questions?: Array<{ id: string; key: string }>
  responsesError?: unknown
  deletes?: Array<{ table: string; filters: Array<[string, unknown]> }>
}

class QueryBuilder {
  private operation: 'select' | 'upsert' | 'insert' | 'delete' = 'select'
  private filters: Array<[string, unknown]> = []

  constructor(private table: string, private scenario: Scenario, private selectOptions?: { count?: string; head?: boolean }) {}

  select(_columns: string, options?: { count?: string; head?: boolean }) {
    this.selectOptions = options
    if (this.operation === 'upsert') {
      return Promise.resolve(this.scenario.sessionUpserts?.shift() ?? { data: [{ id: 'session-1' }], error: null })
    }
    return this
  }

  upsert() {
    this.operation = 'upsert'
    return this
  }

  insert() {
    this.operation = 'insert'
    return this
  }

  delete() {
    this.operation = 'delete'
    return this
  }

  eq(column: string, value: unknown) {
    this.filters.push([column, value])
    return this
  }

  limit() {
    return this
  }

  single() {
    return Promise.resolve(this.result())
  }

  maybeSingle() {
    return Promise.resolve(this.result(true))
  }

  then<TResult1 = unknown, TResult2 = never>(
    onfulfilled?: ((value: unknown) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ) {
    return Promise.resolve(this.result()).then(onfulfilled, onrejected)
  }

  private result() {
    if (this.operation === 'delete') {
      this.scenario.deletes?.push({ table: this.table, filters: this.filters })
      return { data: null, error: null }
    }

    if (this.operation === 'insert') {
      return { data: null, error: this.table === 'responses' ? this.scenario.responsesError ?? null : null }
    }

    if (this.table === 'surveys') {
      return { data: this.scenario.survey ?? null, error: this.scenario.survey === null ? { message: 'not found' } : null }
    }

    if (this.table === 'survey_communities') {
      return { data: this.scenario.installation ?? null, error: null }
    }

    if (this.table === 'survey_sample_lists') {
      return { data: this.scenario.sampleRows ?? [], error: null }
    }

    if (this.table === 'response_sessions') {
      return { data: this.scenario.existingSession ?? null, error: null }
    }

    if (this.table === 'responses' && this.selectOptions?.head) {
      return { count: this.scenario.responseCount ?? 0, error: this.scenario.responseCountError ?? null }
    }

    if (this.table === 'questions') {
      return { data: this.scenario.questions ?? [{ id: 'question-nps', key: 'nps' }], error: null }
    }

    return { data: null, error: null }
  }
}

function createSupabaseMock(scenario: Scenario) {
  return {
    from(table: string) {
      return new QueryBuilder(table, scenario)
    },
  }
}

async function postSubmit(body: Record<string, unknown>) {
  const { POST } = await import('@/app/api/surveys/[slug]/submit/route')
  return POST(
    new Request('http://localhost/api/surveys/csat/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }),
    { params: Promise.resolve({ slug: 'csat' }) },
  )
}

function baseScenario(overrides: Scenario = {}): Scenario {
  return {
    survey: {
      id: 'survey-1',
      access_control: 'aberta',
      target_roles: ['responsavel'],
      settings: {},
    },
    installation: { id: 'installation-1' },
    sessionUpserts: [{ data: [{ id: 'session-1' }], error: null }],
    questions: [{ id: 'question-nps', key: 'nps' }],
    deletes: [],
    ...overrides,
  }
}

describe('submit route controlled flows', () => {
  beforeEach(() => {
    vi.resetModules()
    state.layersProfile = null
  })

  it('saves a valid open survey submission', async () => {
    const scenario = baseScenario()
    state.supabase = createSupabaseMock(scenario)

    const res = await postSubmit({
      communityId: 'community-1',
      userId: 'user-1',
      perfil: 'responsavel',
      answers: { nps: 9 },
    })

    expect(res.status).toBe(200)
    await expect(res.json()).resolves.toMatchObject({ ok: true, sessionId: 'session-1' })
  })

  it('returns duplicate when an existing session already has responses', async () => {
    const scenario = baseScenario({
      sessionUpserts: [{ data: [], error: null }],
      existingSession: { id: 'existing-session' },
      responseCount: 1,
    })
    state.supabase = createSupabaseMock(scenario)

    const res = await postSubmit({
      communityId: 'community-1',
      userId: 'user-1',
      perfil: 'responsavel',
      answers: { nps: 9 },
    })

    expect(res.status).toBe(200)
    await expect(res.json()).resolves.toEqual({ duplicate: true })
  })

  it('clears an incomplete duplicate session and retries in the same request', async () => {
    const scenario = baseScenario({
      sessionUpserts: [
        { data: [], error: null },
        { data: [{ id: 'retry-session' }], error: null },
      ],
      existingSession: { id: 'orphan-session' },
      responseCount: 0,
    })
    state.supabase = createSupabaseMock(scenario)

    const res = await postSubmit({
      communityId: 'community-1',
      userId: 'user-1',
      perfil: 'responsavel',
      answers: { nps: 9 },
    })

    expect(res.status).toBe(200)
    await expect(res.json()).resolves.toMatchObject({ ok: true, sessionId: 'retry-session' })
    expect(scenario.deletes).toContainEqual({
      table: 'response_sessions',
      filters: [['id', 'orphan-session']],
    })
  })

  it('blocks sampled surveys when the trusted Layers email is not in the community sample', async () => {
    const scenario = baseScenario({
      survey: {
        id: 'survey-1',
        access_control: 'amostra',
        target_roles: ['responsavel'],
        settings: {},
      },
      sampleRows: [],
    })
    state.supabase = createSupabaseMock(scenario)
    state.layersProfile = {
      nome: 'Ana',
      email: 'ana@example.com',
      perfil: 'responsavel',
      nomeAluno: 'Bruno',
      serie: '7A',
      meta: {},
    }

    const res = await postSubmit({
      communityId: 'community-1',
      userId: 'user-1',
      perfil: 'responsavel',
      answers: { nps: 9 },
    })

    expect(res.status).toBe(403)
    await expect(res.json()).resolves.toMatchObject({ error: 'not_in_sample' })
  })

  it('compensates the session when response insert fails', async () => {
    const scenario = baseScenario({ responsesError: { message: 'insert failed' } })
    state.supabase = createSupabaseMock(scenario)

    const res = await postSubmit({
      communityId: 'community-1',
      userId: 'user-1',
      perfil: 'responsavel',
      answers: { nps: 9 },
    })

    expect(res.status).toBe(500)
    await expect(res.json()).resolves.toEqual({ error: 'Failed to save responses' })
    expect(scenario.deletes).toContainEqual({
      table: 'response_sessions',
      filters: [['id', 'session-1']],
    })
  })
})
