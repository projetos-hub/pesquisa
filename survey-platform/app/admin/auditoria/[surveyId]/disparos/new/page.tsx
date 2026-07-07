import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { AdminPageShell } from '../../../../AdminPageShell'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { createServiceClient } from '@/lib/supabase-service'
import { resolveCommunityPrimaryName } from '@/lib/community-identity'
import NovoDisparoForm from './NovoDisparoForm'

interface PageProps {
  params: Promise<{ surveyId: string }>
}

function toDatetimeLocalString(date: Date): string {
  const pad = (n: number) => n.toString().padStart(2, '0')
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `T${pad(date.getHours())}:${pad(date.getMinutes())}`
  )
}

export default async function NovoDisparoPage({ params }: PageProps) {
  const { surveyId } = await params

  const authClient = await createServerSupabaseClient()
  const { data: { user } } = await authClient.auth.getUser()
  if (!user) redirect('/admin/login')

  const db = createServiceClient()

  const { data: survey } = await db
    .from('surveys')
    .select('id, title, slug')
    .eq('id', surveyId)
    .single()

  if (!survey) notFound()

  const { data: commData } = await db
    .from('survey_communities')
    .select('community_id')
    .eq('survey_id', surveyId)
    .eq('active', true)
    .order('community_id', { ascending: true })

  const communityIds = (commData ?? []).map(c => c.community_id)
  const { data: communityRows } = communityIds.length > 0
    ? await db
        .from('communities')
        .select('community_id, nome_escola, marca, unidade')
        .in('community_id', communityIds)
    : { data: [] }
  const nameByCommunity = new Map((communityRows ?? []).map(c => [c.community_id, resolveCommunityPrimaryName(c)]))

  const communities = (commData ?? []).map(c => ({
    id: c.community_id,
    label: nameByCommunity.get(c.community_id) ?? c.community_id,
  }))

  // Default = agora no fuso de Brasília (servidor roda em UTC, enviamos UTC-3)
  const nowBR = new Date()
  nowBR.setHours(nowBR.getHours() - 3)
  const defaultFiredAt = toDatetimeLocalString(nowBR)

  return (
    <AdminPageShell active="auditoria" title="Registrar disparo" maxWidth="max-w-3xl">
      <div className="rounded-3xl border border-white/12 bg-[#12151d]/88 p-5 text-gray-900 shadow-[0_30px_90px_rgba(0,0,0,0.45)] backdrop-blur-xl">
      {/* Breadcrumb */}
      <div className="flex items-center gap-3 mb-6">
        <Link href="/admin/auditoria" className="text-gray-400 hover:text-gray-600 text-sm">
          ← Auditoria
        </Link>
        <span className="text-gray-300">/</span>
        <Link
          href={`/admin/auditoria/${surveyId}`}
          className="text-gray-400 hover:text-gray-600 text-sm truncate max-w-xs"
        >
          {survey.title}
        </Link>
        <span className="text-gray-300">/</span>
        <h2 className="text-lg font-semibold text-gray-900">Registrar disparo</h2>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <p className="text-xs text-gray-500 mb-5">
          Registre aqui quando um disparo foi feito por qualquer canal (Layers, WhatsApp, e-mail, etc.)
          para correlacionar com as respostas recebidas.
        </p>
        <NovoDisparoForm
          surveyId={surveyId}
          communities={communities}
          defaultFiredAt={defaultFiredAt}
        />
      </div>
      </div>
    </AdminPageShell>
  )
}
