import { describe, expect, it } from 'vitest'
import { renderPlaceholders } from '@/lib/placeholders/render'

describe('renderPlaceholders', () => {
  it('uses the provided value when it is not blank', () => {
    expect(renderPlaceholders('Ola, {{nome|familia}}!', { nome: 'Maria' }))
      .toBe('Ola, Maria!')
  })

  it('uses the fallback for empty and whitespace-only values', () => {
    expect(renderPlaceholders('{{nome|familia}}', { nome: '' })).toBe('familia')
    expect(renderPlaceholders('{{nome|familia}}', { nome: '   ' })).toBe('familia')
  })

  it('removes an unresolved token without fallback', () => {
    expect(renderPlaceholders('Equipe {{marca}}', {})).toBe('Equipe ')
  })
})
