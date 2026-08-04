export const dynamic = 'force-dynamic'

export async function GET() {
  return Response.json({
    apiVersion: 'v1',
    appUrl: process.env.NEXT_PUBLIC_APP_URL ?? 'https://pesquisa-nu-sand.vercel.app',
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
    supabasePublishableKey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    enrollment: 'supabase-password',
  }, { headers: { 'Cache-Control': 'no-store' } })
}
