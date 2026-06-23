'use client'

import { useEffect, useMemo, useState } from 'react'
import { applyConditionals } from '@/lib/survey-config'
import type { LayersPortalWindow } from '@/lib/layers'
import type { Perfil, SurveyConfig, SurveyContext } from '../utils/types'

interface SearchParamsLike {
  get(name: string): string | null
}

const STORAGE_BASE = process.env.NEXT_PUBLIC_SUPABASE_URL
  ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/school-assets`
  : null

export function useSurveyBootstrap(surveySlug: string, searchParams: SearchParamsLike) {
  const initialCommunityId = searchParams.get('communityId') ?? ''
  const loadingLogoUrl = STORAGE_BASE && initialCommunityId
    ? `${STORAGE_BASE}/${initialCommunityId}/logo.png`
    : null

  const [ctx, setCtx] = useState<SurveyContext | null>(null)
  const [survey, setSurvey] = useState<SurveyConfig | null>(null)
  const [surveyNotFound, setSurveyNotFound] = useState(false)
  const [accessDenied, setAccessDenied] = useState(false)

  useEffect(() => {
    async function loadCtx() {
      let userId      = ''
      let communityId = searchParams.get('communityId') || ''
      let session     = ''
      let accountId   = searchParams.get('accountId')   || ''

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
          // URL params remain as fallback.
        }
      }

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
          }
        } catch {
          // Continue with URL params when Hub API is unavailable.
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
        status:    (searchParams.get('status')     || 'ativa') as SurveyContext['status'],
        school:    searchParams.get('school')      || '',
        tipo:      searchParams.get('tipo')        || 'escola',
        nome:       hubNome      || searchParams.get('nome') || searchParams.get('name') || '',
        perfil:     ((searchParams.get('role') || hubPerfil) as Perfil),
        nomeAluno:  hubNomeAluno || searchParams.get('studentName') || '',
        serie:      hubSerie     || searchParams.get('grade')       || '',
        email:      hubEmail || searchParams.get('email') || '',
        layersMeta: hubMeta,
      })
    }

    loadCtx()
  }, [surveySlug, searchParams])

  useEffect(() => {
    if (!ctx) return

    let cancelled = false
    const currentCtx = ctx

    async function loadSurvey() {
      await Promise.resolve()
      if (cancelled) return

      setSurvey(null)
      setSurveyNotFound(false)
      setAccessDenied(false)

      const params = new URLSearchParams()
      if (currentCtx.communityId) params.append('communityId', currentCtx.communityId)
      if (currentCtx.email) params.append('email', currentCtx.email)

      const qs = params.toString() ? `?${params.toString()}` : ''

      try {
        const res = await fetch(`/api/surveys/${surveySlug}${qs}`)
        if (cancelled) return
        if (res.status === 404) { setSurveyNotFound(true); return null }
        if (res.status === 403) { setAccessDenied(true); return null }
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const data = await res.json() as SurveyConfig
        if (cancelled) return
        if (data) setSurvey(applyConditionals(data))
      } catch {
        if (!cancelled) setSurveyNotFound(true)
      }
    }

    loadSurvey()

    return () => {
      cancelled = true
    }
  }, [surveySlug, ctx])

  const theme = useMemo(() => ({
    ...(survey?.settings?.theme   ?? {}),
    ...(survey?.installation?.theme ?? {}),
  }), [survey])

  useEffect(() => {
    if (theme.primaryColor) {
      document.documentElement.style.setProperty('--color-primary', theme.primaryColor as string)
      document.documentElement.style.setProperty(
        '--color-secondary',
        (theme.secondaryColor as string | undefined) ?? (theme.primaryColor as string)
      )
    }
  }, [theme])

  return {
    ctx,
    survey,
    surveyNotFound,
    accessDenied,
    theme,
    loadingLogoUrl,
  }
}
