// ─── Google Sheets Mirror — Fase 4 ───────────────────────────────────────────
//
// Envia respostas ao Apps Script após gravação no Supabase.
// Falha silenciosa: se o webhook não estiver configurado ou cair, a resposta
// permanece no Supabase com synced_to_sheets = false para reprocessamento futuro.

export interface SheetsSyncPayload {
  surveyId:     string
  communityId:  string
  userId:       string
  onda:         string
  perfil:       string
  nomeCompleto: string
  nomeAluno:    string
  serie:        string
  nomeEscola:   string
  answers:      Record<string, unknown>
}

const RETRY_ATTEMPTS = 3
const RETRY_DELAY_MS = 1_000

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function callWebhook(url: string, body: string): Promise<boolean> {
  try {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    const secret = process.env.SHEETS_WEBHOOK_SECRET
    if (secret) headers['X-Webhook-Secret'] = secret

    const res = await fetch(url, {
      method:  'POST',
      headers,
      body,
      signal:  AbortSignal.timeout(10_000),
    })
    if (!res.ok) return false
    const json = await res.json().catch(() => ({}))
    return (json as { ok?: boolean }).ok === true
  } catch {
    return false
  }
}

export async function syncToSheets(payload: SheetsSyncPayload): Promise<boolean> {
  const url = process.env.SHEETS_WEBHOOK_URL
  if (!url) return false

  // Espalha answers no topo — formato esperado pelo Apps Script (doPost → salvarResposta)
  const body = JSON.stringify({
    surveyId:     payload.surveyId,
    communityId:  payload.communityId,
    userId:       payload.userId,
    onda:         payload.onda,
    perfil:       payload.perfil,
    nomeCompleto: payload.nomeCompleto,
    nomeAluno:    payload.nomeAluno,
    serie:        payload.serie,
    nomeEscola:   payload.nomeEscola,
    ...payload.answers,
  })

  // Tenta até RETRY_ATTEMPTS vezes com backoff de RETRY_DELAY_MS entre cada
  for (let attempt = 1; attempt <= RETRY_ATTEMPTS; attempt++) {
    const ok = await callWebhook(url, body)
    if (ok) return true
    if (attempt < RETRY_ATTEMPTS) await sleep(RETRY_DELAY_MS)
  }

  return false
}
