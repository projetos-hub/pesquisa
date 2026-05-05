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
import StepCheckbox from './steps/StepCheckbox'
import StepFileUpload from './steps/StepFileUpload'
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

const STORAGE_BASE = process.env.NEXT_PUBLIC_SUPABASE_URL
  ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/school-assets`
  : null

export default function SurveyRunner({ surveySlug }: SurveyRunnerProps) {
  const searchParams = useSearchParams()

  // communityId disponível imediatamente via URL params — usado no loading
  const initialCommunityId = searchParams.get('communityId') ?? ''
  const loadingLogoUrl = STORAGE_BASE && initialCommunityId
    ? `${STORAGE_BASE}/${initialCommunityId}/logo.png`
    : null
  const [currentKey, setCurrentKey] = useState('welcome')
  const [answers, setAnswers] = useState<Answers>({})
  const [loading, setLoading] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [ctx, setCtx] = useState<SurveyContext | null>(null)
  const [survey, setSurvey] = useState<SurveyConfig | null>(null)
  const [surveyNotFound, setSurveyNotFound] = useState(false)
  const [accessDenied, setAccessDenied] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  // ── Contexto de sessão (LayersPortal + Layers Hub API) ──────────────────────
  useEffect(() => {
    async function loadCtx() {
      let userId      = ''
      let communityId = searchParams.get('communityId') || ''
      let session     = ''
      let accountId   = searchParams.get('accountId')   || ''

      // 1. Tenta obter contexto do LayersPortal
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

      // 2. Enriquece com dados da Layers Hub API (nome, perfil, nomeAluno)
      //    URL params têm prioridade (útil para testes)
      let hubNome      = ''
      let hubPerfil: Perfil = 'responsavel'
      let hubNomeAluno = ''
      let hubSerie     = ''
      let hubEmail     = ''
      let hubMeta: Record<string, unknown> = {}

      const effectiveId = userId || accountId
      if (effectiveId && communityId) {
        try {
          const qs = new URLSearchParams({ userId: effectiveId, communityId, surveySlug })
          const res = await fetch(`/api/user-context?${qs}`)
          if (res.ok) {
            const profile = await res.json() as {
              nome: string; perfil: Perfil; nomeAluno: string; serie: string
              email: string; meta: Record<string, unknown>
            } | null
            if (profile) {
              hubNome      = profile.nome      || ''
              hubPerfil    = profile.perfil    || 'responsavel'
              hubNomeAluno = profile.nomeAluno || ''
              hubSerie     = profile.serie     || ''
              hubEmail     = profile.email     || ''
              hubMeta      = profile.meta      || {}
            }
            // profile null = sem role familiar (admin puro, teacher, etc.)
            // hubPerfil fica 'responsavel' (default), survey.publico bloqueia no render
          }
        } catch {
          // Hub API indisponível — continua com URL params
        }
      }

      // Hub API tem prioridade sobre URL params para campos com acentos.
      // URL params do Layers podem vir com encoding Latin-1 (%E3 em vez de %C3%A3),
      // produzindo \ufffd ao decodificar como UTF-8. O Hub API retorna JSON UTF-8 correto.
      // URL params ficam como fallback (testes sem userId real).
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
        nome:       hubNome      || searchParams.get('nome') || searchParams.get('name') || '',
        perfil:     ((searchParams.get('role') || hubPerfil) as Perfil),
        nomeAluno:  hubNomeAluno || searchParams.get('studentName') || '',
        serie:      hubSerie     || searchParams.get('grade')       || '',
        email:      hubEmail,
        layersMeta: hubMeta,
      })
    }

    loadCtx()
  }, [surveySlug, searchParams])

  // ── Config da pesquisa (via API → Supabase) ───────────────────────────────────
  // Aguarda ctx para usar communityId do LayersPortal (não só URL params)
  useEffect(() => {
    if (!ctx) return

    setSurvey(null)
    setSurveyNotFound(false)
    setAccessDenied(false)

    const params = new URLSearchParams()
    if (ctx.communityId) params.append('communityId', ctx.communityId)
    if (ctx.email) params.append('email', ctx.email)

    const qs = params.toString() ? `?${params.toString()}` : ''

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
  }, [surveySlug, ctx])

  // ── Tema: injeta CSS vars no :root para afetar o fundo do layout ─────────────
  useEffect(() => {
    const primary   = survey?.installation?.theme?.primaryColor   ?? survey?.settings?.theme?.primaryColor
    const secondary = survey?.installation?.theme?.secondaryColor ?? survey?.settings?.theme?.secondaryColor
    if (primary) {
      document.documentElement.style.setProperty('--color-primary', primary)
      document.documentElement.style.setProperty('--color-secondary', secondary ?? primary)
    }
  }, [survey])

  // ── Loading personalizado por comunidade ─────────────────────────────────────
  if (!ctx || (!survey && !surveyNotFound)) {
    return (
      <div className="card loading-card">
        {loadingLogoUrl && (
          <img
            src={loadingLogoUrl}
            alt=""
            className="loading-logo-pulse"
            onError={e => { e.currentTarget.style.display = 'none' }}
          />
        )}
        <div className="loading-dots">
          <span className="loading-dot" />
          <span className="loading-dot" />
          <span className="loading-dot" />
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
    communityId, userId, accountId, email, layersMeta,
  } = ctx

  // Status e datas: instalação do banco tem prioridade sobre URL params
  const status    = (survey.installation?.status    ?? ctx.status)    as SurveyContext['status']
  const openDate  =  survey.installation?.open_date  ?? ctx.openDate
  const closeDate =  survey.installation?.close_date ?? ctx.closeDate

  // CSS vars de tema por comunidade — aplicadas no :root para afetar o fundo também
  const theme = survey?.installation?.theme ?? survey?.settings?.theme
  const themeVars = theme?.primaryColor
    ? {
        '--color-primary':   theme.primaryColor,
        '--color-secondary': theme.secondaryColor ?? theme.primaryColor,
      } as React.CSSProperties
    : undefined

  // ── Perfil sem acesso ────────────────────────────────────────────────────────
  const allowAllRoles = (survey.settings as { allow_all_roles?: boolean } | undefined)?.allow_all_roles
  if (!allowAllRoles && survey.publico && !survey.publico.includes(perfil)) {
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

  // Steps de dados (exclui welcome e thankyou) para a progress bar
  const dataSteps = activeSteps.filter(s => s.type !== 'welcome' && s.type !== 'thankyou')
  const dataIdx   = dataSteps.findIndex(s => stepId(s) === currentKey)

  // isLastData = o passo atual é o último que contém perguntas (não é welcome nem thankyou)
  const lastDataStep = dataSteps[dataSteps.length - 1]
  const isLastData   = lastDataStep && stepId(lastDataStep) === currentKey

  // ── Navegação ────────────────────────────────────────────────────────────────
  function next(key: string, data: unknown) {
    const newAnswers = { ...answers, [key]: data }
    setAnswers(newAnswers)

    if (isLastData) {
      submitPesquisa(newAnswers)
    } else {
      // Recalcula com newAnswers para capturar mudanças condicionais (bilíngue)
      const newActive = buildActiveSteps(survey!, perfil, newAnswers)
      const currentIndexInNewActive = newActive.findIndex(s => stepId(s) === currentKey)
      const nextStep  = newActive[currentIndexInNewActive + 1]
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
          accountId,
          onda,
          school,
          tipo,
          perfil,
          nomeCompleto,
          nomeAluno,
          serie,
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
      const hasThankYouStep = activeSteps.some(s => s.type === 'thankyou')
      if (hasThankYouStep) {
        setCurrentKey('thankyou')
      } else {
        setSubmitted(true)
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Erro desconhecido'
      setSubmitError(`Erro ao enviar. ${msg}. Verifique sua conexão e tente novamente.`)
    } finally {
      setLoading(false)
    }
  }

  const isWelcome  = currentStep?.type === 'welcome' && !submitted
  const isThankyou = currentStep?.type === 'thankyou' || (submitted && !submitError)
  const npsKey     = activeSteps.find(s => s.type === 'nps')?.key ?? 'nps'
  const npsAnswer  = answers[npsKey] as NPSAnswer | undefined

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
          <p style={{ color: '#e53e3e', marginBottom: 16, fontWeight: 600 }}>⚠️ {submitError}</p>
        )}

        {currentStep?.type === 'welcome' && (
          <WelcomeStep
            nome={nomeCompleto} nomeAluno={nomeAluno} serie={serie}
            perfil={perfil} tipo={tipo}
            theme={survey.installation?.theme ?? survey.settings?.theme}
            onStart={() => {
              const nextStep = activeSteps[1]
              if (nextStep) setCurrentKey(stepId(nextStep))
            }}
          />
        )}

        {currentStep?.type === 'nps' && (
          <StepNPS
            key={currentStep.key}
            step={currentStep}
            onNext={d => next(currentStep.key, d)}
            onBack={back}
            tipo={tipo}
          />
        )}

        {currentStep?.type === 'scale' && (
          <StepEscala
            key={currentStep.key}
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
            key={currentStep.key}
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
            key={currentStep.key}
            step={currentStep}
            tipo={tipo}
            onNext={d => next(currentStep.key, d)}
            onBack={back}
            isLast={isLastData}
            loading={loading}
          />
        )}

        {currentStep?.type === 'checkbox' && (
          <StepCheckbox
            key={currentStep.key}
            step={currentStep}
            tipo={tipo}
            onNext={d => next(currentStep.key, d)}
            onBack={back}
            isLast={isLastData}
            loading={loading}
          />
        )}

        {currentStep?.type === 'file_upload' && (
          <StepFileUpload
            key={currentStep.key}
            step={currentStep}
            tipo={tipo}
            onNext={d => next(currentStep.key, d)}
            onBack={back}
            isLast={isLastData}
            loading={loading}
          />
        )}

        {isThankyou && (
          <ThankYou
            nps={npsAnswer?.nps}
            perfil={perfil}
            nomeAluno={nomeAluno}
            school={school}
            tipo={tipo}
            theme={survey.installation?.theme ?? survey.settings?.theme}
            indicacaoLinks={survey.settings?.indicacao_links}
          />
        )}
      </div>
    </div>
  )
}
