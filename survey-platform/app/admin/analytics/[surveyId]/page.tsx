import { redirect } from 'next/navigation'

interface PageProps {
  params: Promise<{ surveyId: string }>
}

export default async function SurveyAnalyticsPage({ params }: PageProps) {
  const { surveyId } = await params
  redirect(`/admin/analytics/${surveyId}/overview`)
}
