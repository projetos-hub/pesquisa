import { PLACEHOLDER_KEYS } from './catalog'

const TOKEN_RE = /\{\{([\w.]+)(?:\|([^}]+))?\}\}/g

export interface PlaceholderIssue {
  token: string
  key: string
  message: string
}

export function extractPlaceholderKeys(text: string): string[] {
  return [...text.matchAll(TOKEN_RE)].map(match => match[1])
}

export function validatePlaceholders(text: string): PlaceholderIssue[] {
  return [...text.matchAll(TOKEN_RE)]
    .filter(match => !PLACEHOLDER_KEYS.has(match[1]))
    .map(match => ({
      token: match[0],
      key: match[1],
      message: `Variavel desconhecida: ${match[0]}`,
    }))
}

function readPath(vars: Record<string, string | undefined>, key: string): string | undefined {
  if (vars[key] != null) return vars[key]

  const legacy: Record<string, string> = {
    'aluno.nome': 'nomeAluno',
    'aluno.serie': 'serie',
    'escola.nome': 'nomeEscola',
    'escola.marca': 'marca',
    'escola.unidade': 'unidade',
    'mais.nome': 'programaMais',
    'pesquisa.titulo': 'surveyTitle',
  }

  const mapped = legacy[key]
  if (mapped && vars[mapped] != null) return vars[mapped]

  return undefined
}

export function renderPlaceholders(
  text: string,
  vars: Record<string, string | undefined>
): string {
  return text.replace(TOKEN_RE, (_, key: string, fallback: string | undefined) => {
    const value = readPath(vars, key)
    return value ?? fallback ?? ''
  })
}

export function hasPlaceholderIssues(text: string): boolean {
  return validatePlaceholders(text).length > 0
}
