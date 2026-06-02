import Link from 'next/link'
import { createServiceClient } from '@/lib/supabase-service'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { notFound } from 'next/navigation'
import ActiveTabLink from './_components/ActiveTabLink'

interface LayoutProps {
  children: React.ReactNode
  params: Promise<{ surveyId: string }>
}

const TABS = [
  { href: 'overview', label: 'Visão Geral' },
  { href: 'timeline', label: 'Temporal' },
  { href: 'communities', label: 'Comunidades' },
  { href: 'breakdown', label: 'Perfis' },
  { href: 'funnel', label: 'Funil' },
]

export default async function SurveyAnalyticsLayout({ children, params }: LayoutProps) {
  const { surveyId } = await params

  const authClient = await createServerSupabaseClient()
  const { data: { user } } = await authClient.auth.getUser()
  if (!user) return null

  const db = createServiceClient()
  const { data: survey } = await db
    .from('surveys')
    .select('id, title, slug')
    .eq('id', surveyId)
    .single()

  if (!survey) notFound()

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="border-b border-gray-200 bg-white px-6 pt-5 pb-0">
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-3">
          <Link href="/admin/analytics" className="hover:text-gray-700">
            Analytics
          </Link>
          <span className="text-gray-300">/</span>
          <span className="text-gray-900 font-medium truncate max-w-sm">{survey.title}</span>
        </div>

        {/* Sub-nav tabs */}
        <nav className="flex gap-1 -mb-px">
          {TABS.map(tab => (
            <ActiveTabLink
              key={tab.href}
              href={`/admin/analytics/${surveyId}/${tab.href}`}
              label={tab.label}
            />
          ))}
        </nav>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        {children}
      </div>
    </div>
  )
}
