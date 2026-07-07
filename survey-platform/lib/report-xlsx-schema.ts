import type { OptionRow, QuestionRow, SessionRow } from '@/lib/report-queries'

export type ColDef = {
  header: string
  getValue: (ans: Record<string, unknown>) => unknown
}

export const META_HEADERS = [
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
  'serie',
  'turma',
  'answeredAt',
]

function buildOptionsByQuestion(options: OptionRow[]): Record<string, OptionRow[]> {
  return options.reduce(
    (acc, option) => {
      if (!acc[option.question_id]) acc[option.question_id] = []
      acc[option.question_id].push(option)
      return acc
    },
    {} as Record<string, OptionRow[]>
  )
}

function stringifyAnswer(value: unknown): string {
  if (Array.isArray(value)) return value.join(', ')
  return typeof value === 'string' ? value : value != null ? String(value) : ''
}

export function buildColumnSchema(questions: QuestionRow[], options: OptionRow[]): ColDef[] {
  const cols: ColDef[] = []
  const optsByQuestion = buildOptionsByQuestion(options)

  for (const q of questions) {
    if (q.type === 'welcome' || q.type === 'thankyou') continue

    if (q.type === 'nps') {
      cols.push({
        header: q.title,
        getValue: ans => (ans[q.key] as { nps?: number } | undefined)?.nps ?? '',
      })
      continue
    }

    if (q.type === 'scale') {
      for (const opt of optsByQuestion[q.id] ?? []) {
        cols.push({
          header: opt.label,
          getValue: ans => {
            const row = ans[q.key] as Record<string, number | string> | undefined
            if (!row) return ''
            const byIndex = row[String(opt.order_index)]
            return byIndex != null ? byIndex : row[opt.label] ?? ''
          },
        })
      }
      continue
    }

    if (q.type === 'scale_sections') {
      cols.push({
        header: q.title,
        getValue: ans => {
          const val = ans[q.key]
          return val ? JSON.stringify(val) : ''
        },
      })
      continue
    }

    if (q.type === 'text' || q.type === 'radio' || q.type === 'checkbox') {
      cols.push({
        header: q.title,
        getValue: ans => stringifyAnswer(ans[q.key]),
      })
    }
  }

  return cols
}

export function getMetaValues(s: SessionRow, surveyTitle: string): unknown[] {
  return [
    s.id,
    surveyTitle,
    s.marca ?? '',
    s.unidade ?? '',
    s.nome_escola ?? s.school ?? s.community_id,
    s.community_id,
    s.user_id,
    s.perfil === 'aluno' ? s.nome_aluno || '' : s.nome_responsavel || '',
    s.email || '',
    s.perfil === 'aluno' ? 'estudante' : 'responsavel',
    s.serie || '',
    s.turma || '',
    s.submitted_at,
  ]
}
