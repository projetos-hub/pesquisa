import type { Dispatch, SetStateAction } from 'react'

import { PlaceholderTextField } from '../../../components/PlaceholderTextField'
import type { SequenceStep } from './dispatch-form-utils'

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
        <h3 className="text-sm font-semibold text-gray-700">4. Regua de disparos</h3>
        <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer select-none">
          <input type="checkbox" checked={seqMode} onChange={event => setSeqMode(event.target.checked)} className="rounded border-gray-300 text-[#F7941D]" />
          Ativar regua
        </label>
      </div>

      {!seqMode && (
        <p className="text-xs text-gray-400">
          Regua permite criar uma sequencia automatica de mensagens ao longo da pesquisa.
        </p>
      )}

      {seqMode && (
        <div className="space-y-3">
          {openDate ? (
            <p className="text-xs text-[#F7941D] bg-[#F7941D]/5 rounded-lg px-3 py-1.5">
              Base: abertura da pesquisa em {new Date(openDate).toLocaleDateString('pt-BR')}. Os dias sao relativos a essa data.
            </p>
          ) : (
            <p className="text-xs text-amber-700 bg-amber-50 rounded-lg px-3 py-1.5">
              A pesquisa nao tem data de abertura definida. Os dias serao relativos a agora.
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
                      placeholder="Rotulo"
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
                      <button type="button" onClick={() => removeStep(step.key)} className="text-gray-300 hover:text-red-500 text-sm">x</button>
                    )}
                  </div>

                  <PlaceholderTextField
                    label="Titulo especifico"
                    value={step.overrideTitle}
                    onChange={value => updateStep(step.key, 'overrideTitle', value)}
                    placeholder="Usa titulo geral se vazio"
                    className="w-full border border-gray-200 rounded-lg px-2.5 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-[#F7941D]"
                  />
                  <PlaceholderTextField
                    label="Mensagem especifica"
                    value={step.overrideBody}
                    onChange={value => updateStep(step.key, 'overrideBody', value)}
                    multiline
                    rows={2}
                    placeholder="Usa mensagem geral se vazio"
                    className="w-full border border-gray-200 rounded-lg px-2.5 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-[#F7941D]"
                  />

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
                          <PlaceholderTextField
                            label="Titulo push"
                            value={step.pushTitle}
                            onChange={value => updateStep(step.key, 'pushTitle', value)}
                            placeholder="Usa titulo do passo se vazio"
                            className="w-full border border-gray-200 rounded-lg px-2.5 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-[#F7941D]"
                          />
                          <PlaceholderTextField
                            label="Corpo push"
                            value={step.pushBody}
                            onChange={value => updateStep(step.key, 'pushBody', value)}
                            multiline
                            rows={2}
                            placeholder="Corpo push"
                            className="w-full border border-gray-200 rounded-lg px-2.5 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-[#F7941D]"
                          />
                        </div>
                      )}
                      {channels.includes('email') && (
                        <div className="space-y-1">
                          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Email</p>
                          <PlaceholderTextField
                            label="Titulo email"
                            value={step.emailTitle}
                            onChange={value => updateStep(step.key, 'emailTitle', value)}
                            placeholder="Titulo email"
                            className="w-full border border-gray-200 rounded-lg px-2.5 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-[#F7941D]"
                          />
                          <PlaceholderTextField
                            label="Corpo email"
                            value={step.emailBody}
                            onChange={value => updateStep(step.key, 'emailBody', value)}
                            multiline
                            rows={2}
                            placeholder="Corpo email"
                            className="w-full border border-gray-200 rounded-lg px-2.5 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-[#F7941D]"
                          />
                          <input
                            value={step.emailLabel}
                            onChange={event => updateStep(step.key, 'emailLabel', event.target.value)}
                            placeholder="Texto do botao CTA"
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
