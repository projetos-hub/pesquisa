'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { LayersPortalWindow } from '@/lib/layers'
import type { ResolvedSurvey } from '@/app/api/portal/resolve/route'

const PORTAL_TIMEOUT_MS = 5000

export default function PortalPage() {
  const router = useRouter()
  const [surveys, setSurveys] = useState<ResolvedSurvey[] | null>(null)
  const [communityId, setCommunityId] = useState('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function init() {
      let cId = ''
      let uId = ''
      let aId = ''
      let sess = ''

      // Captura contexto do LayersPortal com timeout de segurança
      if (typeof window !== 'undefined' && (window as LayersPortalWindow).LayersPortal) {
        try {
          const timeout = new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('timeout')), PORTAL_TIMEOUT_MS)
          )
          await Promise.race([
            (window as LayersPortalWindow).LayersPortal!.connectedPromise,
            timeout,
          ])
          cId  = (window as LayersPortalWindow).LayersPortal!.communityId || ''
          uId  = (window as LayersPortalWindow).LayersPortal!.userId      || ''
          aId  = (window as LayersPortalWindow).LayersPortal!.accountId   || ''
          sess = (window as LayersPortalWindow).LayersPortal!.session      || ''
        } catch {
          // LayersPortal indisponível ou timeout — continua sem contexto
        }
      }

      setCommunityId(cId)

      if (!cId) {
        setError('nenhuma_comunidade')
        return
      }

      // Resolve quais pesquisas estão disponíveis para esta comunidade
      const qs = new URLSearchParams({ communityId: cId })
      if (uId)  qs.set('userId',    uId)
      if (aId)  qs.set('accountId', aId)
      if (sess) qs.set('session',   sess)

      const res = await fetch(`/api/portal/resolve?communityId=${encodeURIComponent(cId)}`)
      if (!res.ok) {
        setError('erro_api')
        return
      }

      const { surveys: found } = await res.json() as { surveys: ResolvedSurvey[] }

      if (!found || found.length === 0) {
        setError('sem_pesquisa')
        return
      }

      // Uma única pesquisa → redireciona diretamente
      if (found.length === 1) {
        const target = buildSurveyUrl(found[0].slug, cId, uId, aId, sess)
        router.replace(target)
        return
      }

      // Múltiplas pesquisas → exibe seleção
      setSurveys(found)
    }

    init()
  }, [router])

  function buildSurveyUrl(slug: string, cId: string, uId: string, aId: string, sess: string) {
    const p = new URLSearchParams({ communityId: cId })
    if (uId)  p.set('userId',    uId)
    if (aId)  p.set('accountId', aId)
    if (sess) p.set('session',   sess)
    return `/p/${slug}?${p.toString()}`
  }

  // ── Telas de estado ──────────────────────────────────────────────────────────

  if (error === 'nenhuma_comunidade') {
    return (
      <div className="card">
        <div className="header"><h1>Pesquisa de Satisfação</h1></div>
        <div className="prazo-screen">
          <div className="icon">🔒</div>
          <h2>Acesso não identificado</h2>
          <p>Não foi possível identificar sua comunidade. Acesse esta pesquisa pelo portal da sua escola.</p>
        </div>
      </div>
    )
  }

  if (error === 'sem_pesquisa') {
    return (
      <div className="card">
        <div className="header"><h1>Pesquisa de Satisfação</h1></div>
        <div className="prazo-screen">
          <div className="icon">📋</div>
          <h2>Nenhuma pesquisa disponível</h2>
          <p>Não há pesquisas abertas para a sua escola no momento.</p>
        </div>
      </div>
    )
  }

  if (error === 'erro_api') {
    return (
      <div className="card">
        <div className="header"><h1>Pesquisa de Satisfação</h1></div>
        <div className="prazo-screen">
          <div className="icon">⚠️</div>
          <h2>Erro ao carregar</h2>
          <p>Não foi possível carregar as pesquisas. Tente novamente em instantes.</p>
        </div>
      </div>
    )
  }

  // Seleção de pesquisa (múltiplas ativas)
  if (surveys && surveys.length > 1) {
    function fmtDate(d: string | null) {
      if (!d) return null
      return new Date(d).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })
    }

    return (
      <div className="card">
        <div className="header"><h1>Pesquisas disponíveis</h1></div>
        <div className="body">
          <p style={{ marginBottom: 24 }}>Selecione a pesquisa que deseja responder:</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {surveys.map(s => (
              <button
                key={s.slug}
                className="btn btn-primary"
                style={{ textAlign: 'left', display: 'flex', flexDirection: 'column', gap: 2, padding: '14px 18px' }}
                onClick={() => router.push(`/p/${s.slug}?communityId=${encodeURIComponent(communityId)}`)}
              >
                <span style={{ fontWeight: 600, fontSize: '1rem' }}>{s.title}</span>
                {s.close_date && (
                  <span style={{ fontSize: '.8rem', opacity: 0.8 }}>
                    Data de fim: {fmtDate(s.close_date)}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>
    )
  }

  // Spinner padrão enquanto resolve
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
