import { describe, expect, it } from 'vitest'

import {
  buildCommunityThemePayload,
  getCommunityDatesPayload,
  toDatetimeLocal,
} from '@/app/admin/surveys/[id]/communities/community-theme-utils'

describe('community-theme-utils', () => {
  it('converts UTC ISO date to Brasilia datetime-local value', () => {
    expect(toDatetimeLocal('2026-06-23T15:30:00.000Z')).toBe('2026-06-23T12:30')
    expect(toDatetimeLocal(null)).toBe('')
  })

  it('builds theme payload without sending empty strings', () => {
    const formData = new FormData()
    formData.set('nomeEscola', 'Escola A')
    formData.set('primaryColor', '#123456')
    formData.set('secondaryColor', '')
    formData.set('logo', 'https://example.com/logo.svg')
    formData.set('indicacaoLink', '')
    formData.set('welcomeMessage', 'Ola')

    expect(buildCommunityThemePayload(formData)).toEqual({
      nomeEscola: 'Escola A',
      primaryColor: '#123456',
      secondaryColor: undefined,
      logo: 'https://example.com/logo.svg',
      indicacaoLink: undefined,
      welcomeMessage: 'Ola',
      thankyouMessage: undefined,
    })
  })

  it('builds nullable community date payload', () => {
    const formData = new FormData()
    formData.set('open_date', '2026-06-23T12:00')
    formData.set('close_date', '')

    expect(getCommunityDatesPayload(formData)).toEqual({
      openDate: '2026-06-23T12:00',
      closeDate: null,
    })
  })
})
