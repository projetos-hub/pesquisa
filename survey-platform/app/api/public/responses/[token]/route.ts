import {
  getPublicResponsesDataset,
  parsePublicResponseFormat,
  publicResponsesFilename,
  publicResponsesToCsv,
  publicResponsesToJson,
  publicResponsesToXlsx,
} from '@/lib/public-responses'

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const maxDuration = 60

interface RouteContext {
  params: Promise<{ token: string }>
}

export async function GET(request: Request, context: RouteContext) {
  const { token: rawToken } = await context.params
  const url = new URL(request.url)
  const { token, format } = parsePublicResponseFormat(rawToken, url.searchParams)
  const dataset = await getPublicResponsesDataset(token)

  if (!dataset) {
    return Response.json({ error: 'Link invalido ou expirado' }, { status: 404 })
  }

  const filename = publicResponsesFilename(dataset, format)

  if (format === 'csv') {
    return new Response(publicResponsesToCsv(dataset), {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store',
      },
    })
  }

  if (format === 'xlsx') {
    const buffer = await publicResponsesToXlsx(dataset)
    return new Response(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store',
      },
    })
  }

  return Response.json(publicResponsesToJson(dataset), {
    headers: {
      'Cache-Control': 'no-store',
    },
  })
}
