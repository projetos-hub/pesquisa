// Dicionário: NOMEFANTASIA (TOTVS) → community_id (Layers)
// Extraído de "Virada Layers 2026_Checklist"
// Última atualização: 2026-04-20

export const NOMEFANTASIA_TO_COMMUNITY_ID: Record<string, string> = {
  "APOGEU GLOBAL SCHOOL CIDADE ALTA": "yf24y2k7",
  "APOGEU GLOBAL SCHOOL FERREIRA GUIMARÃES": "fwnash24",
  "APOGEU SANTO ANTÔNIO I": "apogeu-santoantonio-i",
  "APOGEU SANTO ANTÔNIO II": "apogeu-santoantonio-ii",
  "APOGEU ZONA NORTE": "wmfkn49h",
  "BOM TEMPO CRECHE E EDUCAÇÃO INFANTIL": "bomtempo",
  "COLÉGIO AMERICANO BILÍNGUE": "americano",
  "COLÉGIO LEONARDO DA VINCI ALFA": "leonardodavinci-alfa",
  "COLÉGIO LEONARDO DA VINCI BETA": "leonardodavinci-beta",
  "COLÉGIO LEONARDO DA VINCI GAMA": "leonardodavinci-gama",
  "COLÉGIO MATRIZ EDUCAÇÃO BANGU": "matriz-bangu",
  "COLÉGIO MATRIZ EDUCAÇÃO CAMPO GRANDE": "matriz-campogrande",
  "COLÉGIO MATRIZ EDUCAÇÃO CAXIAS": "matriz-caxias",
  "COLÉGIO MATRIZ EDUCAÇÃO MADUREIRA": "matriz-madureira",
  "COLÉGIO MATRIZ EDUCAÇÃO NOVA IGUAÇU": "matriz-novaiguacu",
  "COLÉGIO MATRIZ EDUCAÇÃO RETIRO DOS ARTISTAS": "matriz-retirodosartistas",
  "COLÉGIO MATRIZ EDUCAÇÃO ROCHA MIRANDA": "matriz-rochamiranda",
  "COLÉGIO MATRIZ EDUCAÇÃO SÃO JOÃO DE MERITI": "matriz-saojoaodemeriti",
  "COLÉGIO MATRIZ EDUCAÇÃO TAQUARA": "matriz-taquara",
  "COLÉGIO MATRIZ EDUCAÇÃO TIJUCA": "matriz-tijuca",
  "COLÉGIO QI FREGUESIA": "qi-freguesia",
  "COLÉGIO QI METROPOLITANO": "qi-metropolitano",
  "COLÉGIO QI RECREIO": "qi-recreio",
  "COLÉGIO QI RIO 2": "qi-rio2",
  "COLÉGIO QI TIJUCA": "qi-tijuca",
  "COLÉGIO QI VALQUEIRE": "az51800x",
  "COLÉGIO UNIFICADO ZONA SUL": "unificado-zonasul",
  "UNIFICADO ZONA SUL": "unificado-zonasul",
  "COLÉGIO UNIÃO": "uniao",
  "COLÉGIO E CURSO UNIÃO LTDA": "uniao",
  "CRECHE ESCOLA GLOBAL TREE - RIO 2": "creche-globaltree",
  "CUBO GLOBAL SCHOOL BARRA GOLF": "k4ys44r2",
  "CUBO GLOBAL SCHOOL BOSQUE MARAPENDI": "yxak8s0k",
  "CUBO GLOBAL SCHOOL BOTAFOGO": "ns8z5w8m",
  "ESCOLA SAP": "sap",
  "ESCOLA SÁ PEREIRA - FUNDAMENTAL E MÉDIO": "xa7y5zam",
  "ESCOLA SÁ PEREIRA - INFANTIL E 1º ANO (FUND I)": "w213sfza",
  "GLOBAL TREE BARRA GOLF": "w9593n19",
  "GLOBAL TREE BOSQUE MARAPENDI": "globaltree-abm",
  "GLOBAL TREE BOTAFOGO": "n6k47n81",
  "GLOBAL TREE PENÍNSULA": "rf3zk695",
  "GLOBAL TREE PENINSULA": "rf3zk695",
  "GLOBAL TREE RECREIO": "w9593n19",
  "GLOBAL TREE RIO 2": "w370xa35",
  "CRECHE ESCOLA GLOBAL TREE - ABM": "globaltree-abm",
  "CRECHE ESCOLA GLOBAL TREE - PENINSULA": "rf3zk695",
  "CRECHE ESCOLA GLOBAL TREE - RECREIO": "w9593n19",
  "SARA DAWSEY - TIJUCA": "y9490m37",
  "SARAH DAWSEY - JUIZ DE FORA": "sarahdawsey-juizdefora",

  // Holding / administrativo
  "RAIZ EDUCAÇÃO":  "raizeducacao",
  "RAIZ EDUCACAO":  "raizeducacao",

  // Variantes TOTVS — "COLEGIO E CURSO" em vez de "COLÉGIO"
  "COLEGIO E CURSO MATRIZ EDUCACAO BANGU":              "matriz-bangu",
  "COLEGIO E CURSO MATRIZ EDUCACAO CAMPO GRANDE":       "matriz-campogrande",
  "COLEGIO E CURSO MATRIZ EDUCACAO CAXIAS":             "matriz-caxias",
  "COLEGIO E CURSO MATRIZ EDUCACAO MADUREIRA":          "matriz-madureira",
  "COLEGIO E CURSO MATRIZ EDUCACAO NOVA IGUACU":        "matriz-novaiguacu",
  "COLEGIO E CURSO MATRIZ EDUCACAO RETIRO DOS ARTISTAS":"matriz-retirodosartistas",
  "COLEGIO E CURSO MATRIZ EDUCACAO ROCHA MIRANDA":      "matriz-rochamiranda",
  "COLEGIO E CURSO MATRIZ EDUCACAO SAO JOAO DE MERITI": "matriz-saojoaodemeriti",
  "COLEGIO E CURSO MATRIZ EDUCACAO TAQUARA":            "matriz-taquara",
  "COLEGIO E CURSO MATRIZ EDUCACAO TIJUCA":             "matriz-tijuca",

  // Variantes TOTVS — traço antes do campus
  "COLÉGIO LEONARDO DA VINCI - ALFA":   "leonardodavinci-alfa",
  "COLÉGIO LEONARDO DA VINCI - BETA":   "leonardodavinci-beta",
  "COLÉGIO LEONARDO DA VINCI - GAMA":   "leonardodavinci-gama",
  "COLEGIO LEONARDO DA VINCI - ALFA":   "leonardodavinci-alfa",
  "COLEGIO LEONARDO DA VINCI - BETA":   "leonardodavinci-beta",
  "COLEGIO LEONARDO DA VINCI - GAMA":   "leonardodavinci-gama",

  // Variantes TOTVS — Sarah Dawsey com "COLEGIO" na frente
  "COLEGIO SARAH DAWSEY - JUIZ DE FORA": "sarahdawsey-juizdefora",
  "COLÉGIO SARAH DAWSEY - JUIZ DE FORA": "sarahdawsey-juizdefora",
  "COLEGIO SARA DAWSEY - TIJUCA":        "y9490m37",
  "COLÉGIO SARA DAWSEY - TIJUCA":        "y9490m37",

  // Variantes TOTVS — Sá Pereira
  "ESCOLA SA PEREIRA (R. DA MATRIZ)":    "xa7y5zam",
  "ESCOLA SA PEREIRA - FUND E MEDIO":    "xa7y5zam",
  "ESCOLA SA PEREIRA - INFANTIL":        "w213sfza",
  "COLEGIO SA PEREIRA":                  "xa7y5zam",
}

function normalize(s: string): string {
  return s
    .toUpperCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove acentos
    .replace(/\s+/g, ' ')            // normaliza espaços
}

// Índice normalizado para lookup acento-insensível
const NORMALIZED_INDEX: Record<string, string> = Object.fromEntries(
  Object.entries(NOMEFANTASIA_TO_COMMUNITY_ID).map(([k, v]) => [normalize(k), v])
)

export function resolveCommunityId(nomeFantasia: string): string | null {
  const raw = nomeFantasia.toUpperCase().trim()
  // 1. Exact match (com acento)
  if (NOMEFANTASIA_TO_COMMUNITY_ID[raw]) return NOMEFANTASIA_TO_COMMUNITY_ID[raw]
  // 2. Acento-insensível
  const norm = normalize(nomeFantasia)
  return NORMALIZED_INDEX[norm] || null
}
