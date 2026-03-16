// ─── Layers Hub API — enriquecimento de perfil do usuário ────────────────────
//
// Dependências necessárias (obter com equipe Layers):
//   LAYERS_CLIENT_ID     — env var
//   LAYERS_CLIENT_SECRET — env var
//
// Endpoints e autenticação a confirmar na documentação da Layers Hub API.
// Enquanto as credenciais não estiverem disponíveis, a função retorna null
// e o submit continua normalmente sem os dados de perfil.

export interface LayersUserProfile {
  nome?:      string
  perfil?:    string
  nomeAluno?: string
  serie?:     string
}

export async function fetchLayersUser(
  userId: string,
  session: string,
): Promise<LayersUserProfile | null> {
  const clientId     = process.env.LAYERS_CLIENT_ID
  const clientSecret = process.env.LAYERS_CLIENT_SECRET

  // Sem credenciais configuradas: fallback silencioso
  if (!clientId || !clientSecret || !userId || !session) return null

  // TODO: implementar chamada à Layers Hub API após receber documentação e credenciais.
  // Estrutura esperada:
  //
  // const res = await fetch(`${LAYERS_HUB_BASE_URL}/users/${userId}`, {
  //   headers: {
  //     Authorization: `Bearer ${session}`,
  //     'X-Client-Id': clientId,
  //   },
  //   signal: AbortSignal.timeout(5_000),
  // })
  // if (!res.ok) return null
  // const user = await res.json()
  // return {
  //   nome:      user.name      ?? '',
  //   perfil:    user.role      ?? '',
  //   nomeAluno: user.children?.[0]?.name  ?? '',
  //   serie:     user.children?.[0]?.grade ?? '',
  // }

  return null
}
