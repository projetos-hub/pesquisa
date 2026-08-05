'use client'

import { useActionState, useMemo, useState } from 'react'
import { createPublicResponseLink, type CreatePublicResponseLinkState } from './actions'
import { PublicJsonPreview } from './PublicJsonPreview'

interface Community {
  id: string
  brandName: string
  unitLabel: string
}

interface PublicLinkCreateFormProps {
  surveyId: string
  communities: Community[]
}

const initialState: CreatePublicResponseLinkState | null = null

export function PublicLinkCreateForm({ surveyId, communities }: PublicLinkCreateFormProps) {
  const [state, formAction, pending] = useActionState(createPublicResponseLink, initialState)
  const [selectedBrands, setSelectedBrands] = useState<string[]>([])
  const [selectedCommunityIds, setSelectedCommunityIds] = useState<string[]>([])

  const brandNames = useMemo(
    () => [...new Set(communities.map(c => c.brandName))].sort((a, b) => a.localeCompare(b, 'pt-BR')),
    [communities]
  )
  const selectedBrandsSet = useMemo(() => new Set(selectedBrands), [selectedBrands])
  const selectedCommunitiesSet = useMemo(() => new Set(selectedCommunityIds), [selectedCommunityIds])
  const selectedLabel = selectedBrands.length === 0
    ? 'Todas as marcas'
    : selectedBrands.length === 1
      ? `${selectedBrands[0]} · ${selectedCommunityIds.length} unidades`
      : `${selectedBrands.length} marcas · ${selectedCommunityIds.length} unidades`

  function toggleBrand(brandName: string) {
    const brandIds = communities.filter(c => c.brandName === brandName).map(c => c.id)
    if (selectedBrandsSet.has(brandName)) {
      setSelectedBrands(current => current.filter(item => item !== brandName))
      setSelectedCommunityIds(current => current.filter(id => !brandIds.includes(id)))
      return
    }
    setSelectedBrands(current => [...current, brandName])
    setSelectedCommunityIds(current => [...new Set([...current, ...brandIds])])
  }

  function toggleCommunity(communityId: string) {
    setSelectedCommunityIds(current => current.includes(communityId)
      ? current.filter(id => id !== communityId)
      : [...current, communityId])
  }

  function setBrandUnits(brandName: string, selected: boolean) {
    const brandIds = communities.filter(c => c.brandName === brandName).map(c => c.id)
    setSelectedCommunityIds(current => selected
      ? [...new Set([...current, ...brandIds])]
      : current.filter(id => !brandIds.includes(id)))
  }

  return (
    <div className="flex max-w-full flex-col items-end gap-2">
      <form action={formAction} className="flex w-full max-w-[420px] flex-col items-stretch gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3">
        <input type="hidden" name="surveyId" value={surveyId} />
        <input type="hidden" name="communitySelectionEnabled" value="1" />

        <fieldset className="space-y-1.5">
          <legend className="text-xs font-bold uppercase tracking-wide text-slate-600">Marcas e unidades liberadas</legend>
          <details className="group rounded-lg border border-slate-200 bg-white">
            <summary className="flex min-h-9 cursor-pointer list-none items-center justify-between gap-2 px-3 py-2 text-left text-xs font-semibold text-slate-700 marker:hidden">
              <span className="min-w-0 truncate">{selectedLabel}</span>
              <span className="shrink-0 text-slate-400 transition-transform group-open:rotate-180">v</span>
            </summary>
            <div className="border-t border-slate-100 p-2">
              <div className="max-h-72 space-y-1 overflow-y-auto pr-1">
                {brandNames.map(brandName => {
                  const brandCommunities = communities.filter(c => c.brandName === brandName)
                  const selectedCount = brandCommunities.filter(c => selectedCommunitiesSet.has(c.id)).length
                  const selectedBrand = selectedBrandsSet.has(brandName)
                  return (
                    <div key={brandName} className={`rounded-lg border ${selectedBrand ? 'border-orange-200 bg-orange-50/60' : 'border-transparent'}`}>
                      <label className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-xs text-slate-700 hover:bg-slate-50">
                        <input type="checkbox" name="brandNames" value={brandName} checked={selectedBrand} onChange={() => toggleBrand(brandName)} className="h-3.5 w-3.5 rounded border-slate-300 text-orange-600 focus:ring-orange-500" />
                        <span className="min-w-0 flex-1 truncate font-semibold">{brandName}</span>
                        <span className="text-[10px] text-slate-400">{selectedBrand ? `${selectedCount}/${brandCommunities.length}` : brandCommunities.length}</span>
                      </label>
                      {selectedBrand && (
                        <div className="mx-2 mb-2 border-l-2 border-orange-200 pl-2">
                          <div className="mb-1 flex items-center justify-between">
                            <span className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Unidades</span>
                            <span className="flex gap-1">
                              <button type="button" onClick={() => setBrandUnits(brandName, true)} className="rounded px-1.5 py-0.5 text-[10px] font-semibold text-slate-500 hover:bg-white">Todas</button>
                              <button type="button" onClick={() => setBrandUnits(brandName, false)} className="rounded px-1.5 py-0.5 text-[10px] font-semibold text-slate-500 hover:bg-white">Limpar</button>
                            </span>
                          </div>
                          {brandCommunities.map(community => (
                            <label key={community.id} className="flex cursor-pointer items-center gap-2 rounded px-1 py-1 text-[11px] text-slate-600 hover:bg-white">
                              <input type="checkbox" name="communityIds" value={community.id} checked={selectedCommunitiesSet.has(community.id)} onChange={() => toggleCommunity(community.id)} className="h-3.5 w-3.5 rounded border-slate-300 text-orange-600 focus:ring-orange-500" />
                              <span className="min-w-0 flex-1 truncate">{community.unitLabel}</span>
                            </label>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
              {selectedBrands.length > 0 && <button type="button" onClick={() => { setSelectedBrands([]); setSelectedCommunityIds([]) }} className="mt-2 rounded-md px-2 py-1 text-[11px] font-semibold text-slate-500 hover:bg-slate-50 hover:text-slate-900">Ver todas as marcas</button>}
            </div>
          </details>
        </fieldset>

        <div className="flex flex-wrap items-center justify-end gap-2">
          <label className="inline-flex items-center gap-1 text-xs text-gray-600"><input name="includePii" type="checkbox" className="h-3.5 w-3.5" />dados pessoais</label>
          <button type="submit" disabled={pending} className="inline-flex items-center rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60">{pending ? 'Criando...' : 'Criar link seguro'}</button>
        </div>
      </form>

      {state?.error && <p className="max-w-[420px] text-right text-xs font-medium text-red-700">{state.error}</p>}
      {state?.publicUrl && state.accessKey && state.sheetsFormula && state.apiJsonUrl && (
        <div className="max-w-[520px] rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-left text-xs text-emerald-950">
          <p className="font-bold">Link criado. Guarde a senha abaixo.</p>
          <p className="mt-1 text-emerald-800">Ela aparece apenas agora. Se perder, desative este link e crie outro.</p>
          <div className="mt-2 space-y-1 font-mono text-[11px]"><p className="break-all">Link: {state.publicUrl}</p><p className="break-all">Senha/key: {state.accessKey}</p><p className="break-all">Sheets: {state.sheetsFormula}</p><p className="break-all">API JSON: {state.apiJsonUrl}</p></div>
          <div className="mt-3"><PublicJsonPreview fetchUrl={state.apiJsonUrl} displayUrl={state.apiJsonUrl} /></div>
        </div>
      )}
    </div>
  )
}
