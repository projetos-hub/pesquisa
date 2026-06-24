'use client'

import { useRef } from 'react'
import { PLACEHOLDER_TOKENS, tokenText } from '@/lib/placeholders/catalog'
import { validatePlaceholders } from '@/lib/placeholders/render'

interface PlaceholderTextFieldProps {
  label: string
  value: string
  onChange: (value: string) => void
  name?: string
  multiline?: boolean
  rows?: number
  placeholder?: string
  required?: boolean
  className?: string
  maxLength?: number
}

export function PlaceholderTextField({
  label,
  value,
  onChange,
  name,
  multiline = false,
  rows = 3,
  placeholder,
  required,
  className,
  maxLength,
}: PlaceholderTextFieldProps) {
  const ref = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null)
  const issues = validatePlaceholders(value)

  function insertToken(token: string) {
    const el = ref.current
    if (!el) {
      onChange(value + token)
      return
    }
    const start = el.selectionStart ?? value.length
    const end = el.selectionEnd ?? value.length
    const next = value.slice(0, start) + token + value.slice(end)
    onChange(next)
    window.requestAnimationFrame(() => {
      el.focus()
      const cursor = start + token.length
      el.setSelectionRange(cursor, cursor)
    })
  }

  const fieldClassName = className ?? 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#F7941D]'

  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <label className="block text-sm font-medium text-gray-700">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
        <details className="relative">
          <summary className="cursor-pointer list-none rounded-lg border border-gray-200 bg-white px-2.5 py-1 text-xs font-semibold text-gray-600 hover:border-[#F7941D] hover:text-[#D97B10]">
            Inserir variavel
          </summary>
          <div className="absolute right-0 z-30 mt-2 max-h-72 w-80 overflow-auto rounded-xl border border-gray-200 bg-white p-2 shadow-xl">
            {PLACEHOLDER_TOKENS.map(token => (
              <button
                key={token.key}
                type="button"
                onClick={() => insertToken(tokenText(token.key))}
                className="flex w-full items-center justify-between gap-3 rounded-lg px-2 py-1.5 text-left text-xs hover:bg-orange-50"
              >
                <span>
                  <span className="block font-semibold text-gray-800">{token.label}</span>
                  <span className="block text-gray-400">{token.category} - ex: {token.example}</span>
                </span>
                <code className="shrink-0 rounded bg-gray-100 px-1.5 py-0.5 text-[11px] text-gray-700">
                  {tokenText(token.key)}
                </code>
              </button>
            ))}
          </div>
        </details>
      </div>

      {multiline ? (
        <textarea
          ref={element => { ref.current = element }}
          name={name}
          value={value}
          onChange={event => onChange(event.target.value)}
          rows={rows}
          placeholder={placeholder}
          maxLength={maxLength}
          className={fieldClassName}
        />
      ) : (
        <input
          ref={element => { ref.current = element }}
          name={name}
          value={value}
          onChange={event => onChange(event.target.value)}
          placeholder={placeholder}
          maxLength={maxLength}
          className={fieldClassName}
        />
      )}

      {issues.length > 0 && (
        <p className="mt-1 text-xs text-red-600">
          {issues.map(issue => issue.message).join(', ')}
        </p>
      )}
    </div>
  )
}
