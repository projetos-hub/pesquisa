import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { createServiceClient } from '@/lib/supabase-service'
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
    .select('community_id, theme')
    .eq('survey_id', surveyId)
    .eq('active', true)
    .order('community_id', { ascending: true })

  const communities = (commData ?? []).map(c => {
    const theme = c.theme as { nomeEscola?: string } | null
    return {
      id: c.community_id,
      label: theme?.nomeEscola ?? c.community_id,
    }
  })

  // Default = agora no fuso de Brasília (servidor roda em UTC, enviamos UTC-3)
  const nowBR = new Date()
  nowBR.setHours(nowBR.getHours() - 3)
  const defaultFiredAt = toDatetimeLocalString(nowBR)

  return (
    <div className="p-6 max-w-2xl">
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
  )
}
