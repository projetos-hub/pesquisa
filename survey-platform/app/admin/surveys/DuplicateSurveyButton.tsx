'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { duplicateSurvey } from './actions'

export default function DuplicateSurveyButton({
  surveyId,
  surveyTitle,
  tone = 'light',
}: {
  surveyId:    string
  surveyTitle: string
  tone?:       'light' | 'dark'
}) {
  const router = useRouter()
  const [confirming, setConfirming] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState('')

  const isDark = tone === 'dark'

  if (!confirming) {
    return (
      <button
        onClick={() => setConfirming(true)}
        className={isDark
          ? 'text-xs font-bold text-slate-400 transition-colors hover:text-slate-100'
          : 'text-gray-400 hover:text-gray-600 text-xs font-medium transition-colors'}
      >
        Duplicar
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
        Criar copia de &ldquo;{surveyTitle}&rdquo;?
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
            setError('')
            const result = await duplicateSurvey(surveyId)
            if (result?.error) { setError(result.error); return }
            if (result?.surveyId) router.push(`/admin/surveys/${result.surveyId}`)
          })
        }}
        disabled={isPending}
        className="rounded bg-[#f7941d] px-2 py-0.5 text-xs font-bold text-white transition-colors hover:bg-[#ff9f2f] disabled:bg-orange-300"
      >
        {isPending ? 'Duplicando...' : 'Sim, duplicar'}
      </button>
    </div>
  )
}
