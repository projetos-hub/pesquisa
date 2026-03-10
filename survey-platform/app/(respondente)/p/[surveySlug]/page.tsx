import { Suspense } from 'react'
import SurveyRunner from '@/components/survey-engine/SurveyRunner'

// Next.js 15+: params é uma Promise
interface PageProps {
  params: Promise<{ surveySlug: string }>
}

export default async function SurveyPage({ params }: PageProps) {
  const { surveySlug } = await params

  return (
    <Suspense
      fallback={
        <div className="card">
          <div className="header"><h1>Pesquisa de Satisfação</h1></div>
          <div className="loading-screen">
            <div className="spinner" />
            <p>Carregando...</p>
          </div>
        </div>
      }
    >
      <SurveyRunner surveySlug={surveySlug} />
    </Suspense>
  )
}
