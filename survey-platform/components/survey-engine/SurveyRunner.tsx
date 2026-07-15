'use client'

import { useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { buildActiveSteps, stepId } from './utils/buildActiveSteps'
import type {
  Answers, SurveyContext, NPSAnswer,
  WelcomeStepDef, NPSStepDef, ScaleStepDef, RadioStepDef,
  TextStepDef, CheckboxStepDef, FileUploadStepDef,
} from './utils/types'
import { useSurveyBootstrap } from './hooks/useSurveyBootstrap'
import WelcomeStep from './steps/WelcomeStep'
import StepNPS from './steps/StepNPS'
import StepEscala from './steps/StepEscala'
import StepRadio from './steps/StepRadio'
import StepText from './steps/StepText'
import StepCheckbox from './steps/StepCheckbox'
import StepFileUpload from './steps/StepFileUpload'
import ThankYou from './steps/ThankYou'
import SubmitErrorAlert from './SubmitErrorAlert'
import {
  AccessDeniedCard,
  ClosedCard,
  LoadingSurveyCard,
  NotOpenCard,
  PausedCard,
  RoleDeniedCard,
  SurveyNotFoundCard,
} from './SurveyRunnerStates'
import ProgressBar from '../ui/ProgressBar'

interface SurveyRunnerProps {
  surveySlug: string
}


function pruneAnswersForSteps(answers: Answers, steps: { type: string; key?: string }[]): Answers {
  const activeKeys = new Set(steps.map(step => step.key).filter((key): key is string => Boolean(key)))
  return Object.fromEntries(Object.entries(answers).filter(([key]) => activeKeys.has(key)))
}

export default function SurveyRunner({ surveySlug }: SurveyRunnerProps) {
  const searchParams = useSearchParams()
  const { ctx, survey, surveyNotFound, accessDenied, theme, loadingLogoUrl } = useSurveyBootstrap(surveySlug, searchParams)
  const [currentKey, setCurrentKey] = useState('welcome')
  const [answers, setAnswers] = useState<Answers>({})
  const [loading, setLoading] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submitted, setSubmitted] = useState(false)

  // ── Loading personalizado por comunidade ─────────────────────────────────────
  // ── Comunidade não autorizada ─────────────────────────────────────────────────
  if (accessDenied) {
    return <AccessDeniedCard />
  }

  if (!ctx || (!survey && !surveyNotFound)) {
    return <LoadingSurveyCard loadingLogoUrl={loadingLogoUrl} />
  }

  // ── Survey não encontrado ou erro de rede ────────────────────────────────────
  if (surveyNotFound || !survey) {
    return <SurveyNotFoundCard surveySlug={surveySlug} />
  }

  const {
    onda,
    school, tipo, nome: nomeCompleto, perfil, nomeAluno, serie, turma,
    communityId, userId, accountId, email, layersMeta,
  } = ctx

  // Status e datas: instalação do banco tem prioridade sobre URL params
  const status    = (survey.installation?.status    ?? ctx.status)    as SurveyContext['status']
  const openDate  =  survey.installation?.open_date  ?? ctx.openDate
  const closeDate =  survey.installation?.close_date ?? ctx.closeDate

  // themeVars: CSS custom properties para o card container
  const themeVars = theme?.primaryColor
    ? {
        '--color-primary':   theme.primaryColor,
        '--color-secondary': theme.secondaryColor ?? theme.primaryColor,
      } as React.CSSProperties
    : undefined

  // ── Perfil sem acesso ────────────────────────────────────────────────────────
  const allowAllRoles = (survey.settings as { allow_all_roles?: boolean } | undefined)?.allow_all_roles
  if (!allowAllRoles && survey.publico && !survey.publico.includes(perfil)) {
    return <RoleDeniedCard title={survey.titulo} />
  }

  // ── Prazo ────────────────────────────────────────────────────────────────────
  if (status === 'nao_aberta') {
    return <NotOpenCard title={survey.titulo} openDate={openDate} />
  }

  if (status === 'encerrada') {
    return <ClosedCard title={survey.titulo} closeDate={closeDate} />
  }

  if (status === 'pausada') {
    return <PausedCard title={survey.titulo} themeVars={themeVars} />
  }

  // ── Steps ativos ─────────────────────────────────────────────────────────────
  const activeSteps = buildActiveSteps(survey, perfil, answers)
  const currentIdx  = activeSteps.findIndex(s => stepId(s) === currentKey)
  const currentStep = activeSteps[currentIdx] || activeSteps[0]

  // Steps de dados (exclui welcome e thankyou) para a progress bar
  const dataSteps = activeSteps.filter(s => s.type !== 'welcome' && s.type !== 'thankyou')
  const dataIdx   = dataSteps.findIndex(s => stepId(s) === currentKey)

  // isLastData = o passo atual é o último que contém perguntas (não é welcome nem thankyou)
  const lastDataStep = dataSteps[dataSteps.length - 1]
  const isLastData   = lastDataStep && stepId(lastDataStep) === currentKey

  // ── Navegação ────────────────────────────────────────────────────────────────
  function next(key: string, data: unknown) {
    const nextAnswers = { ...answers, [key]: data }
    const newActive = buildActiveSteps(survey!, perfil, nextAnswers)
    const prunedAnswers = pruneAnswersForSteps(nextAnswers, newActive)
    setAnswers(prunedAnswers)

    const newDataSteps = newActive.filter(s => s.type !== 'welcome' && s.type !== 'thankyou')
    const newLastDataStep = newDataSteps[newDataSteps.length - 1]
    const isCurrentLastData = Boolean(newLastDataStep && stepId(newLastDataStep) === currentKey)

    if (isCurrentLastData) {
      submitPesquisa(prunedAnswers, newActive)
    } else {
      const currentIndexInNewActive = newActive.findIndex(s => stepId(s) === currentKey)
      const nextStep  = newActive[currentIndexInNewActive + 1]
      if (nextStep) setCurrentKey(stepId(nextStep))
    }
  }
  function back() {
    if (currentStep?.type === 'thankyou') return
    if (currentIdx > 0) {
      setCurrentKey(stepId(activeSteps[currentIdx - 1]))
    }
  }

  // ── Submit ───────────────────────────────────────────────────────────────────
  async function submitPesquisa(finalAnswers: Answers, stepsSnapshot: typeof activeSteps) {
    setLoading(true)
    setSubmitError(null)
    try {
      const res = await fetch(`/api/surveys/${surveySlug}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          communityId,
          userId,
          accountId,
          onda,
          school,
          tipo,
          perfil,
          nomeCompleto,
          nomeAluno,
          serie,
          turma,
          email,
          layersMeta,
          answers: finalAnswers,
        }),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error((err as { error?: string }).error ?? `HTTP ${res.status}`)
      }

      // Se existir um step de agradecimento no config, vai para ele.
      // Caso contrário, fica no estado de enviado (podemos mostrar algo ou apenas travar).
      const hasThankYouStep = stepsSnapshot.some(s => s.type === 'thankyou')
      if (hasThankYouStep) {
        setCurrentKey('thankyou')
      } else {
        setSubmitted(true)
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Erro desconhecido'
      setSubmitError(`${msg}. Verifique sua conexao e tente novamente.`)
    } finally {
      setLoading(false)
    }
  }

  function retrySubmit() {
    submitPesquisa(answers, activeSteps)
  }

  const isThankyou = currentStep?.type === 'thankyou' || (submitted && !submitError)
  const npsKey     = activeSteps.find(s => s.type === 'nps')?.key ?? 'nps'
  const npsAnswer  = answers[npsKey] as NPSAnswer | undefined

  // ── Lookup table de renderers por tipo de step ────────────────────────────────
  // CC de renderCurrentStep cai de 11 para ~3 com esta abordagem.
  // Adicionar novo tipo: inserir entry aqui, sem tocar no fluxo principal.
  type StepRenderer = () => React.ReactElement | null
  const STEP_RENDERERS: Record<string, StepRenderer> = {
    welcome: () => (
      <WelcomeStep
        step={currentStep! as WelcomeStepDef}
        nome={nomeCompleto} nomeAluno={nomeAluno} serie={serie}
        perfil={perfil} tipo={tipo}
        theme={theme}
        onStart={() => {
          const nextStep = activeSteps[1]
          if (nextStep) setCurrentKey(stepId(nextStep))
        }}
      />
    ),
    nps: () => {
      const s = currentStep! as NPSStepDef
      return <StepNPS key={s.key} step={s} onNext={d => next(s.key, d)} onBack={back} tipo={tipo} />
    },
    scale: () => {
      const s = currentStep! as ScaleStepDef
      return <StepEscala key={s.key} step={s} tipo={tipo} onNext={d => next(s.key, d)} onBack={back} isLast={isLastData} loading={loading} />
    },
    radio: () => {
      const s = currentStep! as RadioStepDef
      return <StepRadio key={s.key} step={s} tipo={tipo} onNext={d => next(s.key, d)} onBack={back} isLast={isLastData} loading={loading} />
    },
    text: () => {
      const s = currentStep! as TextStepDef
      return <StepText key={s.key} step={s} tipo={tipo} onNext={d => next(s.key, d)} onBack={back} isLast={isLastData} loading={loading} />
    },
    checkbox: () => {
      const s = currentStep! as CheckboxStepDef
      return <StepCheckbox key={s.key} step={s} tipo={tipo} onNext={d => next(s.key, d)} onBack={back} isLast={isLastData} loading={loading} />
    },
    file_upload: () => {
      const s = currentStep! as FileUploadStepDef
      return <StepFileUpload key={s.key} step={s} tipo={tipo} onNext={d => next(s.key, d)} onBack={back} isLast={isLastData} loading={loading} />
    },
  }

  // ── Render exclusivo — apenas 1 step montado por vez (CC = 3) ─────────────────
  function renderCurrentStep() {
    if (isThankyou) {
      return (
        <ThankYou
          nps={npsAnswer?.nps}
          perfil={perfil}
          nomeAluno={nomeAluno}
          school={school}
          tipo={tipo}
          theme={theme}
          indicacaoLinks={survey!.settings?.indicacao_links}
        />
      )
    }
    const renderer = currentStep?.type ? STEP_RENDERERS[currentStep.type] : null
    return renderer?.() ?? null
  }

  const isWelcome = currentStep?.type === 'welcome' && !submitted

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="card" style={themeVars}>
      <div className="header">
        <h1>{survey.titulo}</h1>
      </div>

      {!isWelcome && !isThankyou && dataSteps.length > 0 && (
        <ProgressBar step={dataIdx} total={dataSteps.length} />
      )}

      <div className="body">
        {submitError && (
          <SubmitErrorAlert message={submitError} loading={loading} onRetry={retrySubmit} />
        )}

        {renderCurrentStep()}
      </div>
    </div>
  )
}
