import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { createServiceClient } from '@/lib/supabase-service'

const BUCKET = 'school-assets'
const MAX_LOGO_SIZE = 2 * 1024 * 1024

const ALLOWED_TYPES: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
  'image/svg+xml': 'svg',
}

interface RouteContext {
  params: Promise<{ communityId: string }>
}

export async function POST(request: Request, { params }: RouteContext) {
  try {
    const authClient = await createServerSupabaseClient()
    const { data: { user } } = await authClient.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const { communityId: rawCommunityId } = await params
    const communityId = rawCommunityId
      .replace('@', '')
      .replace(/[^a-z0-9_\-]/gi, '')
      .slice(0, 64)

    if (!communityId) {
      return NextResponse.json({ error: 'Comunidade inválida' }, { status: 400 })
    }

    const form = await request.formData()
    const file = form.get('file')
    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'Arquivo obrigatório' }, { status: 400 })
    }

    if (file.size > MAX_LOGO_SIZE) {
      return NextResponse.json({ error: 'Logo muito grande. Use arquivo de até 2 MB.' }, { status: 400 })
    }

    const ext = ALLOWED_TYPES[file.type]
    if (!ext) {
      return NextResponse.json({ error: 'Formato inválido. Use PNG, JPG, WEBP ou SVG.' }, { status: 400 })
    }

    const supabase = createServiceClient()
    const path = `${communityId}/logo.${ext}`
    const buffer = Buffer.from(await file.arrayBuffer())

    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(path, buffer, {
        contentType: file.type,
        upsert: true,
      })

    if (uploadError) {
      console.error('[community-logo-upload]', uploadError)
      return NextResponse.json({ error: 'Falha ao enviar logo' }, { status: 500 })
    }

    const { data: { publicUrl } } = supabase.storage
      .from(BUCKET)
      .getPublicUrl(path)

    return NextResponse.json({
      url: `${publicUrl}?v=${Date.now()}`,
    })
  } catch (error) {
    console.error('[community-logo-upload] unexpected', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
