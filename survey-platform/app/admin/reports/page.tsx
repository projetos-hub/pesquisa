import { createServerSupabaseClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import { fetchAllSurveys } from '@/lib/report-queries'
import { AdminPageShell } from '../AdminPageShell'
import ReportsClient from './ReportsClient'

export const metadata = { title: 'Relatórios Avançados — Admin' }

export default async function ReportsPage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/admin/login')

  const surveys = await fetchAllSurveys()

  return (
    <AdminPageShell active="export" title="Relatórios">
      <div className="rounded-3xl border border-white/12 bg-[#12151d]/88 p-5 text-gray-900 shadow-[0_30px_90px_rgba(0,0,0,0.45)] backdrop-blur-xl">
        <ReportsClient surveys={surveys} />
      </div>
    </AdminPageShell>
  )
}
