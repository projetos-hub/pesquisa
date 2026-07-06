'use client'

import { useActionState, useMemo, useState } from 'react'
import { createPublicResponseLink, type CreatePublicResponseLinkState } from './actions'
import { PublicJsonPreview } from './PublicJsonPreview'

interface PublicLinkCreateFormProps {
  surveyId: string
  brandNames: string[]
}

const initialState: CreatePublicResponseLinkState | null = null

export function PublicLinkCreateForm({ surveyId, brandNames }: PublicLinkCreateFormProps) {
  const [state, formAction, pending] = useActionState(createPublicResponseLink, initialState)
  const [selectedBrands, setSelectedBrands] = useState<string[]>([])

  const selectedSet = useMemo(() => new Set(selectedBrands), [selectedBrands])
  const selectedLabel = selectedBrands.length === 0
    ? 'Todas as marcas'
    : selectedBrands.length === 1
      ? selectedBrands[0]
      : `${selectedBrands.length} marcas selecionadas`

  function toggleBrand(brandName: string) {
    setSelectedBrands(current => current.includes(brandName)
      ? current.filter(item => item !== brandName)
      : [...current, brandName]
    )
  }

  return (
    <div className="flex max-w-full flex-col items-end gap-2">
      <form action={formAction} className="flex w-full max-w-[320px] flex-col items-stretch gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3">
        <input type="hidden" name="surveyId" value={surveyId} />

        <fieldset className="space-y-1.5">
          <legend className="text-xs font-bold uppercase tracking-wide text-slate-600">Marcas liberadas</legend>

          <details className="group rounded-lg border border-slate-200 bg-white">
            <summary className="flex min-h-9 cursor-pointer list-none items-center justify-between gap-2 px-3 py-2 text-left text-xs font-semibold text-slate-700 marker:hidden">
              <span className="min-w-0 truncate">{selectedLabel}</span>
              <span className="shrink-0 text-slate-400 transition-transform group-open:rotate-180">v</span>
            </summary>

            <div className="border-t border-slate-100 p-2">
              <div className="max-h-44 space-y-1 overflow-y-auto pr-1">
                {brandNames.map(brandName => (
                  <label
                    key={brandName}
                    className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-xs text-slate-700 hover:bg-slate-50"
                  >
                    <input
                      type="checkbox"
                      name="brandNames"
                      value={brandName}
                      checked={selectedSet.has(brandName)}
                      onChange={() => toggleBrand(brandName)}
                      className="h-3.5 w-3.5 rounded border-slate-300 text-slate-900"
                    />
                    <span className="min-w-0 truncate">{brandName}</span>
                  </label>
                ))}
              </div>

              {selectedBrands.length > 0 && (
                <button
                  type="button"
                  onClick={() => setSelectedBrands([])}
                  className="mt-2 rounded-md px-2 py-1 text-[11px] font-semibold text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                >
                  Limpar selecao
                </button>
              )}
            </div>
          </details>
        </fieldset>

        <div className="flex flex-wrap items-center justify-end gap-2">
          <label className="inline-flex items-center gap-1 text-xs text-gray-600">
            <input name="includePii" type="checkbox" className="h-3.5 w-3.5" />
            dados pessoais
          </label>
          <button
            type="submit"
            disabled={pending}
            className="inline-flex items-center rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {pending ? 'Criando...' : 'Criar link seguro'}
          </button>
        </div>
      </form>

      {state?.error && (
        <p className="max-w-[320px] text-right text-xs font-medium text-red-700">{state.error}</p>
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
          <div className="mt-3">
            <PublicJsonPreview fetchUrl={state.apiJsonUrl} displayUrl={state.apiJsonUrl} />
          </div>
        </div>
      )}
    </div>
  )
}