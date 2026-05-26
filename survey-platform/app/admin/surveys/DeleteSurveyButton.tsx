'use client'

import { useState, useTransition } from 'react'
import { deleteSurvey } from './actions'

export default function DeleteSurveyButton({
  surveyId,
  surveyTitle,
  responseCount,
}: {
  surveyId:      string
  surveyTitle:   string
  responseCount: number
}) {
  const [confirming, setConfirming] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState('')

  if (!confirming) {
    return (
      <button
        onClick={() => setConfirming(true)}
        className="text-red-400 hover:text-red-600 text-xs font-medium transition-colors"
      >
        Apagar
      </button>
    )
  }

  return (
    <div className="flex items-center gap-2 justify-end">
      {error && <span className="text-xs text-red-600">{error}</span>}
      <span className="text-xs text-gray-500">
        {responseCount > 0 ? `Apaga ${responseCount} resposta(s). Confirma?` : 'Confirma?'}
      </span>
      <button
        onClick={() => setConfirming(false)}
        className="text-xs text-gray-500 hover:text-gray-700"
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
        className="text-xs text-white bg-red-500 hover:bg-red-600 disabled:bg-red-300 px-2 py-0.5 rounded font-medium transition-colors"
      >
        {isPending ? 'Apagando…' : `Sim, apagar "${surveyTitle}"`}
      </button>
    </div>
  )
}
