import type { Dispatch, SetStateAction } from 'react'

import { PLACEHOLDERS, type SequenceStep } from './dispatch-form-utils'

interface SequenceSectionProps {
  seqMode:    boolean
  setSeqMode: Dispatch<SetStateAction<boolean>>
  openDate:   string | null
  steps:      SequenceStep[]
  channels:   string[]
  updateStep: (key: string, field: keyof SequenceStep, value: string | number | boolean) => void
  addStep:    () => void
  removeStep: (key: string) => void
}

export function SequenceSection({
  seqMode,
  setSeqMode,
  openDate,
  steps,
  channels,
  updateStep,
  addStep,
  removeStep,
}: SequenceSectionProps) {
  return (
    <section className="bg-gray-50 rounded-xl border border-gray-200 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-700">4. Régua de disparos</h3>
        <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer select-none">
          <input type="checkbox" checked={seqMode} onChange={event => setSeqMode(event.target.checked)} className="rounded border-gray-300 text-[#F7941D]" />
          Ativar régua
        </label>
      </div>

      {!seqMode && (
        <p className="text-xs text-gray-400">
          Régua permite criar uma sequência automática de mensagens ao longo da pesquisa.
        </p>
      )}

      {seqMode && (
        <div className="space-y-3">
          {openDate ? (
            <p className="text-xs text-[#F7941D] bg-[#F7941D]/5 rounded-lg px-3 py-1.5">
              Base: abertura da pesquisa em {new Date(openDate).toLocaleDateString('pt-BR')}. Os dias são relativos a essa data.
            </p>
          ) : (
            <p className="text-xs text-amber-700 bg-amber-50 rounded-lg px-3 py-1.5">
              A pesquisa não tem data de abertura definida. Os dias serão relativos a agora.
            </p>
          )}

          <div className="space-y-2">
            {steps.map((step, index) => (
              <div key={step.key} className="flex items-start gap-3 bg-white rounded-lg border border-gray-200 p-3">
                <div className="flex flex-col items-center gap-1 pt-1 shrink-0">
                  <div className="w-6 h-6 rounded-full bg-[#F7941D] text-white text-xs flex items-center justify-center font-bold">
                    {index + 1}
                  </div>
                  {index < steps.length - 1 && <div className="w-px h-6 bg-[#F7941D]/20" />}
                </div>

                <div className="flex-1 space-y-2">
                  <div className="flex gap-2 items-center">
                    <input
                      value={step.label}
                      onChange={event => updateStep(step.key, 'label', event.target.value)}
                      placeholder="Rótulo"
                      className="flex-1 border border-gray-200 rounded-lg px-2.5 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-[#F7941D]"
                    />
                    <div className="flex items-center gap-1 shrink-0">
                      <span className="text-xs text-gray-500">Dia</span>
                      <input
                        type="number"
                        min={0}
                        value={step.offsetDays}
                        onChange={event => updateStep(step.key, 'offsetDays', Number(event.target.value))}
                        className="w-16 border border-gray-200 rounded-lg px-2 py-1 text-sm text-center focus:outline-none focus:ring-1 focus:ring-[#F7941D]"
                      />
                    </div>
                    {steps.length > 1 && (
                      <button type="button" onClick={() => removeStep(step.key)} className="text-gray-300 hover:text-red-500 text-sm">×</button>
                    )}
                  </div>
                  <input
                    value={step.overrideTitle}
                    onChange={event => updateStep(step.key, 'overrideTitle', event.target.value)}
                    placeholder="Título específico (usa título geral se vazio)"
                    className="w-full border border-gray-200 rounded-lg px-2.5 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-[#F7941D]"
                  />
                  <textarea
                    value={step.overrideBody}
                    onChange={event => updateStep(step.key, 'overrideBody', event.target.value)}
                    rows={2}
                    placeholder="Mensagem específica (usa mensagem geral se vazio)"
                    className="w-full border border-gray-200 rounded-lg px-2.5 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-[#F7941D]"
                  />
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-xs text-gray-400">Placeholders:</span>
                    {PLACEHOLDERS.map(placeholder => (
                      <button
                        key={placeholder}
                        type="button"
                        onClick={() => updateStep(step.key, 'overrideBody', (step.overrideBody || '') + placeholder)}
                        className="text-xs bg-gray-100 hover:bg-[#F7941D]/10 hover:text-[#D97B10] text-gray-500 rounded px-1.5 py-0.5 font-mono transition-colors"
                      >
                        {placeholder}
                      </button>
                    ))}
                  </div>

                  <label className="flex items-center gap-1.5 text-xs text-gray-500 cursor-pointer select-none pt-1">
                    <input
                      type="checkbox"
                      checked={step.customPerCh}
                      onChange={event => updateStep(step.key, 'customPerCh', event.target.checked)}
                      className="rounded border-gray-300 text-[#F7941D]"
                    />
                    Personalizar push/email neste passo
                  </label>

                  {step.customPerCh && (
                    <div className="space-y-2 pl-3 border-l-2 border-[#F7941D]/10 mt-1">
                      {channels.includes('pushNotification') && (
                        <div className="space-y-1">
                          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Push</p>
                          <input
                            value={step.pushTitle}
                            onChange={event => updateStep(step.key, 'pushTitle', event.target.value)}
                            placeholder="Título push (usa título do passo se vazio)"
                            className="w-full border border-gray-200 rounded-lg px-2.5 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-[#F7941D]"
                          />
                          <textarea
                            value={step.pushBody}
                            onChange={event => updateStep(step.key, 'pushBody', event.target.value)}
                            rows={2}
                            placeholder="Corpo push"
                            className="w-full border border-gray-200 rounded-lg px-2.5 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-[#F7941D]"
                          />
                        </div>
                      )}
                      {channels.includes('email') && (
                        <div className="space-y-1">
                          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Email</p>
                          <input
                            value={step.emailTitle}
                            onChange={event => updateStep(step.key, 'emailTitle', event.target.value)}
                            placeholder="Título email"
                            className="w-full border border-gray-200 rounded-lg px-2.5 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-[#F7941D]"
                          />
                          <textarea
                            value={step.emailBody}
                            onChange={event => updateStep(step.key, 'emailBody', event.target.value)}
                            rows={2}
                            placeholder="Corpo email"
                            className="w-full border border-gray-200 rounded-lg px-2.5 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-[#F7941D]"
                          />
                          <input
                            value={step.emailLabel}
                            onChange={event => updateStep(step.key, 'emailLabel', event.target.value)}
                            placeholder="Texto do botão CTA"
                            className="w-full border border-gray-200 rounded-lg px-2.5 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-[#F7941D]"
                          />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={addStep}
            className="text-sm text-[#F7941D] hover:text-[#D97B10] font-medium"
          >
            + Adicionar passo
          </button>
        </div>
      )}
    </section>
  )
}
