// Dicionario: NOMEFANTASIA (TOTVS) -> community_id (Layers)
// Extraido de "Virada Layers 2026_Checklist"
// Ultima atualizacao: 2026-04-20

export const NOMEFANTASIA_TO_COMMUNITY_ID: Record<string, string> = {
  "APOGEU GLOBAL SCHOOL CIDADE ALTA": "yf24y2k7",
  "APOGEU GLOBAL SCHOOL FERREIRA GUIMARAES": "fwnash24",
  "APOGEU SANTO ANTONIO I": "apogeu-santoantonio-i",
  "APOGEU SANTO ANTONIO II": "apogeu-santoantonio-ii",
  "APOGEU ZONA NORTE": "wmfkn49h",
  "BOM TEMPO CRECHE E EDUCACAO INFANTIL": "n6k47n81",
  "BOM TEMPO CRECHE E EDUCACAO INFANTIL LTDA": "n6k47n81",
  "COLEGIO AMERICANO": "americano",
  "COLEGIO AMERICANO BILINGUE": "americano",
  "COLEGIO E CURSO AO CUBO BARRA": "yxak8s0k",
  "COLEGIO E CURSO AO CUBO BOTAFOGO": "ns8z5w8m",
  "COLEGIO E CURSO CUBO BARRA GOLFE": "k4ys44r2",
  "COLEGIO E CURSO MATRIZ EDUCACAO BANGU": "matriz-bangu",
  "COLEGIO E CURSO MATRIZ EDUCACAO CAMPO GRANDE": "matriz-campogrande",
  "COLEGIO E CURSO MATRIZ EDUCACAO CAXIAS": "matriz-caxias",
  "COLEGIO E CURSO MATRIZ EDUCACAO DUQUE DE CAXIAS": "matriz-caxias",
  "COLEGIO E CURSO MATRIZ EDUCACAO MADUREIRA": "matriz-madureira",
  "COLEGIO E CURSO MATRIZ EDUCACAO NOVA IGUACU": "matriz-novaiguacu",
  "COLEGIO E CURSO MATRIZ EDUCACAO RETIRO DOS ARTISTAS": "matriz-retirodosartistas",
  "COLEGIO E CURSO MATRIZ EDUCACAO ROCHA MIRANDA": "matriz-rochamiranda",
  "COLEGIO E CURSO MATRIZ EDUCACAO SAO JOAO DE MERITI": "matriz-saojoaodemeriti",
  "COLEGIO E CURSO MATRIZ EDUCACAO TAQUARA": "matriz-taquara",
  "COLEGIO E CURSO MATRIZ EDUCACAO TIJUCA": "matriz-tijuca",
  "COLEGIO E CURSO UNIAO LTDA": "uniao",
  "COLEGIO LEONARDO DA VINCI ALFA": "leonardodavinci-alfa",
  "COLEGIO LEONARDO DA VINCI BETA": "leonardodavinci-beta",
  "COLEGIO LEONARDO DA VINCI GAMA": "leonardodavinci-gama",
  "COLEGIO LEONARDO DA VINCI - ALFA": "leonardodavinci-alfa",
  "COLEGIO LEONARDO DA VINCI - BETA": "leonardodavinci-beta",
  "COLEGIO LEONARDO DA VINCI - GAMA": "leonardodavinci-gama",
  "COLEGIO MATRIZ EDUCACAO BANGU": "matriz-bangu",
  "COLEGIO MATRIZ EDUCACAO CAMPO GRANDE": "matriz-campogrande",
  "COLEGIO MATRIZ EDUCACAO CAXIAS": "matriz-caxias",
  "COLEGIO MATRIZ EDUCACAO MADUREIRA": "matriz-madureira",
  "COLEGIO MATRIZ EDUCACAO NOVA IGUACU": "matriz-novaiguacu",
  "COLEGIO MATRIZ EDUCACAO RETIRO DOS ARTISTAS": "matriz-retirodosartistas",
  "COLEGIO MATRIZ EDUCACAO ROCHA MIRANDA": "matriz-rochamiranda",
  "COLEGIO MATRIZ EDUCACAO SAO JOAO DE MERITI": "matriz-saojoaodemeriti",
  "COLEGIO MATRIZ EDUCACAO TAQUARA": "matriz-taquara",
  "COLEGIO MATRIZ EDUCACAO TIJUCA": "matriz-tijuca",
  "COLEGIO QI BOTAFOGO": "qi-botafogo",
  "COLEGIO QI FREGUESIA": "qi-freguesia",
  "COLEGIO QI METROPOLITANO": "qi-metropolitano",
  "COLEGIO QI RECREIO": "qi-recreio",
  "COLEGIO QI RIO 2": "qi-rio2",
  "COLEGIO QI TIJUCA": "qi-tijuca",
  "COLEGIO QI VALQUEIRE": "az51800x",
  "COLEGIO SARA DAWSEY - TIJUCA": "y9490m37",
  "COLEGIO SARAH DAWSEY - JUIZ DE FORA": "sarahdawsey-juizdefora",
  "COLEGIO UNIAO": "uniao",
  "COLEGIO E CURSO UNIAO": "uniao",
  "COLEGIOS INTEGRADOS LEONARDO DA VINCI - GAMA": "leonardodavinci-gama",
  "COLEGIO UNIFICADO ZONA SUL": "unificado-zonasul",
  "CRECHE ESCOLA GLOBAL TREE - ABM": "globaltree-abm",
  "CRECHE ESCOLA GLOBAL TREE - PENINSULA": "rf3zk695",
  "CRECHE ESCOLA GLOBAL TREE - RECREIO": "w9593n19",
  "CRECHE ESCOLA GLOBAL TREE - RIO 2": "w95k0s77",
  "CUBO GLOBAL SCHOOL BARRA GOLF": "k4ys44r2",
  "CUBO GLOBAL SCHOOL BOSQUE MARAPENDI": "yxak8s0k",
  "CUBO GLOBAL SCHOOL BOTAFOGO": "ns8z5w8m",
  "ESCOLA SAP": "sap",
  "ESCOLA SA PEREIRA (R. DA MATRIZ)": "xa7y5zam",
  "ESCOLA SA PEREIRA - FUND E MEDIO": "xa7y5zam",
  "ESCOLA SA PEREIRA - FUNDAMENTAL E MEDIO": "xa7y5zam",
  "ESCOLA SA PEREIRA - INFANTIL": "w213sfza",
  "ESCOLA SA PEREIRA - INFANTIL E 1 ANO (FUND I)": "w213sfza",
  "ESCOLA SA PEREIRA S.A. CAPISTRANO": "w213sfza",
  "GLOBAL TREE BARRA GOLF": "w9593n19",
  "GLOBAL TREE BOSQUE MARAPENDI": "globaltree-abm",
  "GLOBAL TREE BOTAFOGO": "n6k47n81",
  "GLOBAL TREE PENINSULA": "rf3zk695",
  "GLOBAL TREE RECREIO": "w9593n19",
  "GLOBAL TREE RIO 2": "w95k0s77",
  "RAIZ EDUCACAO": "raizeducacao",
  "SARA DAWSEY - TIJUCA": "y9490m37",
  "SARAH DAWSEY - JUIZ DE FORA": "sarahdawsey-juizdefora",
  "UNIFICADO ZONA SUL": "unificado-zonasul",
}

function normalize(s: string): string {
  return s
    .toUpperCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
}

const NORMALIZED_INDEX: Record<string, string> = Object.fromEntries(
  Object.entries(NOMEFANTASIA_TO_COMMUNITY_ID).map(([k, v]) => [normalize(k), v])
)

export function resolveCommunityId(nomeFantasia: string): string | null {
  const raw = nomeFantasia.toUpperCase().trim()
  if (NOMEFANTASIA_TO_COMMUNITY_ID[raw]) return NOMEFANTASIA_TO_COMMUNITY_ID[raw]

  const norm = normalize(nomeFantasia)
  return NORMALIZED_INDEX[norm] || null
}
