import Link from 'next/link'
import NewSurveyForm from './NewSurveyForm'

export default function NewSurveyPage() {
  return (
    <div className="p-6 max-w-2xl">
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
  )
}
