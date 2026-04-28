// Rota exclusiva para testes E2E em desenvolvimento
// Recebe access_token + refresh_token e seta a sessão via Supabase SSR
// NUNCA disponível em produção

import { createServerClient } from '@supabase/ssr'
import { cookies }            from 'next/headers'
import { NextResponse }       from 'next/server'

export async function GET(request: Request) {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not available' }, { status: 404 })
  }

  const { searchParams, origin } = new URL(request.url)
  const accessToken  = searchParams.get('access_token')
  const refreshToken = searchParams.get('refresh_token')

  if (!accessToken || !refreshToken) {
    return NextResponse.json({ error: 'Tokens obrigatórios' }, { status: 400 })
  }

  const cookieStore = await cookies()
  const cookiesToSet: { name: string; value: string; options: Record<string, unknown> }[] = []

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll()      { return cookieStore.getAll() },
        setAll(list)  { list.forEach(c => cookiesToSet.push(c)) },
      },
    },
  )

  const { error } = await supabase.auth.setSession({
    access_token:  accessToken,
    refresh_token: refreshToken,
  })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 401 })
  }

  const response = NextResponse.redirect(`${origin}/admin/surveys`)
  cookiesToSet.forEach(({ name, value, options }) => {
    response.cookies.set(name, value, options as Parameters<typeof response.cookies.set>[2])
  })

  return response
}
