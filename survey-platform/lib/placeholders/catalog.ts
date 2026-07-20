export interface PlaceholderToken {
  key: string
  label: string
  category: 'Pessoa' | 'Aluno' | 'Escola' | 'Pesquisa' | 'Datas' | 'Link'
  example: string
}

export const PLACEHOLDER_TOKENS: PlaceholderToken[] = [
  { key: 'nome', label: 'Nome do responsavel/usuario', category: 'Pessoa', example: 'Ana' },
  { key: 'email', label: 'Email', category: 'Pessoa', example: 'ana@email.com' },
  { key: 'nomeAluno', label: 'Aluno ou filhos vinculados', category: 'Aluno', example: 'Pedro / seus filhos' },
  { key: 'aluno.nome', label: 'Aluno ou filhos vinculados', category: 'Aluno', example: 'Pedro / seus filhos' },
  { key: 'serie', label: 'Serie/turma', category: 'Aluno', example: '3F' },
  { key: 'aluno.serie', label: 'Serie/turma', category: 'Aluno', example: '3F' },
  { key: 'nomeEscola', label: 'Nome da escola', category: 'Escola', example: 'Raiz Botafogo' },
  { key: 'escola.nome', label: 'Nome da escola', category: 'Escola', example: 'Raiz Botafogo' },
  { key: 'marca', label: 'Marca', category: 'Escola', example: 'Matriz' },
  { key: 'escola.marca', label: 'Marca', category: 'Escola', example: 'Matriz' },
  { key: 'unidade', label: 'Unidade', category: 'Escola', example: 'Bangu' },
  { key: 'programaMais', label: 'Nome do programa Mais', category: 'Escola', example: 'Mais Qi' },
  { key: 'equipeMarca', label: 'Nome da equipe', category: 'Escola', example: 'Qi' },
  { key: 'mais.equipe', label: 'Nome da equipe', category: 'Escola', example: 'Qi' },
  { key: 'escola.unidade', label: 'Unidade', category: 'Escola', example: 'Bangu' },
  { key: 'school', label: 'Codigo/nome da escola', category: 'Escola', example: 'botafogo' },
  { key: 'tipo', label: 'Tipo de unidade', category: 'Escola', example: 'escola' },
  { key: 'pesquisa.titulo', label: 'Titulo da pesquisa', category: 'Pesquisa', example: 'CSAT 2026' },
  { key: 'surveyTitle', label: 'Titulo da pesquisa', category: 'Pesquisa', example: 'CSAT 2026' },
  { key: 'openDate', label: 'Data de abertura', category: 'Datas', example: '01/06/2026' },
  { key: 'closeDate', label: 'Data de encerramento', category: 'Datas', example: '30/06/2026' },
  { key: 'linkPesquisa', label: 'Link da pesquisa', category: 'Link', example: 'https://...' },
]

export const PLACEHOLDER_KEYS = new Set(PLACEHOLDER_TOKENS.map(token => token.key))

export function tokenText(key: string): string {
  return `{{${key}}}`
}
