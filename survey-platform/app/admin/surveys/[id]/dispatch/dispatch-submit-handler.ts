import type { Dispatch, FormEvent, SetStateAction } from 'react'

import {
  buildDispatchBasePayload,
  buildSequenceStepPayload,
  resolveScheduledAt,
  type DispatchResultState,
  type DispatchScope,
  type SequenceStep,
} from './dispatch-form-utils'

interface SubmitDispatchFormInput {
  surveyId:             string
  openDate:             string | null
  roles:                string[]
  channels:             string[]
  title:                string
  body:                 string
  scope:                DispatchScope
  selectedComms:        string[]
  selectedSampleComms:  string[]
  groupComm:            string
  groupAlias:           string
  selectedSampleGroup:  string
  personalized:         boolean
  customPerCh:          boolean
  pushTitle:            string
  pushBody:             string
  emailTitle:           string
  emailBody:            string
  emailLabel:           string
  emailBgUrl:           string
  saveTemplate:         boolean
  templateName:         string
  seqMode:              boolean
  schedMode:            'immediate' | 'scheduled'
  scheduledAt:          string
  steps:                SequenceStep[]
  setLoading:           Dispatch<SetStateAction<boolean>>
  setResult:            Dispatch<SetStateAction<DispatchResultState | null>>
}

export async function submitDispatchForm(
  event: FormEvent,
  input: SubmitDispatchFormInput,
) {
  event.preventDefault()

  if (input.roles.length === 0) {
    input.setResult({ error: 'Selecione ao menos um perfil' })
    return
  }
  if (input.channels.length === 0) {
    input.setResult({ error: 'Selecione ao menos um canal' })
    return
  }
  if (!input.title.trim()) {
    input.setResult({ error: 'Título é obrigatório' })
    return
  }
  if (!input.body.trim()) {
    input.setResult({ error: 'Mensagem é obrigatória' })
    return
  }

  input.setLoading(true)
  input.setResult(null)

  const basePayload = buildDispatchBasePayload(input)

  try {
    if (!input.seqMode) {
      const scheduled = resolveScheduledAt(input.schedMode, input.scheduledAt)

      const response = await fetch(`/api/admin/surveys/${input.surveyId}/dispatch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...basePayload, scheduled_at: scheduled }),
      })
      const data = await response.json() as { ok?: boolean; sent?: number; failed?: number; error?: string; scheduled?: boolean }
      input.setResult(data.scheduled ? { ok: true, sent: 0 } : data)
      return
    }

    const sequenceId = crypto.randomUUID()
    const base = input.openDate ? new Date(input.openDate) : new Date()
    let allOk = true

    for (let index = 0; index < input.steps.length; index++) {
      const step = input.steps[index]
      const stepDate = new Date(base)
      stepDate.setDate(stepDate.getDate() + step.offsetDays)

      const response = await fetch(`/api/admin/surveys/${input.surveyId}/dispatch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildSequenceStepPayload(
          basePayload,
          step,
          index,
          stepDate,
          sequenceId,
          input.title,
          input.body,
          input.emailLabel,
          input.saveTemplate,
          input.templateName,
          input.steps,
        )),
      })
      const data = await response.json() as { ok?: boolean }
      if (!data.ok) {
        allOk = false
        break
      }
    }

    input.setResult({ ok: allOk, sent: allOk ? input.steps.length : 0 })
  } catch {
    input.setResult({ error: 'Erro de rede. Tente novamente.' })
  } finally {
    input.setLoading(false)
  }
}
