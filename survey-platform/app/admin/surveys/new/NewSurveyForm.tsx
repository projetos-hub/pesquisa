'use client'

import { useActionState } from 'react'
import Link from 'next/link'
import { createSurvey } from '../actions'

type State = { error?: string }

export default function NewSurveyForm() {
  const [state, formAction, isPending] = useActionState(
    async (_prev: State, formData: FormData): Promise<State> => {
      const result = await createSurvey(formData)
      return result ?? {}
    },
    {}
  )

  return (
    <form action={formAction} className="space-y-5">
      {state.error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-3 py-2">
          {state.error}
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Título <span className="text-red-500">*</span>
        </label>
        <input
          name="title"
          required
          placeholder="Pesquisa de Satisfação 2026"
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Slug (URL) <span className="text-red-500">*</span>
        </label>
        <div className="flex items-center gap-2">
          <span className="text-gray-400 text-sm shrink-0">/p/</span>
          <input
            name="slug"
            required
            placeholder="csat-2026"
            pattern="[a-z0-9\-]+"
            title="Apenas letras minúsculas, números e hífens"
            className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <p className="text-xs text-gray-400 mt-1">
          Apenas letras minúsculas, números e hífens. Não pode ser alterado depois.
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
        <select
          name="survey_type"
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="quantitativa">Quantitativa (escala + NPS)</option>
          <option value="qualitativa">Qualitativa (perguntas abertas)</option>
        </select>
      </div>

      <div className="p-4 bg-indigo-50 rounded-xl border border-indigo-100">
        <label className="block text-sm font-bold text-indigo-900 mb-2">Controle de Acesso</label>
        <div className="space-y-2">
          {[
            { value: 'aberta',   label: 'Aberta (qualquer um com o link)', defaultChecked: true },
            { value: 'amostra',  label: 'Amostra Segmentada (apenas lista pré-definida)', defaultChecked: false },
          ].map(({ value, label, defaultChecked }) => (
            <label key={value} className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="access_control"
                value={value}
                defaultChecked={defaultChecked}
                className="w-4 h-4 text-indigo-600 border-gray-300 focus:ring-indigo-500"
              />
              <span className="text-sm text-gray-700">{label}</span>
            </label>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Público <span className="text-red-500">*</span>
        </label>
        <div className="flex gap-4">
          {[
            { value: 'responsavel', label: 'Responsável', checked: true },
            { value: 'aluno',       label: 'Aluno',       checked: false },
          ].map(({ value, label, checked }) => (
            <label key={value} className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
              <input
                type="checkbox"
                name="target_roles"
                value={value}
                defaultChecked={checked}
                className="rounded border-gray-300 text-indigo-600"
              />
              {label}
            </label>
          ))}
        </div>
      </div>

      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          disabled={isPending}
          className="bg-indigo-600 text-white text-sm px-5 py-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors font-medium"
        >
          {isPending ? 'Criando...' : 'Criar pesquisa'}
        </button>
        <Link
          href="/admin/surveys"
          className="text-sm px-5 py-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
        >
          Cancelar
        </Link>
      </div>
    </form>
  )
}
