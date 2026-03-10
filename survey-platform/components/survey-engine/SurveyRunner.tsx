'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { applyConditionals } from '@/lib/survey-config'
import { buildActiveSteps, stepId } from './utils/buildActiveSteps'
import type { Answers, SurveyConfig, SurveyContext, Perfil, NPSAnswer } from './utils/types'
import WelcomeStep from './steps/WelcomeStep'
import StepNPS from './steps/StepNPS'
import StepEscala from './steps/StepEscala'
import StepRadio from './steps/StepRadio'
import StepText from './steps/StepText'
import ThankYou from './steps/ThankYou'
import AindaNaoAberta from './steps/AindaNaoAberta'
import Encerrada from './steps/Encerrada'
import ErroSurvey from './steps/ErroSurvey'
import ProgressBar from '../ui/ProgressBar'

interface SurveyRunnerProps {
  surveySlug: string
}

export default function SurveyRunner({ surveySlug }: SurveyRunnerProps) {
  const searchParams = useSearchParams()
  const [currentKey, setCurrentKey] = useState('welcome')
  const [answers, setAnswers] = useState<Answers>({})
  const [loading, setLoading] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [ctx, setCtx] = useState<SurveyContext | null>(null)
  const [survey, setSurvey] = useState<SurveyConfig | null>(null)
  const [surveyNotFound, setSurveyNotFound] = useState(false)

  // ── Contexto de sessão (via URL params) ──────────────────────────────────────
  useEffect(() => {
    // Fase 2A+: contexto via URL params — LayersPortal será integrado na Fase 3+
    setCtx({
      userId:      '',
      communityId: searchParams.get('communityId') || '',
      session:     '',
      surveyId:    surveySlug,
      onda:        searchParams.get('onda')        || '1S2026',
      openDate:    searchParams.get('openDate')    || '',
      closeDate:   searchParams.get('closeDate')   || '',
      status:      (searchParams.get('status')     || 'aberta') as SurveyContext['status'],
      school:      searchParams.get('school')      || '',
      tipo:        searchParams.get('tipo')        || 'escola',
      nome:        searchParams.get('nome')        || searchParams.get('name') || '',
      perfil:      (searchParams.get('role')       || 'responsavel') as Perfil,
      nomeAluno:   searchParams.get('studentName') || '',
      serie:       searchParams.get('grade')       || '',
    })
  }, [surveySlug, searchParams])

  // ── Config da pesquisa (via API → Supabase) ───────────────────────────────────
  useEffect(() => {
    setSurvey(null)
    setSurveyNotFound(false)

    fetch(`/api/surveys/${surveySlug}`)
      .then(res => {
        if (res.status === 404) {
          setSurveyNotFound(true)
          return null
        }
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        return res.json() as Promise<SurveyConfig>
      })
      .then(data => {
        if (data) setSurvey(applyConditionals(data))
      })
      .catch(() => setSurveyNotFound(true))
  }, [surveySlug])

  // ── Spinner: aguarda contexto E config da pesquisa ───────────────────────────
  if (!ctx || (!survey && !surveyNotFound)) {
    return (
      <div className="card">
        <div className="header"><h1>Pesquisa de Satisfação</h1></div>
        <div className="loading-screen">
          <div className="spinner" />
          <p>Carregando...</p>
        </div>
      </div>
    )
  }

  // ── Survey não encontrado ou erro de rede ────────────────────────────────────
  if (surveyNotFound || !survey) {
    return (
      <div className="card">
        <div className="header"><h1>Pesquisa de Satisfação</h1></div>
        <ErroSurvey surveyId={surveySlug} />
      </div>
    )
  }

  const {
    surveyId, onda, openDate, closeDate, status,
    school, tipo, nome: nomeCompleto, perfil, nomeAluno, serie,
    communityId, userId,
  } = ctx

  // ── Perfil sem acesso ────────────────────────────────────────────────────────
  if (survey.publico && !survey.publico.includes(perfil)) {
    return (
      <div className="card">
        <div className="header"><h1>{survey.titulo}</h1></div>
        <div className="prazo-screen">
          <div className="icon">🔒</div>
          <h2>Pesquisa não disponível</h2>
          <p>Esta pesquisa não está disponível para o seu perfil.</p>
        </div>
      </div>
    )
  }

  // ── Prazo ────────────────────────────────────────────────────────────────────
  if (status === 'nao_aberta') {
    return (
      <div className="card">
        <div className="header"><h1>{survey.titulo}</h1></div>
        <AindaNaoAberta openDate={openDate} />
      </div>
    )
  }

  if (status === 'encerrada') {
    return (
      <div className="card">
        <div className="header"><h1>{survey.titulo}</h1></div>
        <Encerrada closeDate={closeDate} />
      </div>
    )
  }

  // ── Steps ativos ─────────────────────────────────────────────────────────────
  const activeSteps = buildActiveSteps(survey, perfil, answers)
  const currentIdx  = activeSteps.findIndex(s => stepId(s) === currentKey)
  const currentStep = activeSteps[currentIdx] || activeSteps[0]
  // isLastData = step imediatamente antes do thankyou (idêntico ao original)
  const isLastData  = currentIdx === activeSteps.length - 2

  // Steps de dados (exclui welcome e thankyou) para a progress bar
  const dataSteps = activeSteps.filter(s => s.type !== 'welcome' && s.type !== 'thankyou')
  const dataIdx   = dataSteps.findIndex(s => stepId(s) === currentKey)

  // ── Navegação ────────────────────────────────────────────────────────────────
  function next(key: string, data: unknown) {
    const newAnswers = { ...answers, [key]: data }
    setAnswers(newAnswers)

    if (isLastData) {
      submitPesquisa(newAnswers)
    } else {
      // Recalcula com newAnswers para capturar mudanças condicionais (bilíngue)
      const newActive = buildActiveSteps(survey!, perfil, newAnswers)
      const nextStep  = newActive[currentIdx + 1]
      if (nextStep) setCurrentKey(stepId(nextStep))
    }
  }

  function back() {
    if (currentIdx > 0) {
      setCurrentKey(stepId(activeSteps[currentIdx - 1]))
    }
  }

  // ── Submit ───────────────────────────────────────────────────────────────────
  async function submitPesquisa(finalAnswers: Answers) {
    setLoading(true)
    setSubmitError(null)
    try {
      const res = await fetch(`/api/surveys/${surveySlug}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          communityId,
          userId,
          onda,
          school,
          tipo,
          perfil,
          nomeCompleto,
          nomeAluno,
          serie,
          answers: finalAnswers,
        }),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error((err as { error?: string }).error ?? `HTTP ${res.status}`)
      }

      // { ok: true } ou { duplicate: true } — ambos navegam para ThankYou
      setCurrentKey('thankyou')
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Erro desconhecido'
      setSubmitError(`Erro ao enviar. ${msg}. Verifique sua conexão e tente novamente.`)
    } finally {
      setLoading(false)
    }
  }

  const isWelcome  = currentStep?.type === 'welcome'
  const isThankyou = currentStep?.type === 'thankyou'
  const npsAnswer  = answers.nps as NPSAnswer | undefined

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="card">
      <div className="header">
        <h1>{survey.titulo}</h1>
      </div>

      {!isWelcome && !isThankyou && dataSteps.length > 0 && (
        <ProgressBar step={dataIdx} total={dataSteps.length} />
      )}

      <div className="body">
        {submitError && (
          <p style={{ color: '#e53e3e', marginBottom: 16, fontWeight: 600 }}>⚠️ {submitError}</p>
        )}

        {currentStep?.type === 'welcome' && (
          <WelcomeStep
            nome={nomeCompleto} nomeAluno={nomeAluno} serie={serie}
            perfil={perfil} tipo={tipo}
            onStart={() => {
              const nextStep = activeSteps[1]
              if (nextStep) setCurrentKey(stepId(nextStep))
            }}
          />
        )}

        {currentStep?.type === 'nps' && (
          <StepNPS
            step={currentStep}
            onNext={d => next('nps', d)}
            onBack={back}
            tipo={tipo}
          />
        )}

        {currentStep?.type === 'scale' && (
          <StepEscala
            step={currentStep}
            tipo={tipo}
            onNext={d => next(currentStep.key, d)}
            onBack={back}
            isLast={isLastData}
            loading={loading}
          />
        )}

        {currentStep?.type === 'radio' && (
          <StepRadio
            step={currentStep}
            tipo={tipo}
            onNext={d => next(currentStep.key, d)}
            onBack={back}
            isLast={isLastData}
            loading={loading}
          />
        )}

        {currentStep?.type === 'text' && (
          <StepText
            step={currentStep}
            tipo={tipo}
            onNext={d => next(currentStep.key, d)}
            onBack={back}
            isLast={isLastData}
            loading={loading}
          />
        )}

        {currentStep?.type === 'thankyou' && (
          <ThankYou
            nps={npsAnswer?.nps}
            perfil={perfil}
            nomeAluno={nomeAluno}
            school={school}
            tipo={tipo}
          />
        )}
      </div>
    </div>
  )
}
