import { createServerSupabaseClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import { fetchAllSurveys } from '@/lib/report-queries'
import ReportsClient from './ReportsClient'

export const metadata = { title: 'Relatórios Avançados — Admin' }

export default async function ReportsPage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/admin/login')

  const surveys = await fetchAllSurveys()

  return <ReportsClient surveys={surveys} />
}
