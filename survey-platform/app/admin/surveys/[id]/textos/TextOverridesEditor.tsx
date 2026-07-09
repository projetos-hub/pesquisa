'use client'

import { useMemo, useState, useTransition } from 'react'
import Link from 'next/link'
import { renderPlaceholders } from '@/lib/placeholders/render'
import type { SurveyContentOverrides } from '@/lib/survey-config'
import { saveCommunityTextOverride } from './actions'

interface TextItem {
  key: string
  type: string
  label: string
  defaultTitle: string
  defaultDescription: string
  defaultPergunta: string
}

interface CommunityTextState {
  communityId: string
  name: string
  subtitle: string
  marca: string
  unidade: string
  overrides: SurveyContentOverrides
}

interface Props {
  surveyId: string
  surveySlug: string
  items: TextItem[]
  communities: CommunityTextState[]
}

interface DraftState {
  title: string
  description: string
  pergunta: string
  thankyouMessage: string
}

const TOKENS = ['{{nomeAluno}}', '{{nomeEscola}}', '{{marca}}', '{{unidade}}', '{{serie}}']

function emptyDraft(): DraftState {
  return { title: '', description: '', pergunta: '', thankyouMessage: '' }
}

function countOverrides(overrides: SurveyContentOverrides): number {
  return Object.keys(overrides.questions ?? {}).length + (overrides.thankyou?.message ? 1 : 0)
}

function getItemOverride(community: CommunityTextState | undefined, item: TextItem): DraftState {
  if (!community) return emptyDraft()
  if (item.key === '__thankyou') {
    return { ...emptyDraft(), thankyouMessage: community.overrides.thankyou?.message ?? '' }
  }
  const override = community.overrides.questions?.[item.key]
  return {
    title: override?.title ?? '',
    description: override?.description ?? '',
    pergunta: override?.pergunta ?? '',
    thankyouMessage: '',
  }
}

function isPersonalized(community: CommunityTextState | undefined, item: TextItem): boolean {
  const draft = getItemOverride(community, item)
  return !!(draft.title || draft.description || draft.pergunta || draft.thankyouMessage)
}

function displayType(type: string): string {
  const labels: Record<string, string> = {
    welcome: 'Tela inicial',
    nps: 'NPS',
    scale: 'Escala',
    scale_sections: 'Escala com seções',
    radio: 'Escolha única',
    checkbox: 'Múltipla escolha',
    text: 'Texto livre',
    file_upload: 'Arquivo',
    thankyou: 'Tela final',
  }
  return labels[type] ?? type
}

