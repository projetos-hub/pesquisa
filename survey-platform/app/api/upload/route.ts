import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase-service'

export async function POST(req: Request) {
  try {
    const form = await req.formData()
    const file = form.get('file') as File | null
    if (!file) return NextResponse.json({ error: 'No file' }, { status: 400 })

    const MAX_SIZE = 10 * 1024 * 1024 // 10 MB
    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: 'Arquivo muito grande (máx 10 MB)' }, { status: 400 })
    }

    const supabase = createServiceClient()
    const ext = file.name.split('.').pop() ?? 'bin'
    const path = `uploads/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
    const buffer = Buffer.from(await file.arrayBuffer())

    const { error } = await supabase.storage
      .from('survey-uploads')
      .upload(path, buffer, { contentType: file.type, upsert: false })

    if (error) {
      console.error('[upload]', error)
      return NextResponse.json({ error: 'Falha no upload' }, { status: 500 })
    }

    const { data: { publicUrl } } = supabase.storage
      .from('survey-uploads')
      .getPublicUrl(path)

    return NextResponse.json({ url: publicUrl })
  } catch (e) {
    console.error('[upload] unexpected', e)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
