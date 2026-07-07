import type { DispatchResultState, DispatchTemplate } from './dispatch-form-utils'

interface ResultFeedbackProps {
  result:  DispatchResultState | null
  seqMode: boolean
}

export function ResultFeedback({ result, seqMode }: ResultFeedbackProps) {
  if (result?.error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-3 py-2">
        {result.error}
      </div>
    )
  }

  if (!result?.ok) return null

  return (
    <div className="bg-green-50 border border-green-200 text-green-700 text-sm rounded-lg px-3 py-2">
      {seqMode
        ? `Regua criada com ${result.sent} disparos agendados`
        : result.sent === 0
          ? 'Disparo agendado com sucesso'
          : `Enviado para ${result.sent} comunidade(s)${result.failed ? ` - ${result.failed} com falha` : ''}`
      }
    </div>
  )
}

interface TemplateLoaderProps {
  templates:    DispatchTemplate[]
  loadTemplate: (template: DispatchTemplate) => void
}

export function TemplateLoader({ templates, loadTemplate }: TemplateLoaderProps) {
  if (templates.length === 0) return null

  return (
    <div>
      <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">
        Usar template
      </label>
      <select
        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#F7941D]"
        onChange={event => {
          const template = templates.find(item => item.id === event.target.value)
          if (template) loadTemplate(template)
        }}
        defaultValue=""
      >
        <option value="">Sem template</option>
        {templates.map(template => (
          <option key={template.id} value={template.id}>{template.template_name}</option>
        ))}
      </select>
    </div>
  )
}

interface ChannelsSectionProps {
  channels:      string[]
  toggleChannel: (channel: string) => void
}

export function ChannelsSection({ channels, toggleChannel }: ChannelsSectionProps) {
  return (
    <section className="bg-gray-50 rounded-xl border border-gray-200 p-4 space-y-2">
      <h3 className="text-sm font-semibold text-gray-700 mb-1">2. Canais de envio</h3>
      <div className="flex gap-6">
        {[
          ['pushNotification', 'Push notification'],
          ['email', 'Email'],
        ].map(([value, label]) => (
          <label key={value} className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
            <input type="checkbox" checked={channels.includes(value)} onChange={() => toggleChannel(value)} className="rounded border-gray-300 text-[#F7941D]" />
            {label}
          </label>
        ))}
      </div>
    </section>
  )
}

interface FinalOptionsSectionProps {
  seqMode:         boolean
  schedMode:       'immediate' | 'scheduled'
  setSchedMode:    (mode: 'immediate' | 'scheduled') => void
  scheduledAt:     string
  setScheduledAt:  (value: string) => void
  saveTemplate:    boolean
  setSaveTemplate: (value: boolean) => void
  templateName:    string
  setTemplateName: (value: string) => void
  loading:         boolean
  stepsCount:      number
}

export function FinalOptionsSection({
  seqMode,
  schedMode,
  setSchedMode,
  scheduledAt,
  setScheduledAt,
  saveTemplate,
  setSaveTemplate,
  templateName,
  setTemplateName,
  loading,
  stepsCount,
}: FinalOptionsSectionProps) {
  return (
    <>
      {!seqMode && (
        <section className="bg-gray-50 rounded-xl border border-gray-200 p-4 space-y-3">
          <h3 className="text-sm font-semibold text-gray-700">5. Quando enviar</h3>
          <div className="flex gap-6">
            {([['immediate', 'Enviar agora'], ['scheduled', 'Agendar']] as const).map(([value, label]) => (
              <label key={value} className="flex items-center gap-1.5 text-sm text-gray-700 cursor-pointer">
                <input type="radio" name="schedMode" value={value} checked={schedMode === value} onChange={() => setSchedMode(value)} className="text-[#F7941D]" />
                {label}
              </label>
            ))}
          </div>
          {schedMode === 'scheduled' && (
            <input
              type="datetime-local"
              value={scheduledAt}
              onChange={event => setScheduledAt(event.target.value)}
              required
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#F7941D]"
            />
          )}
        </section>
      )}

      <section className="bg-gray-50 rounded-xl border border-gray-200 p-4 space-y-2">
        <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer select-none">
          <input type="checkbox" checked={saveTemplate} onChange={event => setSaveTemplate(event.target.checked)} className="rounded border-gray-300 text-[#F7941D]" />
          Salvar como template para reutilizar
        </label>
        {saveTemplate && (
          <input
            value={templateName}
            onChange={event => setTemplateName(event.target.value)}
            placeholder="Nome do template (ex: Convite CSAT 2026)"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#F7941D]"
          />
        )}
      </section>

      <div className="flex gap-3 pt-1">
        <button
          type="submit"
          disabled={loading}
          className="bg-[#F7941D] text-white text-sm px-6 py-2 rounded-lg hover:bg-[#D97B10] disabled:opacity-50 transition-colors font-medium"
        >
          {loading
            ? 'Enviando...'
            : seqMode
              ? `Criar regua com ${stepsCount} passo(s)`
              : schedMode === 'scheduled'
                ? 'Agendar disparo'
                : 'Disparar agora'}
        </button>
      </div>
    </>
  )
}

