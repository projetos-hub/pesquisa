'use client'

import { useActionState } from 'react'
import { updateSurvey } from '../actions'

interface Survey {
  id: string
  title: string
  status: string
  survey_type: string
  open_date: string | null
  close_date: string | null
}

const SURVEY_TYPES = [
  { value: 'quantitativa',  label: 'Quantitativa (escala + NPS)' },
  { value: 'qualitativa',   label: 'Qualitativa (perguntas abertas)' },
  { value: 'evento',        label: 'Evento (avaliação pós-evento)' },
  { value: 'clima',         label: 'Clima organizacional' },
  { value: 'engajamento',   label: 'Engajamento' },
  { value: 'diagnostico',   label: 'Diagnóstico' },
  { value: 'misto',         label: 'Misto (aberta + fechada)' },
]

type State = { error?: string; ok?: boolean }

const STATUS_OPTIONS = [
  { value: 'rascunho',  label: 'Rascunho' },
  { value: 'ativa',     label: 'Ativa' },
  { value: 'pausada',   label: 'Pausada' },
  { value: 'encerrada', label: 'Encerrada' },
]

export default function SurveyEditForm({ survey }: { survey: Survey }) {
  const [state, formAction, isPending] = useActionState(
    async (_prev: State, formData: FormData): Promise<State> => {
      const result = await updateSurvey(survey.id, formData)
      return result?.error
        ? { error: result.error, ok: false }
        : { ok: true }
    },
    {}
  )

  return (
    <form action={formAction} className="space-y-4">
      {state.error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-3 py-2">
          {state.error}
        </div>
      )}
      {state.ok && (
        <div className="bg-green-50 border border-green-200 text-green-700 text-sm rounded-lg px-3 py-2">
          ✓ Salvo com sucesso
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Título <span className="text-red-500">*</span>
        </label>
        <input
          name="title"
          defaultValue={survey.title}
          required
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
        <select
          name="survey_type"
          defaultValue={survey.survey_type}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          {SURVEY_TYPES.map(({ value, label }) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Status <span className="text-red-500">*</span>
        </label>
        <select
          name="status"
          defaultValue={survey.status}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          {STATUS_OPTIONS.map(({ value, label }) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
        <p className="text-xs text-gray-400 mt-1">
          &ldquo;Ativa&rdquo; torna a pesquisa acessível para respondentes.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Data de abertura</label>
          <input
            type="date"
            name="open_date"
            defaultValue={survey.open_date ? survey.open_date.slice(0, 10) : ''}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Data de encerramento</label>
          <input
            type="date"
            name="close_date"
            defaultValue={survey.close_date ? survey.close_date.slice(0, 10) : ''}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </div>

      <div className="pt-1">
        <button
          type="submit"
          disabled={isPending}
          className="bg-indigo-600 text-white text-sm px-5 py-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors font-medium"
        >
          {isPending ? 'Salvando...' : 'Salvar alterações'}
        </button>
      </div>
    </form>
  )
}
