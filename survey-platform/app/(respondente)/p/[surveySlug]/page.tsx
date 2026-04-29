import { Suspense } from 'react'
import SurveyRunner from '@/components/survey-engine/SurveyRunner'
import SurveyLoadingFallback from './SurveyLoadingFallback'

interface PageProps {
  params:       Promise<{ surveySlug: string }>
  searchParams: Promise<{ communityId?: string }>
}

export default async function SurveyPage({ params, searchParams }: PageProps) {
  const { surveySlug }       = await params
  const { communityId = '' } = await searchParams

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
  const logoUrl = communityId && supabaseUrl
    ? `${supabaseUrl}/storage/v1/object/public/school-assets/${communityId}/logo.png`
    : null

  return (
    <Suspense fallback={<SurveyLoadingFallback logoUrl={logoUrl} />}>
      <SurveyRunner surveySlug={surveySlug} />
    </Suspense>
  )
}
