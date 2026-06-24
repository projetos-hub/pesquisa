import Link from 'next/link'
import { AdminPageShell } from '../../AdminPageShell'
import NewSurveyForm from './NewSurveyForm'

export default function NewSurveyPage() {
  return (
    <AdminPageShell active="surveys" title="Nova pesquisa" maxWidth="max-w-3xl">
      <div className="rounded-3xl border border-white/12 bg-[#12151d]/88 p-5 text-gray-900 shadow-[0_30px_90px_rgba(0,0,0,0.45)] backdrop-blur-xl">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/admin/surveys" className="text-gray-400 hover:text-gray-600 text-sm">
          ← Pesquisas
        </Link>
        <span className="text-gray-300">/</span>
        <h2 className="text-lg font-semibold text-gray-900">Nova pesquisa</h2>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <NewSurveyForm />
      </div>
      </div>
    </AdminPageShell>
  )
}
