import { renderPlaceholders } from './placeholders/render'

export function interpolate(text: string, vars: Record<string, string>): string {
  return renderPlaceholders(text, vars)
}
