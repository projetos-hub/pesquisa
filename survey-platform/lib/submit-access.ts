import type { Perfil } from '@/components/survey-engine/utils/types'

export interface SubmitSurveyAccess {
  access_control: 'aberta' | 'amostra' | string | null
  target_roles: string[] | null
  settings: Record<string, unknown> | null
}

export interface SubmitSampleRow {
  id: string
  layers_user_id: string | null
}

export function surveyAllowsAllRoles(survey: SubmitSurveyAccess): boolean {
  return (survey.settings as { allow_all_roles?: boolean } | null)?.allow_all_roles === true
}

export function isPerfilAllowedForSubmit(
  survey: SubmitSurveyAccess,
  perfil: Perfil | '',
): boolean {
  if (surveyAllowsAllRoles(survey)) return true

  const roles = survey.target_roles ?? []
  if (roles.length === 0) return true
  if (!perfil) return false

  return roles.includes(perfil)
}

export function isSampleAccessControl(survey: SubmitSurveyAccess): boolean {
  return survey.access_control === 'amostra'
}

export function sampleRowMatchesIdentity(
  sampleRow: SubmitSampleRow,
  identityUserId: string,
): boolean {
  return !sampleRow.layers_user_id || sampleRow.layers_user_id === identityUserId
}
