import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase-service'
import { fetchLayersUser, fetchLayersUserAnyRole, type LayersUserProfile } from '@/lib/layers-hub'
import {
  isPerfilAllowedForSubmit,
  isSampleAccessControl,
  sampleRowMatchesIdentity,
  surveyAllowsAllRoles,
  type SubmitSurveyAccess,
} from '@/lib/submit-access'

export interface ResolvedSurvey {
  slug: string
  title: string
  status: 'ativa' | 'pausada' | 'encerrada' | 'nao_aberta'
  open_date: string | null
  close_date: string | null
  target_roles: string[]
}

interface InstalledSurvey extends SubmitSurveyAccess {
  id: string
  slug: string
  title: string
  target_roles: string[]
  status: string
  open_date: string | null
  close_date: string | null
  access_control: string | null
  settings: Record<string, unknown> | null
}

interface SurveyInstallRow {
  status: ResolvedSurvey['status']
  open_date: string | null
  close_date: string | null
  surveys: InstalledSurvey | InstalledSurvey[]
}

function surveyFromRow(row: SurveyInstallRow): InstalledSurvey | null {
  return (Array.isArray(row.surveys) ? row.surveys[0] : row.surveys) ?? null
}

async function resolveProfile(
  userId: string,
  communityId: string,
  surveys: SubmitSurveyAccess[],
): Promise<LayersUserProfile | null> {
  if (!userId || !communityId) return null

  const requiresAnyRole = surveys.some(surveyAllowsAllRoles)
  return requiresAnyRole
    ? fetchLayersUserAnyRole(userId, communityId)
    : fetchLayersUser(userId, communityId)
}

async function isUserInSample(
  surveyId: string,
  communityId: string,
  userId: string,
  email: string,
) {
  if (!userId || !email) return false

  const supabase = createServiceClient()
  const { data } = await supabase
    .from('survey_sample_lists')
    .select('id, layers_user_id')
    .eq('survey_id', surveyId)
    .eq('community_id', communityId)
    .eq('email', email.toLowerCase())
    .limit(1)

  return !!data?.[0] && sampleRowMatchesIdentity(data[0], userId)
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const communityId = (searchParams.get('communityId') ?? '').replace('@', '')
  const userId = searchParams.get('userId') || searchParams.get('accountId') || ''

  if (!communityId) {
    return NextResponse.json({ error: 'communityId is required' }, { status: 400 })
  }

  const supabase = createServiceClient()

  const { data, error } = await supabase
    .from('survey_communities')
    .select(`
      status,
      open_date,
      close_date,
      surveys!inner (
        id,
        slug,
        title,
        target_roles,
        status,
        access_control,
        settings,
        open_date,
        close_date
      )
    `)
    .eq('community_id', communityId)
    .eq('active', true)
    .eq('status', 'ativa')
    .eq('surveys.status', 'ativa')
    .order('close_date', { ascending: true, nullsFirst: false })

  if (error) {
    return NextResponse.json({ error: 'Failed to resolve surveys' }, { status: 500 })
  }

  if (!data || data.length === 0) {
    return NextResponse.json({ surveys: [] })
  }

  const rows = data as SurveyInstallRow[]
  const installedSurveys = rows.map(row => surveyFromRow(row)).filter((survey): survey is InstalledSurvey => !!survey)
  const profile = await resolveProfile(userId, communityId, installedSurveys)
  const surveys: ResolvedSurvey[] = []

  for (const row of rows) {
    const survey = surveyFromRow(row)
    if (!survey) continue

    const trustedPerfil = profile?.perfil ?? ''
    if (trustedPerfil && !isPerfilAllowedForSubmit(survey, trustedPerfil)) continue

    if (isSampleAccessControl(survey)) {
      const allowed = await isUserInSample(survey.id, communityId, userId, profile?.email ?? '')
      if (!allowed) continue
    }

    surveys.push({
      slug: survey.slug,
      title: survey.title,
      target_roles: survey.target_roles,
      status: row.status,
      open_date: row.open_date ?? survey.open_date,
      close_date: row.close_date ?? survey.close_date,
    })
  }

  return NextResponse.json({ surveys })
}
