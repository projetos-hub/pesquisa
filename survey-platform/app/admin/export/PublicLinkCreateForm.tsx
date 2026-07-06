'use client'

import { useActionState } from 'react'
import { createPublicResponseLink, type CreatePublicResponseLinkState } from './actions'

interface PublicLinkCreateFormProps {
  surveyId: string
  brandNames: string[]
}

const initialState: CreatePublicResponseLinkState | null = null

export function PublicLinkCreateForm({ surveyId, brandNames }: PublicLinkCreateFormProps) {
  const [state, formAction, pending] = useActionState(createPublicResponseLink, initialState)

  return (
    <div className="flex max-w-full flex-col items-end gap-2">
      <form action={formAction} className="flex flex-wrap items-center justify-end gap-2">
        <input type="hidden" name="surveyId" value={surveyId} />
        <label className="flex flex-col gap-1 text-xs text-gray-600">
          <span>marcas liberadas</span>
          <select
            name="brandNames"
            multiple
            className="h-20 min-w-44 rounded-lg border border-gray-200 bg-white px-2 py-1 text-xs text-gray-800"
          >
            {brandNames.map(brandName => (
              <option key={brandName} value={brandName}>{brandName}</option>
            ))}
          </select>
          <span className="text-[10px] text-gray-400">sem selecao = todas</span>
        </label>
        <label className="inline-flex items-center gap-1 text-xs text-gray-600">
          <input name="includePii" type="checkbox" className="h-3.5 w-3.5" />
          incluir dados pessoais
        </label>
        <button
          type="submit"
          disabled={pending}
          className="inline-flex items-center rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pending ? 'Criando...' : 'Criar link seguro'}
        </button>
      </form>

      {state?.error && (
        <p className="max-w-[340px] text-right text-xs font-medium text-red-700">{state.error}</p>
      )}

      {state?.publicUrl && state.accessKey && state.sheetsFormula && state.apiJsonUrl && (
        <div className="max-w-[520px] rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-left text-xs text-emerald-950">
          <p className="font-bold">Link criado. Guarde a senha abaixo.</p>
          <p className="mt-1 text-emerald-800">Ela aparece apenas agora. Se perder, desative este link e crie outro.</p>
          <div className="mt-2 space-y-1 font-mono text-[11px]">
            <p className="break-all">Link: {state.publicUrl}</p>
            <p className="break-all">Senha/key: {state.accessKey}</p>
            <p className="break-all">Sheets: {state.sheetsFormula}</p>
            <p className="break-all">API JSON: {state.apiJsonUrl}</p>
          </div>
        </div>
      )}
    </div>
  )
}
