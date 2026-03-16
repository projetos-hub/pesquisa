import { NextResponse } from 'next/server'
import { fetchLayersUser } from '@/lib/layers-hub'

const EMPTY: { nome: string; perfil: 'responsavel'; nomeAluno: string; serie: string } = {
  nome:      '',
  perfil:    'responsavel',
  nomeAluno: '',
  serie:     '',
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const userId      = searchParams.get('userId')      ?? ''
  const communityId = searchParams.get('communityId') ?? ''

  if (!userId || !communityId) {
    return NextResponse.json(EMPTY)
  }

  const profile = await fetchLayersUser(userId, communityId)
  return NextResponse.json(profile ?? EMPTY)
}
