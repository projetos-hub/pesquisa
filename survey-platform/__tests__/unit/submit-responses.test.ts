import { describe, expect, it } from 'vitest'
import { buildQuestionMap, buildResponseRows, hasOnlyUnknownAnswerKeys } from '@/lib/submit-responses'

describe('submit response mapping', () => {
  const questions = [
    { id: 'question-nps', key: 'nps' },
    { id: 'question-comment', key: 'comentario' },
  ]

  it('maps valid answer keys to response insert rows', () => {
    const rows = buildResponseRows(
      'session-1',
      { nps: 10, comentario: 'Muito bom' },
      buildQuestionMap(questions),
    )

    expect(rows).toEqual([
      {
        session_id: 'session-1',
        question_id: 'question-nps',
        question_key: 'nps',
        value: 10,
      },
      {
        session_id: 'session-1',
        question_id: 'question-comment',
        question_key: 'comentario',
        value: 'Muito bom',
      },
    ])
  })

  it('ignores unknown answer keys without blocking valid answers', () => {
    const rows = buildResponseRows(
      'session-1',
      { nps: 8, skipped_conditional: 'ignored' },
      buildQuestionMap(questions),
    )

    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({
      question_id: 'question-nps',
      question_key: 'nps',
      value: 8,
    })
    expect(hasOnlyUnknownAnswerKeys({ nps: 8, skipped_conditional: 'ignored' }, rows)).toBe(false)
  })

  it('allows empty answer objects', () => {
    const rows = buildResponseRows('session-1', {}, buildQuestionMap(questions))

    expect(rows).toEqual([])
    expect(hasOnlyUnknownAnswerKeys({}, rows)).toBe(false)
  })

  it('flags submissions where every provided answer key is unknown', () => {
    const rows = buildResponseRows(
      'session-1',
      { removed_question: 'value' },
      buildQuestionMap(questions),
    )

    expect(rows).toEqual([])
    expect(hasOnlyUnknownAnswerKeys({ removed_question: 'value' }, rows)).toBe(true)
  })
})
