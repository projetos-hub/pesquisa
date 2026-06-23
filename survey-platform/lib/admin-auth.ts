import type { User } from '@supabase/supabase-js'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { createServiceClient } from '@/lib/supabase-service'

export class AdminAuthError extends Error {
  status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = 'AdminAuthError'
    this.status = status
  }
}

export async function requireAdmin(): Promise<User> {
  const authClient = await createServerSupabaseClient()
  const { data: { user } } = await authClient.auth.getUser()

  if (!user) {
    throw new AdminAuthError('Unauthorized', 401)
  }

  const service = createServiceClient()
  const { data: adminProfile, error } = await service
    .from('admin_profiles')
    .select('id')
    .eq('id', user.id)
    .maybeSingle()

  if (error || !adminProfile) {
    throw new AdminAuthError('Forbidden', 403)
  }

  return user
}

export function adminAuthErrorResponse(error: unknown): Response | null {
  if (!(error instanceof AdminAuthError)) return null

  return Response.json(
    { error: error.message },
    { status: error.status }
  )
}

