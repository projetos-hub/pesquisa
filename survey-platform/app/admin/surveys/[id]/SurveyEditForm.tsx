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
  access_control?: string
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

const ACCESS_CONTROL_OPTIONS = [
  { value: 'aberta',   label: 'Aberta (qualquer um com o link)' },
  { value: 'amostra',  label: 'Amostra Segmentada (apenas lista pré-definida)' },
]

type State = { error?: string; ok?: boolean }

const STATUS_OPTIONS = [
  { value: 'rascunho',  label: 'Rascunho' },
  { value: 'ativa',     label: 'Ativa' },
  { value: 'pausada',   label: 'Pausada' },
  { value: 'encerrada', label: 'Encerrada' },
]

function toDatetimeLocal(iso: string | null): string {
  if (!iso) return ''
  const d = new Date(new Date(iso).getTime() - 3 * 60 * 60 * 1000)
  return d.toISOString().slice(0, 16)
}

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
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#F7941D]"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
        <select
          name="survey_type"
          defaultValue={survey.survey_type}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#F7941D]"
        >
          {SURVEY_TYPES.map(({ value, label }) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
      </div>

      <div className="p-4 bg-[#F7941D]/5 rounded-xl border border-[#F7941D]/10">
        <label className="block text-sm font-bold text-gray-900 mb-2">Controle de Acesso</label>
        <div className="space-y-2">
          {ACCESS_CONTROL_OPTIONS.map(({ value, label }) => (
            <label key={value} className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="access_control"
                value={value}
                defaultChecked={survey.access_control === value || (!survey.access_control && value === 'aberta')}
                className="w-4 h-4 text-[#F7941D] border-gray-300 focus:ring-[#F7941D]"
              />
              <span className="text-sm text-gray-700">{label}</span>
            </label>
          ))}
        </div>
        <p className="text-xs text-[#F7941D]/70 mt-2">
          Se selecionar &ldquo;Amostra Segmentada&rdquo;, o sistema bloqueará qualquer pessoa cujo email não esteja na lista de amostra.
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Status <span className="text-red-500">*</span>
        </label>
        <select
          name="status"
          defaultValue={survey.status}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#F7941D]"
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
          <label className="block text-sm font-medium text-gray-700 mb-1">Data e hora de abertura</label>
          <input
            type="datetime-local"
            name="open_date"
            defaultValue={toDatetimeLocal(survey.open_date)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#F7941D]"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Data e hora de encerramento</label>
          <input
            type="datetime-local"
            name="close_date"
            defaultValue={toDatetimeLocal(survey.close_date)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#F7941D]"
          />
        </div>
      </div>
      <p className="text-xs text-gray-400 -mt-2">
        Se preenchidas, a pesquisa abrirá e encerrará automaticamente. O status manual prevalece sobre as datas.
      </p>

      <div className="pt-1">
        <button
          type="submit"
          disabled={isPending}
          className="bg-[#F7941D] text-white text-sm px-5 py-2 rounded-lg hover:bg-[#D97B10] disabled:opacity-50 transition-colors font-medium"
        >
          {isPending ? 'Salvando...' : 'Salvar alterações'}
        </button>
      </div>
    </form>
  )
}
