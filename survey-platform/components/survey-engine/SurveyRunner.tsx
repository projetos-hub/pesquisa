'use client'

import { useState, useEffect, useMemo } from 'react'
import { useSearchParams } from 'next/navigation'
import { applyConditionals } from '@/lib/survey-config'
import { buildActiveSteps, stepId } from './utils/buildActiveSteps'
import type {
  Answers, SurveyConfig, SurveyContext, Perfil, NPSAnswer,
  WelcomeStepDef, NPSStepDef, ScaleStepDef, RadioStepDef,
  TextStepDef, CheckboxStepDef, FileUploadStepDef,
} from './utils/types'
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
        status:    (searchParams.get('status')     || 'ativa') as SurveyContext['status'],
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

  // ── Theme mergeado: settings.theme como base, installation.theme sobrescreve ──
  // Fonte única de verdade — usada tanto para CSS vars quanto para props dos steps.
  // community-level (installation) tem prioridade máxima sobre survey-level (settings).
  const theme = useMemo(() => ({
    ...(survey?.settings?.theme   ?? {}),
    ...(survey?.installation?.theme ?? {}),
  }), [survey])

  // ── Injeta CSS vars no :root para afetar o fundo do layout ───────────────────
  useEffect(() => {
    if (theme.primaryColor) {
      document.documentElement.style.setProperty('--color-primary', theme.primaryColor as string)
      document.documentElement.style.setProperty(
        '--color-secondary',
        (theme.secondaryColor as string | undefined) ?? (theme.primaryColor as string)
      )
    }
  }, [theme])

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

  if (status === 'pausada') {
    return (
      <div className="card" style={themeVars}>
        <div className="header"><h1>{survey.titulo}</h1></div>
        <div className="prazo-screen">
          <div className="icon">⏸</div>
          <h2>Pesquisa pausada</h2>
          <p>Esta pesquisa está temporariamente pausada. Tente novamente em breve.</p>
        </div>
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
      submitPesquisa(newAnswers, activeSteps)
    } else {
      // Recalcula com newAnswers para capturar mudanças condicionais (bilíngue)
      const newActive = buildActiveSteps(survey!, perfil, newAnswers)
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
      setSubmitError(`Erro ao enviar. ${msg}. Verifique sua conexão e tente novamente.`)
    } finally {
      setLoading(false)
    }
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
          <p style={{ color: '#e53e3e', marginBottom: 16, fontWeight: 600 }}>⚠️ {submitError}</p>
        )}

        {renderCurrentStep()}
      </div>
    </div>
  )
}
