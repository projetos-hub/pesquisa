import { describe, expect, it } from 'vitest'
import { getEffectiveSurveyStatus, isEffectivelyOpen } from '@/lib/survey-status'

const NOW = new Date('2026-06-29T12:00:00.000Z')

describe('survey status helpers', () => {
  it('closes an active survey after close_date', () => {
    const status = getEffectiveSurveyStatus({
      status: 'ativa',
      close_date: '2026-06-27T23:59:59.000Z',
    }, NOW)

    expect(status).toBe('encerrada')
  })

  it('marks active surveys with future open_date as not open yet', () => {
    const status = getEffectiveSurveyStatus({
      status: 'ativa',
      open_date: '2026-07-01T00:00:00.000Z',
    }, NOW)

    expect(status).toBe('nao_aberta')
  })

  it('keeps paused surveys paused until their close date passes', () => {
    expect(getEffectiveSurveyStatus({
      status: 'pausada',
      close_date: '2026-07-01T00:00:00.000Z',
    }, NOW)).toBe('pausada')

    expect(getEffectiveSurveyStatus({
      status: 'pausada',
      close_date: '2026-06-27T23:59:59.000Z',
    }, NOW)).toBe('encerrada')
  })

  it('only treats the effective active status as open', () => {
    expect(isEffectivelyOpen({ status: 'ativa' }, NOW)).toBe(true)
    expect(isEffectivelyOpen({ status: 'ativa', close_date: '2026-06-27T23:59:59.000Z' }, NOW)).toBe(false)
  })
})
