import type { SurveyConfig } from '@/components/survey-engine/utils/types'

/* ══════════════════════════════════════════════════════
   LINKS DE INDICAÇÃO POR ESCOLA
   Migrado de pesquisa.html L.510–524
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

/* ══════════════════════════════════════════════════════
   REGISTRY DE PESQUISAS (hardcoded — Fase 1)
   Migrado de pesquisa.html L.111–213
   Na Fase 2 será substituído por chamadas à API.
   ══════════════════════════════════════════════════════ */
export const SURVEYS: Record<string, SurveyConfig> = {

  /* ── CSAT — Pesquisa de Satisfação ──────────────────── */
  'csat': {
    id: 'csat',
    titulo: 'Pesquisa de Satisfação 2026',
    tipo_pesquisa: 'quantitativa',
    publico: ['responsavel', 'aluno'],
    steps: [
      { type: 'welcome' },

      {
        type: 'nps',
        key: 'nps',
        perguntaBilingue: true,
      },

      {
        type: 'scale',
        key: 'bilingue',
        titulo: 'Programa Bilíngue',
        desc: 'Avalie os aspectos do programa bilíngue da {tipo}.',
        condicional: (ans) => {
          const nps = ans.nps as { participa_bilingue?: string } | undefined
          return nps?.participa_bilingue === 'Sim'
        },
        secoes: [
          {
            key: 'ingles_todo_dia',
            titulo: 'Inglês Todo Dia',
            perguntas: [
              'Qualidade geral do programa e materiais didáticos',
              'Integração do inglês com outras áreas do conhecimento (CLIL)',
              'Desenvolvimento das habilidades e interesse pelo aprendizado do inglês',
            ],
          },
          {
            key: 'turno_integral',
            titulo: 'Turno Integral Bilíngue',
            perguntas: [
              'Qualidade geral do projeto e atividades complementares',
              'Quantidade e diversidade das aulas e horas dedicadas ao inglês',
              'Uso dos espaços da {tipo} para imersão no inglês',
            ],
          },
        ],
      },

      {
        type: 'scale',
        key: 'pedagogico',
        titulo: 'Eixo Pedagógico',
        desc: 'Avalie de 1 a 5 os seguintes aspectos:',
        perguntas: [
          'Qualidade do ensino (professores, metodologias e estímulo ao aprendizado)',
          'Recursos pedagógicos e suporte no integral/ateliê (plataformas, materiais e serviços)',
          'Acolhimento e desenvolvimento emocional (atenção ao aluno e apoio às famílias)',
        ],
      },

      {
        type: 'scale',
        key: 'administrativo',
        titulo: 'Eixo Administrativo',
        desc: 'Avalie de 1 a 5 os seguintes aspectos:',
        perguntas: [
          'Gestão e organização da {tipo} (direção, coordenação e rotina de entrada e saída)',
          'Atendimento ao público (secretaria e financeiro)',
          'Canais digitais de comunicação (informações no app da {tipo}, e-mail e redes sociais/sites)',
        ],
      },

      {
        type: 'scale',
        key: 'infraestrutura',
        titulo: 'Eixo Infraestrutura',
        desc: 'Avalie de 1 a 5 os seguintes aspectos:',
        perguntas: [
          'Conforto e segurança dos espaços (salas, convivência e recepção)',
          'Higiene e conservação (limpeza geral e banheiros)',
          'Alimentação e serviços de apoio (cantina, variedade e organização do refeitório)',
        ],
      },

      { type: 'thankyou' },
    ],
  },

  /* ── Adicione novas pesquisas abaixo ─────────────────── */
}
