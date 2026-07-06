'use server'

import { randomBytes } from 'node:crypto'
import { revalidatePath } from 'next/cache'
import { requireAdmin } from '@/lib/admin-auth'
import { hashPublicResponseAccessKey, type PublicResponseScope } from '@/lib/public-responses'
import { createServiceClient } from '@/lib/supabase-service'

export interface CreatePublicResponseLinkState {
  error?: string
  publicUrl?: string
  accessKey?: string
  sheetsFormula?: string
}

function makeToken() {
  return randomBytes(32).toString('base64url')
}

function makeAccessKey() {
  return randomBytes(24).toString('base64url')
}

function parseSelectedBrands(formData: FormData) {
  return [...new Set(
    formData.getAll('brandNames')
      .map(value => String(value).trim())
      .filter(Boolean)
  )].sort((a, b) => a.localeCompare(b, 'pt-BR'))
}

async function buildScope(brandNames: string[]): Promise<PublicResponseScope> {
  if (brandNames.length === 0) {
    return { type: 'all', brandNames: [], communityIds: [] }
  }

  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('communities')
    .select('community_id')
    .in('marca', brandNames)

  if (error) throw new Error(error.message)

  const communityIds = [...new Set(
    ((data ?? []) as { community_id: string | null }[])
      .map(row => row.community_id)
      .filter((id): id is string => typeof id === 'string' && id.length > 0)
  )].sort()

  if (communityIds.length === 0) {
    throw new Error(`Nenhuma comunidade encontrada para as marcas selecionadas: ${brandNames.join(', ')}`)
  }

  return {
    type: 'brands',
    brandNames,
    communityIds,
  }
}

export async function createPublicResponseLink(
  _previousState: CreatePublicResponseLinkState | null,
  formData: FormData
): Promise<CreatePublicResponseLinkState> {
  const user = await requireAdmin()
  const surveyId = String(formData.get('surveyId') ?? '')
  const includePii = formData.get('includePii') === 'on'

  if (!surveyId) return { error: 'Pesquisa obrigatoria' }

  const token = makeToken()
  const accessKey = makeAccessKey()
  const brandNames = parseSelectedBrands(formData)
  let scope: PublicResponseScope

  try {
    scope = await buildScope(brandNames)
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Erro ao montar escopo do link' }
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://pesquisa-nu-sand.vercel.app'
  const publicUrl = `${appUrl}/public/responses/${token}`
  const csvUrl = `${appUrl}/api/public/responses/${token}.csv?key=${accessKey}`

  const supabase = createServiceClient()
  const { error } = await supabase
    .from('public_response_links')
    .insert({
      survey_id: surveyId,
      token,
      access_key_hash: hashPublicResponseAccessKey(accessKey),
      include_pii: includePii,
      created_by: user.id,
      scope,
    })

  if (error) return { error: error.message }

  revalidatePath('/admin/export')
  return {
    publicUrl,
    accessKey,
    sheetsFormula: `=IMPORTDATA("${csvUrl}")`,
  }
}

export async function disablePublicResponseLink(formData: FormData) {
  await requireAdmin()
  const linkId = String(formData.get('linkId') ?? '')
  if (!linkId) return

  const supabase = createServiceClient()
  const { error } = await supabase
    .from('public_response_links')
    .update({ enabled: false })
    .eq('id', linkId)

  if (error) throw new Error(error.message)
  revalidatePath('/admin/export')
}
