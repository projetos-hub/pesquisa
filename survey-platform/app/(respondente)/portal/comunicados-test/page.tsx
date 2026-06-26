'use client'

import { useEffect, useMemo, useState } from 'react'
import type { LayersPortalWindow } from '@/lib/layers'

const PORTAL_TIMEOUT_MS = 5000
const ALLOWED_COMMUNITY = 'raizeducacao'
const COMUNICADOS_API_URL = 'https://comunicados-api.layers.digital/api/v1/post'
const DEFAULT_CATEGORY_ID = '600099cf22c83b01a046cb39'

type PortalContext = {
  session: string
  communityId: string
  userId: string
  accountId: string
}

type TestResult = {
  status: number
  text: string
}

export function readContextFromUrl(): PortalContext {
  const params = new URLSearchParams(window.location.search)
  return {
    session: params.get('layers_session') || params.get('session') || '',
    communityId: params.get('layers_community_id') || params.get('communityId') || '',
    userId: params.get('layers_user_id') || params.get('userId') || '',
    accountId: params.get('layers_account_id') || params.get('accountId') || '',
  }
}

export async function readLayersPortalContext(): Promise<PortalContext> {
  const fromUrl = readContextFromUrl()
  const portal = (window as LayersPortalWindow).LayersPortal

  if (!portal) return fromUrl

  try {
    const timeout = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('timeout')), PORTAL_TIMEOUT_MS)
    )
    await Promise.race([portal.connectedPromise, timeout])
  } catch {
    return fromUrl
  }

  return {
    session: portal.session || fromUrl.session,
    communityId: portal.communityId || fromUrl.communityId,
    userId: portal.userId || fromUrl.userId,
    accountId: portal.accountId || fromUrl.accountId,
  }
}

export function ComunicadosTestPanel({
  initialContext,
}: {
  initialContext?: PortalContext | null
}) {
  const [context, setContext] = useState<PortalContext | null>(initialContext ?? null)
  const [loadingContext, setLoadingContext] = useState(true)
  const [sending, setSending] = useState(false)
  const [result, setResult] = useState<TestResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function init() {
      if (initialContext) {
        setContext(initialContext)
        setLoadingContext(false)
        return
      }

      const ctx = await readLayersPortalContext()
      setContext(ctx)
      setLoadingContext(false)
    }

    init()
  }, [initialContext])

  const canTest = useMemo(() => {
    return Boolean(
      context?.session &&
      context?.communityId === ALLOWED_COMMUNITY &&
      context?.userId
    )
  }, [context])

  async function createTestPost() {
    if (!context) return

    setSending(true)
    setError(null)
    setResult(null)

    try {
      const params = new URLSearchParams({
        session: context.session,
        community: context.communityId,
        userId: context.userId,
      })

      const response = await fetch(`${COMUNICADOS_API_URL}?${params.toString()}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          kind: 'informative',
          title: `TESTE - Comunicado Pesquisa ${new Date().toLocaleString('pt-BR')}`,
          description: '<p>Teste interno para validar criacao de comunicados pelo portal da Pesquisa.</p>',
          coverImage: null,
          attachments: [],
          category: DEFAULT_CATEGORY_ID,
          targets: {
            topics: [],
            roles: ['admin'],
          },
          allowTickets: false,
          notifyChannels: ['pushNotification'],
          draftId: null,
        }),
      })

      setResult({
        status: response.status,
        text: await response.text(),
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="card">
      <div className="header"><h1>Teste de Comunicados</h1></div>
      <div className="body">
        <p style={{ marginBottom: 16 }}>
          Valida criacao de comunicado usando a sessao encaminhada pelo portal Layers.
        </p>

        <div style={{ display: 'grid', gap: 8, marginBottom: 20, fontSize: 14 }}>
          <div><strong>Comunidade:</strong> {loadingContext ? 'carregando...' : context?.communityId || 'nao identificada'}</div>
          <div><strong>Usuario:</strong> {loadingContext ? 'carregando...' : context?.userId || 'nao identificado'}</div>
          <div><strong>Sessao Layers:</strong> {loadingContext ? 'carregando...' : context?.session ? 'recebida' : 'ausente'}</div>
        </div>

        {!loadingContext && context?.communityId !== ALLOWED_COMMUNITY && (
          <div style={{
            marginBottom: 16,
            padding: 12,
            borderRadius: 8,
            background: '#fffbeb',
            border: '1px solid #f59e0b',
            color: '#92400e',
            fontSize: 14,
          }}>
            Este teste esta liberado apenas para a comunidade {ALLOWED_COMMUNITY}.
          </div>
        )}

        {!loadingContext && !context?.session && (
          <div style={{
            marginBottom: 16,
            padding: 12,
            borderRadius: 8,
            background: '#fffbeb',
            border: '1px solid #f59e0b',
            color: '#92400e',
            fontSize: 14,
          }}>
            Abra esta pagina pelo launcher da Layers para receber a sessao do portal.
          </div>
        )}

        <button
          type="button"
          className="btn btn-primary"
          disabled={!canTest || sending}
          onClick={createTestPost}
        >
          {sending ? 'Criando...' : 'Criar comunicado de teste'}
        </button>

        {error && (
          <pre style={{ marginTop: 20, whiteSpace: 'pre-wrap', color: '#b91c1c' }}>
            {error}
          </pre>
        )}

        {result && (
          <pre style={{ marginTop: 20, whiteSpace: 'pre-wrap', fontSize: 12 }}>
            {JSON.stringify(result, null, 2)}
          </pre>
        )}
      </div>
    </div>
  )
}

export default function ComunicadosTestPage() {
  return <ComunicadosTestPanel />
}
