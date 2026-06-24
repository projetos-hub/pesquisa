'use server'

import { randomBytes } from 'node:crypto'
import { revalidatePath } from 'next/cache'
import { requireAdmin } from '@/lib/admin-auth'
import { createServiceClient } from '@/lib/supabase-service'

function makeToken() {
  return randomBytes(32).toString('base64url')
}

export async function createPublicResponseLink(formData: FormData) {
  const user = await requireAdmin()
  const surveyId = String(formData.get('surveyId') ?? '')
  const includePii = formData.get('includePii') === 'on'

  if (!surveyId) return

  const supabase = createServiceClient()
  const { error } = await supabase
    .from('public_response_links')
    .insert({
      survey_id: surveyId,
      token: makeToken(),
      include_pii: includePii,
      created_by: user.id,
    })

  if (error) throw new Error(error.message)
  revalidatePath('/admin/export')
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
