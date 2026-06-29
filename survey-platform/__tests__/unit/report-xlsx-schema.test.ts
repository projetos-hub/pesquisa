import { describe, expect, it } from 'vitest'

import { buildColumnSchema, getMetaValues, META_HEADERS } from '@/lib/report-xlsx-schema'
import { scaleColor, XLSX_COLORS } from '@/lib/report-xlsx-formatting'
import type { OptionRow, QuestionRow, SessionRow } from '@/lib/report-queries'

const questions: QuestionRow[] = [
  { id: 'welcome', key: 'welcome', type: 'welcome', title: 'Welcome', order_index: 0 },
  { id: 'nps', key: 'nps', type: 'nps', title: 'NPS', order_index: 1 },
  { id: 'scale', key: 'pedagogico', type: 'scale', title: 'Pedagogico', order_index: 2 },
  { id: 'text', key: 'comentario', type: 'text', title: 'Comentario', order_index: 3 },
  { id: 'checkbox', key: 'motivos', type: 'checkbox', title: 'Motivos', order_index: 4 },
  { id: 'sections', key: 'secao', type: 'scale_sections', title: 'Secoes', order_index: 5 },
  { id: 'thankyou', key: 'thankyou', type: 'thankyou', title: 'Thanks', order_index: 6 },
]

const options: OptionRow[] = [
  { question_id: 'scale', order_index: 0, label: 'Clareza' },
  { question_id: 'scale', order_index: 1, label: 'Atendimento' },
]

describe('report-xlsx-schema', () => {
  it('builds raw export columns and skips structural steps', () => {
    const schema = buildColumnSchema(questions, options)

    expect(schema.map(col => col.header)).toEqual([
      'NPS',
      'Clareza',
      'Atendimento',
      'Comentario',
      'Motivos',
      'Secoes',
    ])
  })

  it('extracts answers by type using index and label fallbacks', () => {
    const schema = buildColumnSchema(questions, options)
    const answers = {
      nps: { nps: 9 },
      pedagogico: { '0': 5, Atendimento: 4 },
      comentario: 123,
      motivos: ['preco', 'tempo'],
      secao: { bloco: { nota: 4 } },
    }

    expect(schema.map(col => col.getValue(answers))).toEqual([
      9,
      5,
      4,
      '123',
      'preco, tempo',
      JSON.stringify({ bloco: { nota: 4 } }),
    ])
  })

  it('returns empty values for missing answers', () => {
    const schema = buildColumnSchema(questions, options)

    expect(schema.map(col => col.getValue({}))).toEqual(['', '', '', '', '', ''])
  })

  it('builds meta values by respondent profile', () => {
    const base = {
      id: 'session-1',
      survey_id: 'survey-1',
      community_id: 'school-1',
      nome_escola: 'Colegio Qi Valqueire',
      marca: 'Colegio Qi',
      unidade: 'Valqueire',
      user_id: 'user-1',
      submitted_at: '2026-06-23T10:00:00Z',
      nome_responsavel: 'Maria',
      nome_aluno: 'Joao',
      serie: '3A',
      email: 'maria@example.com',
      school: 'school-1',
      onda: '1',
      responses: [],
    } satisfies Omit<SessionRow, 'perfil'>

    expect(META_HEADERS).toEqual([
      'postId',
      'title',
      'Marca',
      'Unidade',
      'Nome da Comunidade',
      'community_id',
      'userId',
      'userName',
      'userEmail',
      'tipoRespondente',
      'answeredAt',
    ])
    expect(getMetaValues({ ...base, perfil: 'aluno' }, 'Pesquisa')).toEqual([
      'session-1',
      'Pesquisa',
      'Colegio Qi',
      'Valqueire',
      'Colegio Qi Valqueire',
      'school-1',
      'user-1',
      'Joao',
      'maria@example.com',
      'estudante',
      '2026-06-23T10:00:00Z',
    ])
    expect(getMetaValues({ ...base, perfil: 'responsavel' }, 'Pesquisa')[7]).toBe('Maria')
  })

  it('maps scale averages to color bands', () => {
    expect(scaleColor(null)).toBe('FFFFFFFF')
    expect(scaleColor(4.5)).toBe(XLSX_COLORS.verde)
    expect(scaleColor(3.5)).toBe(XLSX_COLORS.amarelo)
    expect(scaleColor(3.49)).toBe(XLSX_COLORS.vermelho)
  })
})