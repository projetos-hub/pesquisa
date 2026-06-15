'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { duplicateSurvey } from './actions'

export default function DuplicateSurveyButton({
  surveyId,
  surveyTitle,
}: {
  surveyId:      string
  surveyTitle:   string
}) {
  const router = useRouter()
  const [confirming, setConfirming] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState('')

  if (!confirming) {
    return (
      <button
        onClick={() => setConfirming(true)}
        className="text-gray-400 hover:text-gray-600 text-xs font-medium transition-colors"
      >
        Duplicar
      </button>
    )
  }

  return (
    <div className="flex items-center gap-2 justify-end">
      {error && <span className="text-xs text-red-600">{error}</span>}
      <span className="text-xs text-gray-500">
        Criar cópia de &ldquo;{surveyTitle}&rdquo;?
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
            setError('')
            const result = await duplicateSurvey(surveyId)
            if (result?.error) { setError(result.error); return }
            if (result?.surveyId) router.push(`/admin/surveys/${result.surveyId}`)
          })
        }}
        disabled={isPending}
        className="text-xs text-white bg-[#F7941D] hover:bg-[#D97B10] disabled:bg-orange-300 px-2 py-0.5 rounded font-medium transition-colors"
      >
        {isPending ? 'Duplicando…' : 'Sim, duplicar'}
      </button>
    </div>
  )
}
