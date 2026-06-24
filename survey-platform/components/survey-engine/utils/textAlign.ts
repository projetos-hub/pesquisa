import type { CSSProperties } from 'react'
import type { TextAlign } from './types'

export function textAlignStyle(textAlign: TextAlign | undefined): CSSProperties {
  if (textAlign !== 'justify') {
    return { textAlign: textAlign ?? 'left' }
  }

  return {
    textAlign: 'justify',
    textAlignLast: 'left',
    textJustify: 'inter-word',
  }
}

export function textAlignClassName(textAlign: TextAlign | undefined): string | undefined {
  return textAlign === 'justify' ? 'text-justify-comfort' : undefined
}
