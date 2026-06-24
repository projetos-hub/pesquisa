import type { Dispatch, SetStateAction } from 'react'

import { PlaceholderTextField } from '../../../components/PlaceholderTextField'
import type { DispatchPreview } from './dispatch-form-utils'

interface MessageSectionProps {
  channels:        string[]
  title:           string
  setTitle:        Dispatch<SetStateAction<string>>
  body:            string
  setBody:         Dispatch<SetStateAction<string>>
  customPerCh:     boolean
  setCustomPerCh:  Dispatch<SetStateAction<boolean>>
  pushTitle:       string
  setPushTitle:    Dispatch<SetStateAction<string>>
  pushBody:        string
  setPushBody:     Dispatch<SetStateAction<string>>
  emailTitle:      string
  setEmailTitle:   Dispatch<SetStateAction<string>>
  emailBody:       string
  setEmailBody:    Dispatch<SetStateAction<string>>
  emailLabel:      string
  setEmailLabel:   Dispatch<SetStateAction<string>>
  emailBgUrl:      string
  setEmailBgUrl:   Dispatch<SetStateAction<string>>
  importText:      string
  setImportText:   Dispatch<SetStateAction<string>>
  showImport:      boolean
  setShowImport:   Dispatch<SetStateAction<boolean>>
  applyImport:     () => void
  personalized:    boolean
  setPersonalized: Dispatch<SetStateAction<boolean>>
  setPreview:      Dispatch<SetStateAction<DispatchPreview | null>>
}

export function MessageSection({
  channels,
  title,
  setTitle,
  body,
  setBody,
  customPerCh,
  setCustomPerCh,
  pushTitle,
  setPushTitle,
  pushBody,
  setPushBody,
  emailTitle,
  setEmailTitle,
  emailBody,
  setEmailBody,
  emailLabel,
  setEmailLabel,
  emailBgUrl,
  setEmailBgUrl,
  importText,
  setImportText,
  showImport,
  setShowImport,
  applyImport,
  personalized,
  setPersonalized,
  setPreview,
}: MessageSectionProps) {
  return (
    <section className="bg-gray-50 rounded-xl border border-gray-200 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-700">3. Mensagem</h3>
        <button type="button" onClick={() => setShowImport(value => !value)} className="text-xs text-[#F7941D] hover:underline">
          {showImport ? 'Fechar import' : 'Importar texto'}
        </button>
      </div>

      {showImport && (
        <div className="space-y-2">
          <textarea
            value={importText}
            onChange={event => setImportText(event.target.value)}
            rows={4}
            placeholder={'Cole seu texto aqui.\nPrimeira linha -> titulo\nResto -> corpo da mensagem'}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#F7941D] font-mono"
          />
          <button
            type="button"
            onClick={applyImport}
            className="bg-[#F7941D] text-white text-xs px-4 py-1.5 rounded-lg hover:bg-[#D97B10]"
          >
            Aplicar
          </button>
        </div>
      )}

      <div>
        <PlaceholderTextField
          label="Titulo"
          value={title}
          onChange={setTitle}
          maxLength={150}
          required
          placeholder="Pesquisa de Satisfacao - {{nomeEscola}}"
        />
        <p className="text-xs text-gray-400 text-right mt-0.5">{title.length}/150</p>
      </div>

      <PlaceholderTextField
        label="Mensagem"
        value={body}
        onChange={setBody}
        required
        multiline
        rows={3}
        placeholder="Ei, {{nome}}! Queremos ouvir sua opiniao sobre a experiencia de {{nomeAluno}} na escola."
      />

      <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer select-none">
        <input type="checkbox" checked={customPerCh} onChange={event => setCustomPerCh(event.target.checked)} className="rounded border-gray-300 text-[#F7941D]" />
        Personalizar mensagem por canal (push / email)
      </label>

      {customPerCh && (
        <div className="space-y-3 pl-4 border-l-2 border-[#F7941D]/10">
          {channels.includes('pushNotification') && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Push</p>
              <PlaceholderTextField label="Titulo push" value={pushTitle} onChange={setPushTitle} placeholder="Titulo push (usa titulo geral se vazio)" />
              <PlaceholderTextField label="Corpo push" value={pushBody} onChange={setPushBody} multiline rows={2} placeholder="Corpo push" />
            </div>
          )}
          {channels.includes('email') && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Email</p>
              <PlaceholderTextField label="Titulo email" value={emailTitle} onChange={setEmailTitle} placeholder="Titulo email" />
              <PlaceholderTextField label="Corpo email" value={emailBody} onChange={setEmailBody} multiline rows={2} placeholder="Corpo email" />
              <input value={emailLabel} onChange={event => setEmailLabel(event.target.value)} placeholder="Texto do botao CTA" className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#F7941D]" />
              <input value={emailBgUrl} onChange={event => setEmailBgUrl(event.target.value)} placeholder="URL imagem de fundo (opcional)" type="url" className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#F7941D]" />
            </div>
          )}
        </div>
      )}

      <div className={`rounded-lg border p-3 space-y-2 ${personalized ? 'bg-amber-50 border-amber-200' : 'border-gray-200'}`}>
        <label className="flex items-center gap-2 text-sm font-medium text-gray-700 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={personalized}
            onChange={event => { setPersonalized(event.target.checked); setPreview(null) }}
            className="rounded border-gray-300 text-[#F7941D]"
          />
          Personalizar por usuario (usar {'{{'} nome {'}}'}, {'{{'} nomeAluno {'}}'}, etc.)
        </label>
        {personalized && (
          <div className="text-xs text-amber-800 bg-amber-100 rounded-lg px-3 py-2 space-y-1">
            <p className="font-semibold">Modo personalizado ativo</p>
            <p>Cada usuario recebe uma notificacao individual com seu nome. O envio e feito em lotes de 30 a cada 5 minutos pelo sistema.</p>
            <p>Estimativa: ~150ms por usuario. O disparo continua em background mesmo apos fechar o admin.</p>
            <p className="text-amber-700">Rate limit: se a Layers retornar erro 429, o sistema recua automaticamente e retoma no proximo ciclo.</p>
          </div>
        )}
      </div>
    </section>
  )
}
