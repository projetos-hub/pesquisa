'use client'

import { useActionState, useRef } from 'react'
import { createDisparo } from './actions'

interface Community {
  id: string
  label: string
  status: string | null
}

interface Props {
  surveyId: string
  surveySlug: string
  surveyTitle: string
  communities: Community[]
}

type ActionResult = { error?: string; ok?: boolean } | null

async function dispararAction(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const surveyId = formData.get('survey_id') as string
  return createDisparo(surveyId, formData)
}

export default function DisparoForm({ surveyId, surveySlug, surveyTitle, communities }: Props) {
  const [state, formAction, pending] = useActionState(dispararAction, null)
  const formRef = useRef<HTMLFormElement>(null)

  return (
    <form ref={formRef} action={formAction} className="space-y-5">
      <input type="hidden" name="survey_id" value={surveyId} />
      <input type="hidden" name="survey_slug" value={surveySlug} />
      <input type="hidden" name="survey_title" value={surveyTitle} />

      {/* Comunidades */}
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-2">
          Comunidades <span className="text-red-500">*</span>
        </label>
        {communities.length === 0 ? (
          <p className="text-xs text-amber-600 bg-amber-50 rounded-lg px-3 py-2 border border-amber-200">
            Nenhuma comunidade instalada. Instale comunidades na aba principal antes de disparar.
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-48 overflow-y-auto rounded-lg border border-gray-200 p-2">
            {communities.map(c => (
              <label key={c.id} className="flex items-center gap-2 text-xs text-gray-700 cursor-pointer hover:bg-gray-50 rounded px-2 py-1.5">
                <input
                  type="checkbox"
                  name="community_ids"
                  value={c.id}
                  defaultChecked
                  className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                />
                <span className="truncate">{c.label}</span>
                {c.status && (
                  <span className={`ml-auto shrink-0 text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                    c.status === 'ativa' ? 'bg-green-100 text-green-700' :
                    c.status === 'pausada' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-gray-100 text-gray-500'
                  }`}>
                    {c.status}
                  </span>
                )}
              </label>
            ))}
          </div>
        )}
      </div>

      {/* Perfis */}
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-2">
          Perfis <span className="text-red-500">*</span>
        </label>
        <div className="flex flex-wrap gap-3">
          {[
            { value: 'responsavel', label: 'Responsáveis' },
            { value: 'aluno',       label: 'Alunos' },
            { value: 'admin',       label: 'Admins' },
          ].map(role => (
            <label key={role.value} className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
              <input
                type="checkbox"
                name="target_roles"
                value={role.value}
                defaultChecked={role.value === 'responsavel'}
                className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
              />
              {role.label}
            </label>
          ))}
        </div>
      </div>

      {/* Canal */}
      <div>
        <label htmlFor="channel" className="block text-xs font-medium text-gray-600 mb-1.5">
          Canal
        </label>
        <select
          id="channel"
          name="channel"
          defaultValue="push_email"
          className="w-full sm:w-48 rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="push_email">Push + Email</option>
          <option value="push">Só Push</option>
          <option value="email">Só Email</option>
        </select>
      </div>

      {/* Agendamento (opcional) */}
      <div>
        <label htmlFor="scheduled_at" className="block text-xs font-medium text-gray-600 mb-1.5">
          Agendar para (opcional)
        </label>
        <input
          id="scheduled_at"
          type="datetime-local"
          name="scheduled_at"
          className="w-full sm:w-64 rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
        <p className="mt-1 text-[11px] text-gray-400">
          Deixe em branco para disparar imediatamente.
        </p>
      </div>

      {/* Feedback */}
      {state?.error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
          {state.error}
        </div>
      )}
      {state?.ok && (
        <div className="bg-green-50 border border-green-200 text-green-700 text-sm rounded-lg px-4 py-3">
          Disparo realizado com sucesso!
        </div>
      )}

      {/* Botão */}
      <div className="flex gap-3 pt-1">
        <button
          type="submit"
          disabled={pending || communities.length === 0}
          className="bg-indigo-600 text-white text-sm px-5 py-2 rounded-lg hover:bg-indigo-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {pending ? 'Disparando...' : 'Disparar agora'}
        </button>
      </div>
    </form>
  )
}
