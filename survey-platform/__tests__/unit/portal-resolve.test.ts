import { beforeEach, describe, expect, it, vi } from 'vitest'

const state = vi.hoisted(() => ({
  profile: null as unknown,
  installs: [] as unknown[],
  sampleRows: [] as unknown[],
}))

vi.mock('@/lib/supabase-service', () => ({
  createServiceClient: () => ({
    from(table: string) {
      return new Query(table)
    },
  }),
}))

vi.mock('@/lib/layers-hub', () => ({
  fetchLayersUser: () => Promise.resolve(state.profile),
  fetchLayersUserAnyRole: () => Promise.resolve(state.profile),
}))

class Query {
  constructor(private table: string) {}

  select() { return this }
  eq() { return this }
  order() { return this }
  limit() { return this }

  then<TResult1 = unknown, TResult2 = never>(
    onfulfilled?: ((value: unknown) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ) {
    const value = this.table === 'survey_communities'
      ? { data: state.installs, error: null }
      : this.table === 'survey_sample_lists'
        ? { data: state.sampleRows, error: null }
        : { data: null, error: null }

    return Promise.resolve(value).then(onfulfilled, onrejected)
  }
}

function installSurvey(overrides: Record<string, unknown> = {}) {
  return {
    status: 'ativa',
    open_date: null,
    close_date: null,
    surveys: {
      id: 'survey-sample',
      slug: 'renovacao-2027',
      title: 'Intencao de renovacao 2027',
      target_roles: ['responsavel'],
      status: 'ativa',
      access_control: 'amostra',
      settings: {},
      open_date: null,
      close_date: null,
      ...overrides,
    },
  }
}

async function resolvePortal() {
  const { GET } = await import('@/app/api/portal/resolve/route')
  return GET(new Request('http://localhost/api/portal/resolve?communityId=uniao&userId=user-1'))
}

describe('portal resolve access filtering', () => {
  beforeEach(() => {
    vi.resetModules()
    state.profile = {
      nome: 'Ana',
      email: 'ana@example.com',
      perfil: 'responsavel',
      nomeAluno: 'Bruno',
      serie: '7A',
      meta: {},
    }
    state.installs = [installSurvey()]
    state.sampleRows = []
  })

  it('does not list sampled surveys when the user is not in the sample', async () => {
    const res = await resolvePortal()

    expect(res.status).toBe(200)
    await expect(res.json()).resolves.toEqual({ surveys: [] })
  })

  it('lists sampled surveys when email and Layers identity match the sample', async () => {
    state.sampleRows = [{ id: 'sample-1', layers_user_id: 'user-1' }]

    const res = await resolvePortal()

    expect(res.status).toBe(200)
    await expect(res.json()).resolves.toMatchObject({
      surveys: [{ slug: 'renovacao-2027', title: 'Intencao de renovacao 2027' }],
    })
  })

  it('does not list surveys for a disallowed role', async () => {
    state.profile = { ...(state.profile as Record<string, unknown>), perfil: 'aluno' }
    state.installs = [installSurvey({ access_control: 'aberta' })]

    const res = await resolvePortal()

    expect(res.status).toBe(200)
    await expect(res.json()).resolves.toEqual({ surveys: [] })
  })
})
