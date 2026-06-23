import { describe, expect, it } from 'vitest'

import {
  applyQuestionMetadata,
  buildQuestionOptions,
  moveQuestionLocally,
  parseOptionLabels,
} from '@/app/admin/surveys/[id]/question-editor-utils'
import type { QuestionRow } from '@/app/admin/surveys/[id]/useQuestionForm'

function question(id: string, order_index: number, title = id): QuestionRow {
  return {
    id,
    order_index,
    type: 'text',
    key: id,
    title,
    description: null,
    required: true,
    settings: { existing: true },
    options: [],
  }
}

describe('question-editor-utils', () => {
  it('parses and builds option rows', () => {
    expect(parseOptionLabels(' A \n\nB\n C ')).toEqual(['A', 'B', 'C'])
    expect(buildQuestionOptions(['A', 'B'])).toEqual([
      { id: '0', order_index: 0, label: 'A' },
      { id: '1', order_index: 1, label: 'B' },
    ])
  })

  it('moves questions locally by swapping order indexes', () => {
    const questions = [question('a', 0), question('b', 1), question('c', 2)]

    expect(moveQuestionLocally(questions, 'b', 'up').map(q => q.id)).toEqual(['b', 'a', 'c'])
    expect(moveQuestionLocally(questions, 'c', 'down').map(q => q.id)).toEqual(['a', 'b', 'c'])
    expect(moveQuestionLocally(questions, 'missing', 'up').map(q => q.id)).toEqual(['a', 'b', 'c'])
  })

  it('applies metadata while preserving unrelated settings', () => {
    const updated = applyQuestionMetadata([question('a', 0)], 'a', {
      type: 'radio',
      key: 'nova_key',
      title: 'Nova pergunta',
      description: '',
      required: false,
      pergunta: 'Texto',
      placeholder: 'Placeholder',
      accept: '.pdf',
      correctAnswer: 'Sim',
    })

    expect(updated[0]).toMatchObject({
      type: 'radio',
      key: 'nova_key',
      title: 'Nova pergunta',
      description: null,
      required: false,
      settings: {
        existing: true,
        pergunta: 'Texto',
        placeholder: 'Placeholder',
        accept: '.pdf',
        correctAnswer: 'Sim',
      },
    })
  })
})
