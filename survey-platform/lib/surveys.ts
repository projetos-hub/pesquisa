/* ══════════════════════════════════════════════════════
   LINKS DE INDICAÇÃO POR ESCOLA
   Migrado de pesquisa.html L.510–524
   Permanece hardcoded até a Fase 5 (polimento).
   ══════════════════════════════════════════════════════ */
export const SCHOOL_LINKS: Record<string, string> = {
  'cubo':          'https://cubo.global/quem-confia-indica',
  'apogeu':        'https://apogeu.com.br/quem-confia-indica/',
  'apogeu-global': 'https://apogeu.global/quem-confia-indica/',
  'clv':           'https://colegioleonardodavinci.com.br/quem-confia-indica/',
  'global-tree':   'https://crecheglobaltree.com.br/quem-confia-indica/',
  'matriz':        'https://matrizeducacao.com.br/quem-confia-indica/',
  'qi':            'https://colegioqi.com.br/quem-confia-indica/',
  'sa-pereira':    'https://escolasapereira.com.br/quem-confia-indica/',
  'sap':           'https://escolasap.com.br/quem-confia-indica/',
  'sarah-dawsey':  'https://sdjf.com.br/quem-confia-indica/',
  'unificado':     'https://unificado.com.br/quem-confia-indica/',
  'americano':     'https://americanobilingue.com.br/quem-confia-indica/',
  'uniao':         'https://colegiouniao.com.br/quem-confia-indica/',
}

// SURVEYS removido na Fase 2A — pesquisas agora vêm do Supabase via GET /api/surveys/[slug]
