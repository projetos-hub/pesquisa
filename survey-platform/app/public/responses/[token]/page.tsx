import Link from 'next/link'
import {
  getPublicResponseLink,
  getPublicResponsesDataset,
  parsePublicResponseFormat,
} from '@/lib/public-responses'

export const dynamic = 'force-dynamic'
export const revalidate = 0

interface PageProps {
  params: Promise<{ token: string }>
  searchParams: Promise<{ key?: string }>
}

function cellText(value: unknown): string {
  if (value == null) return ''
  return typeof value === 'string' ? value : JSON.stringify(value)
}

function AccessForm({ token, invalidKey }: { token: string; invalidKey: boolean }) {
  return (
    <main className="min-h-screen bg-slate-950 px-6 py-10 text-white">
      <section className="mx-auto max-w-xl rounded-lg border border-white/10 bg-white/[0.06] p-6 shadow-2xl">
        <p className="text-xs font-bold uppercase tracking-[0.28em] text-orange-300">Acesso protegido</p>
        <h1 className="mt-3 text-2xl font-black">Digite a senha para ver as respostas</h1>
        <p className="mt-2 text-sm text-slate-300">
          Depois de liberar o acesso, a pagina mostra a tabela e o link tecnico para usar no Google Sheets.
        </p>

        <form method="GET" action={`/public/responses/${token}`} className="mt-5 space-y-3">
          <label className="block text-sm font-bold text-slate-200" htmlFor="key">
            Senha
          </label>
          <input
            id="key"
            name="key"
            type="password"
            autoComplete="off"
            className="w-full rounded-md border border-white/15 bg-white px-3 py-2 text-slate-950 outline-none focus:border-orange-300 focus:ring-2 focus:ring-orange-300/30"
            required
          />
          {invalidKey && (
            <p className="text-sm font-medium text-red-300">Senha incorreta ou link sem senha. Peça um novo link ao administrador.</p>
          )}
          <button type="submit" className="rounded-md bg-white px-4 py-2 text-sm font-black text-slate-950 hover:bg-orange-100">
            Acessar
          </button>
        </form>
      </section>
    </main>
  )
}

export default async function PublicResponsesPage({ params, searchParams }: PageProps) {
  const { token: rawToken } = await params
  const { key } = await searchParams
  const { token } = parsePublicResponseFormat(rawToken, new URLSearchParams())
  const link = await getPublicResponseLink(token)

  if (!link) {
    return (
      <main className="min-h-screen bg-slate-950 px-6 py-10 text-white">
        <section className="mx-auto max-w-3xl rounded-lg border border-white/10 bg-white/8 p-6">
          <h1 className="text-2xl font-bold">Link indisponivel</h1>
          <p className="mt-2 text-sm text-slate-300">Este link publico foi desativado, expirou ou nao existe.</p>
        </section>
      </main>
    )
  }

  if (!key) {
    return <AccessForm token={token} invalidKey={false} />
  }

  const dataset = await getPublicResponsesDataset(token, key)
  if (!dataset) {
    return <AccessForm token={token} invalidKey />
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://pesquisa-nu-sand.vercel.app'
  const apiBase = `/api/public/responses/${token}`
  const encodedKey = encodeURIComponent(key)
  const csvUrl = `${apiBase}.csv?key=${encodedKey}`
  const jsonUrl = `${apiBase}.json?key=${encodedKey}`
  const xlsxUrl = `${apiBase}.xlsx?key=${encodedKey}`
  const previewRows = dataset.rows.slice(0, 250)

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <section className="mx-auto flex max-w-[1440px] flex-col gap-5 px-4 py-5 sm:px-6">
        <header className="flex flex-col gap-4 border-b border-white/10 pb-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.28em] text-orange-300">Respostas publicas</p>
            <h1 className="mt-2 text-3xl font-black tracking-tight">{dataset.survey.title}</h1>
            <p className="mt-1 text-sm text-slate-300">
              {dataset.rowCount} respostas. Atualizado em {new Date(dataset.updatedAt).toLocaleString('pt-BR')}.
            </p>
            {dataset.sampleResponse.isSampleSurvey && (
              <p className="mt-1 text-sm font-semibold text-emerald-200">
                Taxa de resposta da amostra: {dataset.sampleResponse.responseRatePct !== null ? `${dataset.sampleResponse.responseRatePct}%` : '-'} ({dataset.sampleResponse.responseCount}/{dataset.sampleResponse.sampleSize})
              </p>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            <a className="rounded-md bg-white px-3 py-2 text-sm font-bold text-slate-950" href={csvUrl}>
              CSV
            </a>
            <a className="rounded-md bg-white px-3 py-2 text-sm font-bold text-slate-950" href={jsonUrl}>
              JSON
            </a>
            <a className="rounded-md bg-white px-3 py-2 text-sm font-bold text-slate-950" href={xlsxUrl}>
              XLSX
            </a>
            <Link className="rounded-md border border-white/20 px-3 py-2 text-sm font-bold text-white" href="/">
              Pesquisa
            </Link>
          </div>
        </header>

        <section className="rounded-lg border border-white/10 bg-white/[0.04] p-4">
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-slate-400">Google Sheets</p>
          <code className="mt-2 block overflow-x-auto rounded-md bg-slate-900 p-3 text-sm text-slate-100">
            =IMPORTDATA(&quot;{appUrl}{csvUrl}&quot;)
          </code>
        </section>

        <section className="overflow-hidden rounded-lg border border-white/10 bg-white text-slate-950">
          <div className="overflow-auto">
            <table className="min-w-full border-collapse text-sm">
              <thead className="sticky top-0 bg-slate-100">
                <tr>
                  {dataset.headers.map(header => (
                    <th key={header} className="whitespace-nowrap border-b border-slate-200 px-3 py-2 text-left text-xs font-black uppercase text-slate-600">
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {previewRows.map((row, rowIndex) => (
                  <tr key={rowIndex} className="border-b border-slate-100 odd:bg-white even:bg-slate-50">
                    {row.map((cell, cellIndex) => (
                      <td key={`${rowIndex}-${cellIndex}`} className="max-w-[360px] whitespace-nowrap px-3 py-2 text-slate-800">
                        {cellText(cell)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {dataset.rowCount > previewRows.length && (
            <p className="border-t border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
              Mostrando as primeiras {previewRows.length} respostas. Use CSV, JSON ou XLSX para baixar tudo.
            </p>
          )}
        </section>
      </section>
    </main>
  )
}
