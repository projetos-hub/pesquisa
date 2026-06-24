'use client'

import { useState, useTransition } from 'react'
import { deleteSurvey } from './actions'

export default function DeleteSurveyButton({
  surveyId,
  surveyTitle,
  responseCount,
  tone = 'light',
}: {
  surveyId:      string
  surveyTitle:   string
  responseCount: number
  tone?:         'light' | 'dark'
}) {
  const [confirming, setConfirming] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState('')
  const isDark = tone === 'dark'

  if (!confirming) {
    return (
      <button
        onClick={() => setConfirming(true)}
        className={isDark
          ? 'text-xs font-bold text-red-300 transition-colors hover:text-red-100'
          : 'text-red-400 hover:text-red-600 text-xs font-medium transition-colors'}
      >
        Apagar
      </button>
    )
  }

  return (
    <div className="flex items-center justify-end gap-2">
      {error && (
        <span className={isDark ? 'text-xs text-red-200' : 'text-xs text-red-600'}>
          {error}
        </span>
      )}
      <span className={isDark ? 'text-xs text-slate-300' : 'text-xs text-gray-500'}>
        {responseCount > 0 ? `Apaga ${responseCount} resposta(s). Confirma?` : 'Confirma?'}
      </span>
      <button
        onClick={() => setConfirming(false)}
        className={isDark ? 'text-xs text-slate-400 hover:text-slate-100' : 'text-xs text-gray-500 hover:text-gray-700'}
        disabled={isPending}
      >
        Cancelar
      </button>
      <button
        onClick={() => {
          startTransition(async () => {
            const result = await deleteSurvey(surveyId)
            if (result?.error) setError(result.error)
          })
        }}
        disabled={isPending}
        className="rounded bg-red-500 px-2 py-0.5 text-xs font-bold text-white transition-colors hover:bg-red-600 disabled:bg-red-300"
      >
        {isPending ? 'Apagando...' : `Sim, apagar "${surveyTitle}"`}
      </button>
    </div>
  )
}
