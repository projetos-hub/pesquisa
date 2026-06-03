'use client'

import { useState, useTransition } from 'react'
import { updateExpectedResponses } from './actions'

interface Props {
  surveyId: string
  communityId: string
  initialValue: number | null
}

export default function ExpectedResponsesEditor({
  surveyId,
  communityId,
  initialValue,
}: Props) {
  const [value, setValue] = useState(initialValue?.toString() ?? '')
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleBlur() {
    const parsed = value === '' ? null : parseInt(value, 10)
    if (parsed === initialValue) return
    if (value !== '' && (isNaN(parsed as number) || (parsed as number) < 0)) {
      setError('Valor inválido')
      return
    }

    setError(null)
    startTransition(async () => {
      const result = await updateExpectedResponses(surveyId, communityId, parsed)
      if (result.error) {
        setError(result.error)
      } else {
        setSaved(true)
        setTimeout(() => setSaved(false), 2000)
      }
    })
  }

  return (
    <div className="flex items-center gap-1.5">
      <input
        type="number"
        min={0}
        value={value}
        onChange={e => {
          setValue(e.target.value)
          setSaved(false)
          setError(null)
        }}
        onBlur={handleBlur}
        disabled={isPending}
        placeholder="—"
        className="w-20 rounded border border-gray-200 px-2 py-0.5 text-xs text-gray-700 focus:outline-none focus:ring-1 focus:ring-[#F7941D] disabled:opacity-50"
      />
      {isPending && (
        <span className="text-[10px] text-gray-400">salvando...</span>
      )}
      {saved && !isPending && (
        <span className="text-[10px] text-green-600">salvo</span>
      )}
      {error && (
        <span className="text-[10px] text-red-500" title={error}>!</span>
      )}
    </div>
  )
}
