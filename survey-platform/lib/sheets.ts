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
  answers:      Record<string, unknown>
}

export async function syncToSheets(payload: SheetsSyncPayload): Promise<boolean> {
  const url = process.env.SHEETS_WEBHOOK_URL
  if (!url) return false

  // Espalha answers no topo — formato esperado pelo Apps Script (doPost → salvarResposta)
  // Ex: answers.nps, answers.bilingue, answers.pedagogico, etc. viram campos top-level
  const body = {
    surveyId:     payload.surveyId,
    communityId:  payload.communityId,
    userId:       payload.userId,
    onda:         payload.onda,
    perfil:       payload.perfil,
    nomeCompleto: payload.nomeCompleto,
    nomeAluno:    payload.nomeAluno,
    serie:        payload.serie,
    ...payload.answers,
  }

  try {
    const res = await fetch(url, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(body),
      signal:  AbortSignal.timeout(10_000),
    })
    return res.ok
  } catch {
    return false
  }
}