export default function TextOverridesEditor({ surveyId, surveySlug, items, communities }: Props) {
  const [selectedCommunityId, setSelectedCommunityId] = useState(communities[0]?.communityId ?? '')
  const [selectedItemKey, setSelectedItemKey] = useState(items[0]?.key ?? '')
  const [draft, setDraft] = useState<DraftState>(() => getItemOverride(communities[0], items[0]))
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const selectedCommunity = useMemo(
    () => communities.find(community => community.communityId === selectedCommunityId),
    [communities, selectedCommunityId]
  )
  const selectedItem = useMemo(
    () => items.find(item => item.key === selectedItemKey) ?? items[0],
    [items, selectedItemKey]
  )


  const totalPersonalized = communities.reduce((sum, community) => sum + countOverrides(community.overrides), 0)
  const previewVars = {
    nomeAluno: 'Pedro',
    nomeEscola: selectedCommunity?.name ?? 'Nome da escola',
    marca: selectedCommunity?.marca || 'Marca',
    unidade: selectedCommunity?.unidade || 'Unidade',
    serie: '3F',
  }

  function chooseCommunity(community: CommunityTextState) {
    setSelectedCommunityId(community.communityId)
    setDraft(getItemOverride(community, selectedItem))
    setMessage(null)
    setError(null)
  }

  function chooseItem(item: TextItem) {
    setSelectedItemKey(item.key)
    setDraft(getItemOverride(selectedCommunity, item))
    setMessage(null)
    setError(null)
  }

  function updateDraft(field: keyof DraftState, value: string) {
    setDraft(current => ({ ...current, [field]: value }))
  }

  function appendToken(token: string) {
    if (selectedItem?.key === '__thankyou') {
      updateDraft('thankyouMessage', `${draft.thankyouMessage}${draft.thankyouMessage ? ' ' : ''}${token}`)
      return
    }
    updateDraft('description', `${draft.description}${draft.description ? ' ' : ''}${token}`)
  }

  function save() {
    if (!selectedCommunity || !selectedItem) return
    setMessage(null)
    setError(null)
    startTransition(async () => {
      const result = await saveCommunityTextOverride(surveyId, selectedCommunity.communityId, selectedItem.key, draft)
      if (result.error) {
        setError(result.error)
        return
      }
      setMessage('Texto da comunidade salvo.')
    })
  }

  function resetToDefault() {
    setDraft(emptyDraft())
  }

  if (communities.length === 0) {
    return (
      <div className="rounded-2xl border border-white/10 bg-[#0f131b]/80 p-8 text-center text-sm text-slate-400">
        Instale pelo menos uma comunidade nesta pesquisa antes de criar adaptações de texto.
      </div>
    )
  }

  if (!selectedItem) {
    return (
      <div className="rounded-2xl border border-white/10 bg-[#0f131b]/80 p-8 text-center text-sm text-slate-400">
        Nenhuma etapa editável encontrada nesta pesquisa.
      </div>
    )
  }

  const currentIsPersonalized = isPersonalized(selectedCommunity, selectedItem)
  const effectiveTitle = draft.title || selectedItem.defaultTitle
  const effectiveDescription = selectedItem.key === '__thankyou'
    ? draft.thankyouMessage || selectedItem.defaultDescription
    : draft.description || selectedItem.defaultDescription
  const effectivePergunta = draft.pergunta || selectedItem.defaultPergunta
  const previewUrl = `/p/${surveySlug}?communityId=${selectedCommunity?.communityId ?? ''}`

  return (
    <div className="grid gap-4 lg:grid-cols-[260px_minmax(260px,1fr)_360px]">
      <aside className="rounded-2xl border border-white/10 bg-[#0f131b]/80 p-3">
        <div className="mb-3 px-2">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">Comunidades</p>
          <p className="mt-1 text-xs text-slate-400">{totalPersonalized} adaptações ativas</p>
        </div>
        <div className="max-h-[620px] space-y-1 overflow-auto pr-1">
          {communities.map(community => {
            const active = community.communityId === selectedCommunityId
            const total = countOverrides(community.overrides)
            return (
              <button
                key={community.communityId}
                type="button"
                onClick={() => chooseCommunity(community)}
                className={`w-full rounded-xl border px-3 py-3 text-left transition ${active ? 'border-[#F7941D]/70 bg-[#F7941D]/12' : 'border-transparent hover:border-white/10 hover:bg-white/[0.04]'}`}
              >
                <span className="block text-sm font-semibold text-white">{community.name}</span>
                {community.subtitle && <span className="mt-0.5 block text-xs text-slate-500">{community.subtitle}</span>}
                <span className={`mt-2 inline-flex rounded-full px-2 py-0.5 text-[11px] font-bold ${total ? 'bg-emerald-400/10 text-emerald-300' : 'bg-white/5 text-slate-500'}`}>
                  {total ? `${total} personalizados` : 'Texto padrão'}
                </span>
              </button>
            )
          })}
        </div>
      </aside>

      <main className="rounded-2xl border border-white/10 bg-[#0f131b]/80 p-4">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">Etapas</p>
            <h3 className="mt-1 text-lg font-bold text-white">{selectedCommunity?.name}</h3>
          </div>
          <Link href={previewUrl} className="rounded-xl border border-white/10 bg-white/10 px-3 py-2 text-xs font-bold text-white transition hover:bg-white/15">
            Abrir link de teste
          </Link>
        </div>

        <div className="mb-4 grid gap-2 sm:grid-cols-2">
          {items.map(item => {
            const active = item.key === selectedItem.key
            const personalized = isPersonalized(selectedCommunity, item)
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => chooseItem(item)}
                className={`rounded-xl border px-3 py-3 text-left transition ${active ? 'border-[#F7941D]/70 bg-[#F7941D]/12' : 'border-white/10 bg-white/[0.03] hover:bg-white/[0.06]'}`}
              >
                <span className="block text-sm font-semibold text-white">{item.label}</span>
                <span className="mt-0.5 block text-xs text-slate-500">{displayType(item.type)}</span>
                <span className={`mt-2 inline-flex rounded-full px-2 py-0.5 text-[11px] font-bold ${personalized ? 'bg-emerald-400/10 text-emerald-300' : 'bg-white/5 text-slate-500'}`}>
                  {personalized ? 'Personalizado' : 'Usando padrão'}
                </span>
              </button>
            )
          })}
        </div>

        <div className="rounded-2xl border border-white/10 bg-[#151a24] p-4">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-bold text-white">{selectedItem.label}</p>
              <p className="text-xs text-slate-500">O texto padrão fica preservado se os campos abaixo forem deixados vazios.</p>
            </div>
            <span className={`rounded-full px-3 py-1 text-xs font-bold ${currentIsPersonalized ? 'bg-emerald-400/10 text-emerald-300' : 'bg-white/5 text-slate-500'}`}>
              {currentIsPersonalized ? 'Com adaptação' : 'Sem adaptação'}
            </span>
          </div>

          {selectedItem.key !== '__thankyou' && (
            <div className="space-y-4">
              <FieldBlock
                label="Título padrão"
                defaultText={selectedItem.defaultTitle}
                value={draft.title}
                onChange={value => updateDraft('title', value)}
              />
              <FieldBlock
                label="Descrição padrão"
                defaultText={selectedItem.defaultDescription}
                value={draft.description}
                onChange={value => updateDraft('description', value)}
                multiline
              />
              {(selectedItem.defaultPergunta || ['radio', 'text', 'checkbox', 'file_upload'].includes(selectedItem.type)) && (
                <FieldBlock
                  label="Pergunta auxiliar padrão"
                  defaultText={selectedItem.defaultPergunta}
                  value={draft.pergunta}
                  onChange={value => updateDraft('pergunta', value)}
                  multiline
                />
              )}
            </div>
          )}

          {selectedItem.key === '__thankyou' && (
            <FieldBlock
              label="Mensagem padrão"
              defaultText={selectedItem.defaultDescription}
              value={draft.thankyouMessage}
              onChange={value => updateDraft('thankyouMessage', value)}
              multiline
            />
          )}

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-slate-500">Variáveis:</span>
            {TOKENS.map(token => (
              <button
                key={token}
                type="button"
                onClick={() => appendToken(token)}
                className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-1 text-xs font-semibold text-slate-300 transition hover:bg-white/[0.08]"
              >
                {token}
              </button>
            ))}
          </div>

          <div className="mt-5 flex flex-wrap items-center justify-end gap-3">
            {error && <span className="text-sm font-semibold text-red-300">{error}</span>}
            {message && <span className="text-sm font-semibold text-emerald-300">{message}</span>}
            <button
              type="button"
              onClick={resetToDefault}
              className="rounded-xl border border-white/10 px-4 py-2 text-sm font-bold text-slate-300 transition hover:bg-white/[0.05]"
            >
              Usar texto padrão
            </button>
            <button
              type="button"
              onClick={save}
              disabled={isPending}
              className="rounded-xl bg-[#F7941D] px-4 py-2 text-sm font-bold text-white transition hover:bg-[#D97B10] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isPending ? 'Salvando...' : 'Salvar adaptação'}
            </button>
          </div>
        </div>
      </main>

      <aside className="rounded-2xl border border-white/10 bg-[#0f131b]/80 p-4">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">Preview</p>
            <h3 className="mt-1 text-lg font-bold text-white">{selectedCommunity?.name}</h3>
          </div>
          <span className="rounded-full bg-white/5 px-2 py-1 text-[11px] font-bold text-slate-400">{displayType(selectedItem.type)}</span>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 text-slate-900 shadow-xl">
          {effectiveTitle && (
            <h4 className="text-lg font-bold leading-snug">
              {renderPlaceholders(effectiveTitle, previewVars)}
            </h4>
          )}
          {effectiveDescription && (
            <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-600">
              {renderPlaceholders(effectiveDescription, previewVars)}
            </p>
          )}
          {effectivePergunta && (
            <p className="mt-4 rounded-xl bg-slate-100 p-3 text-sm font-semibold text-slate-700">
              {renderPlaceholders(effectivePergunta, previewVars)}
            </p>
          )}
          {!effectiveTitle && !effectiveDescription && !effectivePergunta && (
            <p className="text-sm leading-6 text-slate-500">
              Esta etapa usa o texto padrão dinâmico da pesquisa.
            </p>
          )}
        </div>

        <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.03] p-3 text-xs leading-5 text-slate-400">
          O preview usa dados fictícios para validar o texto. O link de teste abre a pesquisa real com a comunidade selecionada.
        </div>
      </aside>
    </div>
  )
}

function FieldBlock({
  label,
  defaultText,
  value,
  onChange,
  multiline = false,
}: {
  label: string
  defaultText: string
  value: string
  onChange: (value: string) => void
  multiline?: boolean
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-bold uppercase tracking-[0.16em] text-slate-500">{label}</span>
      <div className="mb-2 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm leading-5 text-slate-400">
        {defaultText || 'Sem texto padrão definido'}
      </div>
      {multiline ? (
        <textarea
          value={value}
          onChange={event => onChange(event.target.value)}
          rows={4}
          className="w-full resize-y rounded-xl border border-white/10 bg-[#0b0f17] px-3 py-3 text-sm leading-6 text-white outline-none transition placeholder:text-slate-600 focus:border-[#F7941D]/80"
          placeholder="Deixe vazio para herdar o texto padrão"
        />
      ) : (
        <input
          value={value}
          onChange={event => onChange(event.target.value)}
          className="w-full rounded-xl border border-white/10 bg-[#0b0f17] px-3 py-3 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-[#F7941D]/80"
          placeholder="Deixe vazio para herdar o texto padrão"
        />
      )}
    </label>
  )
}