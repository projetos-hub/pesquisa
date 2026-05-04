import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase-service'
import { fetchLayersUser, fetchLayersUserAnyRole } from '@/lib/layers-hub'
import type { LayersUserProfile } from '@/lib/layers-hub'

const EMPTY: LayersUserProfile = {
  nome:      '',
  email:     '',
  perfil:    'responsavel',
  nomeAluno: '',
  serie:     '',
  meta: {
    roles:      [],
    lastSeenAt: null,
    groupsIds:  [],
    membersId:  [],
    address:    {},
    fields:     {},
  },
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const userId      = searchParams.get('userId')      ?? ''
  const communityId = searchParams.get('communityId') ?? ''
  const surveySlug  = searchParams.get('surveySlug')  ?? ''

  if (!userId || !communityId) {
    return NextResponse.json(EMPTY)
  }

  // Se surveySlug fornecido, verificar se o survey permite qualquer role
  if (surveySlug) {
    const supabase = createServiceClient()
    const { data: survey } = await supabase
      .from('surveys')
      .select('settings')
      .eq('slug', surveySlug)
      .single()

    if ((survey?.settings as { allow_all_roles?: boolean } | null)?.allow_all_roles) {
      const profile = await fetchLayersUserAnyRole(userId, communityId)
      return NextResponse.json(profile ?? EMPTY)
    }
  }

  const profile = await fetchLayersUser(userId, communityId)
  return NextResponse.json(profile ?? EMPTY)
}
