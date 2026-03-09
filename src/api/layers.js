/**
 * Integração com a API da Layers Education
 *
 * Substitua as constantes abaixo com os valores reais do seu ambiente Layers.
 * Documentação: https://developers.layers.education
 */

// ⚙️ Configure aqui
const LAYERS_API_URL = 'https://api.layers.education'
const COMMUNITY_SLUG = 'SUA_COMUNIDADE'   // ex: 'escola-abc'
const SURVEY_ALIAS = 'csat-bilingue-2025' // identificador único desta pesquisa

/**
 * Envia as respostas da pesquisa para a Layers.
 *
 * @param {Object} answers - Objeto com todas as respostas agrupadas por step
 * @param {Object} ctx     - Contexto Layers: { userId, communityId, token }
 */
export async function submitSurvey(answers, ctx) {
  const payload = buildPayload(answers, ctx)

  const res = await fetch(`${LAYERS_API_URL}/communities/${COMMUNITY_SLUG}/surveys/${SURVEY_ALIAS}/responses`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(ctx.token ? { Authorization: `Bearer ${ctx.token}` } : {}),
    },
    body: JSON.stringify(payload),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.message || `Erro ${res.status} ao enviar respostas.`)
  }

  return res.json()
}

/**
 * Converte o estado interno do formulário para o formato esperado pela Layers.
 * Ajuste os campos conforme o schema da sua pesquisa na plataforma.
 */
function buildPayload(answers, ctx) {
  const { identificacao, nps, bilingue, pedagogico, administrativo, infraestrutura } = answers

  return {
    userId: ctx.userId || null,
    communityId: ctx.communityId || null,
    surveyAlias: SURVEY_ALIAS,
    submittedAt: new Date().toISOString(),

    responses: {
      // Identificação
      perfil: identificacao?.perfil,
      unidade: identificacao?.unidade,
      segmento: identificacao?.segmento,

      // NPS
      nps_score: nps?.nps,
      participa_bilingue: nps?.participa_bilingue,

      // Bilíngue (opcional)
      ...(bilingue && {
        bilingue_ingles_todo_dia: bilingue.ingles_todo_dia,
        bilingue_turno_integral: bilingue.turno_integral,
      }),

      // Eixos
      eixo_pedagogico: pedagogico,
      eixo_administrativo: administrativo,
      eixo_infraestrutura: infraestrutura,
    },
  }
}
