/**
 * Substitui placeholders {{variavel}} por valores reais.
 *
 * Exemplo:
 *   interpolate("Olá {{nomeAluno}}!", { nomeAluno: "João" })
 *   → "Olá João!"
 *
 * Variáveis disponíveis: nomeAluno, nome, serie, nomeEscola
 */
export function interpolate(text: string, vars: Record<string, string>): string {
  return text.replace(/\{\{(\w+)\}\}/g, (_, key: string) => vars[key] ?? '')
}
