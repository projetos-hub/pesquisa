import { createServiceClient } from '@/lib/supabase-service'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const body = await request.json()

    const community: string = body?.context?.community
    const after: string = body?.data?.after ?? '2000-01-01T00:00:00Z'
    const limit: number = body?.data?.limit ?? 20

    if (!community) {
      return NextResponse.json({ error: 'community obrigatório' }, { status: 400 })
    }

    // TEMP 2026-06-26: contrato HAR-like para validar se a UI real de
    // Comunicados renderiza payloads mais proximos da API privada capturada.
    // Remover apos o teste visual em raizeducacao.
    if (community === 'raizeducacao') {
      const now = new Date().toISOString()
      const result = [
        {
          id: '_contrato_t15_har_like_provider',
          _id: '_contrato_t15_har_like_provider',
          active: true,
          allowTickets: false,
          approved: true,
          approvedAt: now,
          approvedBy: {
            id: '6377844ce70782001c8b06fc',
            name: 'Projetos',
          },
          attachments: [],
          author: {
            id: '6377844ce70782001c8b06fc',
            name: 'Raiz Educacao',
          },
          category: {
            color: 'gray-60',
            community: 'raizeducacao',
            id: '600099cf22c83b01a046cb39',
            name: 'Geral',
          },
          community: 'raizeducacao',
          coverImage: null,
          createdAt: now,
          description: '<p>Teste T15: payload HAR-like via provider API Hub.</p>',
          generatedByLIA: false,
          isParent: false,
          kind: 'informative',
          mailMergeEnabled: false,
          needsPostAnswer: false,
          notifications: [],
          notifyChannels: ['pushNotification'],
          published: true,
          publishedAt: now,
          scheduled: false,
          targets: {
            topics: [
              {
                id: '69ab230abae85b0f3f55b374',
                kind: 'group',
                name: 'Teste Pesquisa',
                community: 'raizeducacao',
              },
            ],
            roles: ['admin'],
            tags: [
              'author:6377844ce70782001c8b06fc',
              'group:69ab230abae85b0f3f55b374',
            ],
            pastRoles: ['admin'],
            pastTags: [
              'author:6377844ce70782001c8b06fc',
              'group:69ab230abae85b0f3f55b374',
            ],
            _id: '_contrato_t15_targets',
          },
          title: 'CONTRATO T15 - HAR-like provider',
          updatedAt: now,
        },
      ]

      console.log(`[layers/posts] TEMP HAR-like community=${community} after=${after} retornando ${result.length} comunicado`)
      return NextResponse.json({ result })
    }

    const supabase = createServiceClient()
    const { data, error } = await supabase
      .from('comunicados')
      .select('*')
      .eq('community_id', community)
      .eq('status', 'published')
      .eq('approved', true)
      .gte('updated_at', after)
      .order('updated_at', { ascending: false })
      .limit(limit)

    if (error) {
      console.error('[layers/posts] erro Supabase:', error)
      return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
    }

    const result = (data ?? []).map((c) => ({
      id:          c.id,
      title:       c.title,
      description: c.description,
      createdAt:   c.created_at,
      updatedAt:   c.updated_at,
      category:    c.category ?? 'Avisos',
      attachments: c.attachments ?? [],
      targets:     c.targets,
      author:      { name: c.author_name ?? 'Raiz Educação' },
      approved:    c.approved,
    }))

    console.log(`[layers/posts] community=${community} after=${after} retornando ${result.length} comunicados`)
    return NextResponse.json({ result })

  } catch (err) {
    console.error('[layers/posts] erro inesperado:', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
