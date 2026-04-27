import { createServerSupabaseClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import SampleUpload from './SampleUpload'

interface Props {
  params: Promise<{ id: string }>
}

export default async function SamplePage({ params }: Props) {
  const { id } = await params
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/admin/login')
  }

  const { data: survey } = await supabase
    .from('surveys')
    .select('id, title, slug')
    .eq('id', id)
    .single()

  if (!survey) {
    return <div className="p-6 text-red-600">Pesquisa não encontrada</div>
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Amostra — {survey.title}</h1>
        <p className="text-gray-600">Fazer upload de Excel com usuários da amostra segmentada</p>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <SampleUpload surveyId={id} surveySlug={survey.slug} />
      </div>
    </div>
  )
}
