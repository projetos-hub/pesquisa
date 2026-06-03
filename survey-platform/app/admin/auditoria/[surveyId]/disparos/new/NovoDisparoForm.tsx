'use client'

import { useActionState } from 'react'
import { createBroadcast } from '../actions'

interface Community {
  id: string
  label: string
}

interface Props {
  surveyId: string
  communities: Community[]
  defaultFiredAt: string
}

type ActionResult = { error?: string; ok?: boolean } | null

async function broadcastAction(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  return createBroadcast(formData)
}

export default function NovoDisparoForm({ surveyId, communities, defaultFiredAt }: Props) {
  const [state, formAction, pending] = useActionState(broadcastAction, null)

  return (
    <form action={formAction} className="space-y-5">
      <input type="hidden" name="survey_id" value={surveyId} />

      {/* Data/hora */}
      <div>
        <label htmlFor="fired_at" className="block text-xs font-medium text-gray-600 mb-1.5">
          Data/hora do disparo <span className="text-red-500">*</span>
        </label>
        <input
          id="fired_at"
          type="datetime-local"
          name="fired_at"
          defaultValue={defaultFiredAt}
          required
          className="w-full sm:w-64 rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#F7941D]"
        />
      </div>

      {/* Canal */}
      <div>
        <label htmlFor="channel" className="block text-xs font-medium text-gray-600 mb-1.5">
          Canal <span className="text-red-500">*</span>
        </label>
        <select
          id="channel"
          name="channel"
          defaultValue="layers"
          className="w-full sm:w-48 rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#F7941D]"
        >
          <option value="layers">Layers</option>
          <option value="whatsapp">WhatsApp</option>
          <option value="email">E-mail</option>
          <option value="outro">Outro</option>
        </select>
      </div>

      {/* Comunidades */}
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-2">
          Comunidades atingidas{' '}
          <span className="font-normal text-gray-400">(deixe desmarcado = todas)</span>
        </label>
        {communities.length === 0 ? (
          <p className="text-xs text-amber-600 bg-amber-50 rounded-lg px-3 py-2 border border-amber-200">
            Nenhuma comunidade instalada nesta pesquisa.
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-48 overflow-y-auto rounded-lg border border-gray-200 p-2">
            {communities.map(c => (
              <label key={c.id} className="flex items-center gap-2 text-xs text-gray-700 cursor-pointer hover:bg-gray-50 rounded px-2 py-1.5">
                <input
                  type="checkbox"
                  name="community_ids"
                  value={c.id}
                  className="rounded border-gray-300 text-[#F7941D] focus:ring-[#F7941D]"
                />
                <span className="truncate">{c.label}</span>
              </label>
            ))}
          </div>
        )}
        <p className="mt-1 text-[11px] text-gray-400">
          Comunidades sem marca = disparo atingiu todas.
        </p>
      </div>

      {/* Observação */}
      <div>
        <label htmlFor="notes" className="block text-xs font-medium text-gray-600 mb-1.5">
          Observação <span className="font-normal text-gray-400">(opcional, máx. 500 caracteres)</span>
        </label>
        <textarea
          id="notes"
          name="notes"
          maxLength={500}
          rows={3}
          placeholder="Ex: Notificação push + email para responsáveis do 1º ano"
          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#F7941D] resize-none"
        />
      </div>

      {/* Feedback */}
      {state?.error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
          {state.error}
        </div>
      )}
      {state?.ok && (
        <div className="bg-green-50 border border-green-200 text-green-700 text-sm rounded-lg px-4 py-3">
          Disparo registrado com sucesso!
        </div>
      )}

      {/* Botões */}
      <div className="flex items-center gap-3 pt-1">
        <button
          type="submit"
          disabled={pending}
          className="bg-[#F7941D] text-white text-sm px-5 py-2 rounded-lg hover:bg-[#D97B10] transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {pending ? 'Registrando...' : 'Registrar disparo'}
        </button>
        <a
          href={`/admin/auditoria/${surveyId}`}
          className="text-sm text-gray-500 hover:text-gray-700"
        >
          Cancelar
        </a>
      </div>
    </form>
  )
}
