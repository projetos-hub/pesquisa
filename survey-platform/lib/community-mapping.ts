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
  "COLÉGIO UNIÃO": "uniao",
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
  "GLOBAL TREE RIO 2": "w370xa35",
  "SARA DAWSEY - TIJUCA": "y9490m37",
  "SARAH DAWSEY - JUIZ DE FORA": "sarahdawsey-juizdefora",
}

export function resolveCommunityId(nomeFantasia: string): string | null {
  const normalized = nomeFantasia.toUpperCase().trim()
  return NOMEFANTASIA_TO_COMMUNITY_ID[normalized] || null
}
