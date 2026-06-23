import { describe, expect, it } from 'vitest'
import { resolveReferralLink } from '@/components/survey-engine/steps/thankYouLogic'
import type { SurveyTheme } from '@/components/survey-engine/utils/types'

describe('resolveReferralLink', () => {
  it('prefers the theme referral link', () => {
    const theme = { indicacaoLink: 'https://theme.example' } as SurveyTheme

    expect(resolveReferralLink(theme, { escola: 'https://school.example' }, 'escola'))
      .toBe('https://theme.example')
  })

  it('falls back to the school referral link when the theme link is empty', () => {
    const theme = { indicacaoLink: '' } as SurveyTheme

    expect(resolveReferralLink(theme, { escola: 'https://school.example' }, 'escola'))
      .toBe('https://school.example')
  })

  it('returns null when no referral link is available', () => {
    expect(resolveReferralLink(undefined, {}, 'escola')).toBeNull()
  })
})
