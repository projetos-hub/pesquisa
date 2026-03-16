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
import AcessoNegado from './steps/AcessoNegado'
import ProgressBar from '../ui/ProgressBar'
import type { LayersPortalWindow } from '@/lib/layers'

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
  const [accessDenied, setAccessDenied] = useState(false)

  // ── Contexto de sessão (LayersPortal com fallback para URL params) ───────────
  useEffect(() => {
    async function loadCtx() {
      let userId      = ''
      let communityId = searchParams.get('communityId') || ''
      let session     = ''

      let accountId = searchParams.get('accountId') || ''

      // Tenta obter dados reais da Layers — fallback para URL params se não disponível
      if (typeof window !== 'undefined' && (window as LayersPortalWindow).LayersPortal) {
        try {
          await Promise.race([
            (window as LayersPortalWindow).LayersPortal!.connectedPromise,
            new Promise<void>((_, reject) =>
              setTimeout(() => reject(new Error('LayersPortal timeout')), 3000)
            ),
          ])
          userId      = (window as LayersPortalWindow).LayersPortal!.userId      || ''
          communityId = (window as LayersPortalWindow).LayersPortal!.communityId || communityId
          accountId   = (window as LayersPortalWindow).LayersPortal!.accountId   || accountId
          session     = (window as LayersPortalWindow).LayersPortal!.session     || ''
        } catch {
          // LayersPortal indisponível — usa URL params
        }
      }

      setCtx({
        userId,
        communityId,
        accountId,
        session,
        surveyId:  surveySlug,
        onda:      searchParams.get('onda')        || '1S2026',
        openDate:  searchParams.get('openDate')    || '',
        closeDate: searchParams.get('closeDate')   || '',
        status:    (searchParams.get('status')     || 'aberta') as SurveyContext['status'],
        school:    searchParams.get('school')      || '',
        tipo:      searchParams.get('tipo')        || 'escola',
        nome:      searchParams.get('nome')        || searchParams.get('name') || '',
        perfil:    (searchParams.get('role')       || 'responsavel') as Perfil,
        nomeAluno: searchParams.get('studentName') || '',
        serie:     searchParams.get('grade')       || '',
      })
    }

    loadCtx()
  }, [surveySlug, searchParams])

  // ── Config da pesquisa (via API → Supabase) ───────────────────────────────────
  useEffect(() => {
    setSurvey(null)
    setSurveyNotFound(false)

    const communityId = searchParams.get('communityId') ?? ''
    const qs = communityId ? `?communityId=${encodeURIComponent(communityId)}` : ''

    fetch(`/api/surveys/${surveySlug}${qs}`)
      .then(res => {
        if (res.status === 404) { setSurveyNotFound(true); return null }
        if (res.status === 403) { setAccessDenied(true); return null }
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        return res.json() as Promise<SurveyConfig>
      })
      .then(data => {
        if (data) setSurvey(applyConditionals(data))
      })
      .catch(() => setSurveyNotFound(true))
  // eslint-disable-next-line react-hooks/exhaustive-deps
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

  // ── Comunidade não autorizada ─────────────────────────────────────────────────
  if (accessDenied) {
    return (
      <div className="card">
        <div className="header"><h1>Pesquisa de Satisfação</h1></div>
        <AcessoNegado />
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
    onda,
    school, tipo, nome: nomeCompleto, perfil, nomeAluno, serie,
    communityId, userId,
  } = ctx

  // Status e datas: instalação do banco tem prioridade sobre URL params
  const status    = (survey.installation?.status    ?? ctx.status)    as SurveyContext['status']
  const openDate  =  survey.installation?.open_date  ?? ctx.openDate
  const closeDate =  survey.installation?.close_date ?? ctx.closeDate

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
            theme={survey.settings?.theme}
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
            indicacaoLinks={survey.settings?.indicacao_links}
          />
        )}
      </div>
    </div>
  )
}
