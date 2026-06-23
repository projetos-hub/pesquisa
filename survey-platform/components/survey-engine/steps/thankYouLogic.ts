import type { SurveyTheme } from '@/components/survey-engine/utils/types'

export function resolveReferralLink(
  theme: SurveyTheme | undefined,
  indicacaoLinks: Record<string, string> | undefined,
  school: string,
): string | null {
  return theme?.indicacaoLink || indicacaoLinks?.[school] || null
}
