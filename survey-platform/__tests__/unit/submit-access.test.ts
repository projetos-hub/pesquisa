import { describe, expect, it } from 'vitest'
import {
  isPerfilAllowedForSubmit,
  isSampleAccessControl,
  sampleRowMatchesIdentity,
  surveyAllowsAllRoles,
  type SubmitSurveyAccess,
} from '@/lib/submit-access'

function survey(overrides: Partial<SubmitSurveyAccess> = {}): SubmitSurveyAccess {
  return {
    access_control: 'aberta',
    target_roles: ['responsavel', 'aluno'],
    settings: {},
    ...overrides,
  }
}

describe('submit access rules', () => {
  it('allows configured respondent roles and rejects missing or unknown roles', () => {
    expect(isPerfilAllowedForSubmit(survey(), 'responsavel')).toBe(true)
    expect(isPerfilAllowedForSubmit(survey(), 'aluno')).toBe(true)
    expect(isPerfilAllowedForSubmit(survey(), 'colaborador')).toBe(false)
    expect(isPerfilAllowedForSubmit(survey(), '')).toBe(false)
  })

  it('allows every role when the survey setting explicitly opts in', () => {
    const openToAll = survey({ settings: { allow_all_roles: true } })

    expect(surveyAllowsAllRoles(openToAll)).toBe(true)
    expect(isPerfilAllowedForSubmit(openToAll, 'colaborador')).toBe(true)
    expect(isPerfilAllowedForSubmit(openToAll, '')).toBe(true)
  })

  it('detects sample access control', () => {
    expect(isSampleAccessControl(survey({ access_control: 'amostra' }))).toBe(true)
    expect(isSampleAccessControl(survey({ access_control: 'aberta' }))).toBe(false)
  })

  it('matches sample rows with unresolved or matching Layers user ids', () => {
    expect(sampleRowMatchesIdentity({ id: 'sample-1', layers_user_id: null }, 'user-1')).toBe(true)
    expect(sampleRowMatchesIdentity({ id: 'sample-1', layers_user_id: 'user-1' }, 'user-1')).toBe(true)
    expect(sampleRowMatchesIdentity({ id: 'sample-1', layers_user_id: 'user-2' }, 'user-1')).toBe(false)
  })
})
