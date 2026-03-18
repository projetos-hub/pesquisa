/**
 * PLATAFORMA DE PESQUISAS — Google Apps Script
 *
 * Como configurar:
 * 1. Abra o Google Sheets: sheets.new
 * 2. Extensões → Apps Script
 * 3. Cole este código substituindo o que aparecer
 * 4. Salvar → Implantar → Nova implantação
 *    - Tipo: App da Web
 *    - Executar como: Eu (sua conta)
 *    - Quem tem acesso: Qualquer pessoa
 * 5. Copie a URL gerada e cole no pesquisa.html em SHEETS_WEBHOOK
 */

// ─── ⚙️ CONFIGURAÇÃO GLOBAL ──────────────────────────────────────────────────
const CONFIG = {
  onda:      '1S2026',
  openDate:  '2026-03-01',  // AAAA-MM-DD
  closeDate: '2026-06-30',  // AAAA-MM-DD — altere para prorrogar
  surveyId:  'csat',        // survey padrão quando não informado na URL
};

// E-mail para notificações de erro
const EMAIL_ERROS = 'projetos@raizeducacao.com.br';

// ─── 🏫 MAPA DE COMUNIDADES ───────────────────────────────────────────────────
// communityId (sem @) → dados da escola
const COMUNIDADES = {
  // AMERICANO
  'americano': { school:'americano', tipo:'escola', nome:'Colégio Americano Bilíngue' },

  // APOGEU
  'yf24y2k7':               { school:'apogeu-global', tipo:'escola', nome:'Apogeu Global School Cidade Alta' },
  'fwnash24':               { school:'apogeu-global', tipo:'escola', nome:'Apogeu Global School Ferreira Guimarães' },
  'apogeu-santoantonio-i':  { school:'apogeu',        tipo:'escola', nome:'Apogeu Santo Antônio I' },
  'apogeu-santoantonio-ii': { school:'apogeu',        tipo:'escola', nome:'Apogeu Santo Antônio II' },
  'wmfkn49h':               { school:'apogeu',        tipo:'escola', nome:'Apogeu Zona Norte' },

  // CUBO GLOBAL SCHOOL
  'ns8z5w8m':  { school:'cubo', tipo:'escola', nome:'Cubo Global School Botafogo' },
  'yxak8s0k':  { school:'cubo', tipo:'escola', nome:'Cubo Global School Bosque Marapendi' },
  'k4ys44r2':  { school:'cubo', tipo:'escola', nome:'Cubo Global School Barra Golf' },

  // CLV
  'leonardodavinci-alfa':  { school:'clv', tipo:'escola', nome:'Colégio Leonardo da Vinci Alfa' },
  'leonardodavinci-beta':  { school:'clv', tipo:'escola', nome:'Colégio Leonardo da Vinci Beta' },
  'leonardodavinci-gama':  { school:'clv', tipo:'escola', nome:'Colégio Leonardo da Vinci Gama' },

  // GLOBAL TREE — creche
  'n6k47n81':       { school:'global-tree', tipo:'creche', nome:'Global Tree Botafogo' },
  'w9593n19':       { school:'global-tree', tipo:'creche', nome:'Global Tree Barra Golf' },
  'rf3zk695':       { school:'global-tree', tipo:'creche', nome:'Global Tree Península' },
  'w95k0s77':       { school:'global-tree', tipo:'creche', nome:'Global Tree Rio 2' },
  'globaltree-abm': { school:'global-tree', tipo:'creche', nome:'Global Tree Bosque Marapendi' },

  // MATRIZ
  'matriz-bangu':             { school:'matriz', tipo:'escola', nome:'Matriz Bangu' },
  'matriz-campogrande':       { school:'matriz', tipo:'escola', nome:'Matriz Campo Grande' },
  'matriz-caxias':            { school:'matriz', tipo:'escola', nome:'Matriz Caxias' },
  'matriz-madureira':         { school:'matriz', tipo:'escola', nome:'Matriz Madureira' },
  'matriz-novaiguacu':        { school:'matriz', tipo:'escola', nome:'Matriz Nova Iguaçu' },
  'matriz-rochamiranda':      { school:'matriz', tipo:'escola', nome:'Matriz Rocha Miranda' },
  'matriz-retirodosartistas': { school:'matriz', tipo:'escola', nome:'Matriz Retiro dos Artistas' },
  'matriz-saojoaodemeriti':   { school:'matriz', tipo:'escola', nome:'Matriz São João de Meriti' },
  'matriz-taquara':           { school:'matriz', tipo:'escola', nome:'Matriz Taquara' },
  'matriz-tijuca':            { school:'matriz', tipo:'escola', nome:'Matriz Tijuca' },

  // QI
  'qi-freguesia':     { school:'qi', tipo:'escola', nome:'Qi Freguesia' },
  'qi-metropolitano': { school:'qi', tipo:'escola', nome:'Qi Metropolitano' },
  'qi-recreio':       { school:'qi', tipo:'escola', nome:'Qi Recreio' },
  'qi-rio2':          { school:'qi', tipo:'escola', nome:'Qi Rio 2' },
  'qi-tijuca':        { school:'qi', tipo:'escola', nome:'Qi Tijuca' },
  'az51800x':         { school:'qi', tipo:'escola', nome:'Qi Valqueire' },

  // SÁ PEREIRA
  'w213sfza': { school:'sa-pereira', tipo:'escola', nome:'Sá Pereira Infantil e 1º ano' },
  'xa7y5zam': { school:'sa-pereira', tipo:'escola', nome:'Sá Pereira Fundamental e Médio' },

  // SAP
  'sap': { school:'sap', tipo:'escola', nome:'Escola SAP' },

  // SARAH DAWSEY
  'sarahdawsey-juizdefora': { school:'sarah-dawsey', tipo:'escola', nome:'Sarah Dawsey Juiz de Fora' },
  'y9490m37':               { school:'sarah-dawsey', tipo:'escola', nome:'Sarah Dawsey Tijuca' },

  // UNIÃO
  'uniao': { school:'uniao', tipo:'escola', nome:'Colégio União' },

  // UNIFICADO
  'unificado-zonasul': { school:'unificado', tipo:'escola', nome:'Colégio Unificado Zona Sul' },

  // RAIZ EDUCAÇÃO
  'raizeducacao': { school:'raizeducacao', tipo:'escola', nome:'Raiz Educação' },
};

// ─── 📋 COLUNAS DO CSAT ───────────────────────────────────────────────────────
const COLUNAS_CSAT = [
  'data_resposta', 'onda', 'survey_id', 'community_id', 'escola_nome', 'escola_slug', 'tipo',
  'perfil', 'nome_responsavel', 'nome_aluno', 'serie', 'user_id',
  'nps', 'segmento_nps', 'participa_bilingue',
  'bil_ingles_qualidade_programa', 'bil_ingles_integracao_clil', 'bil_ingles_desenvolvimento_habilidades',
  'bil_turno_qualidade_projeto', 'bil_turno_quantidade_aulas', 'bil_turno_uso_espacos',
  'ped_qualidade_ensino', 'ped_recursos_pedagogicos', 'ped_acolhimento_emocional',
  'adm_gestao_organizacao', 'adm_atendimento_publico', 'adm_canais_digitais',
  'inf_conforto_seguranca', 'inf_higiene_conservacao', 'inf_alimentacao_servicos',
];

// ─── 🛠️ HELPERS ──────────────────────────────────────────────────────────────

function comunidadeInfo(communityId) {
  const id = (communityId || '').replace('@', '');
  return COMUNIDADES[id] || { school: id, tipo: 'escola', nome: id };
}

function corsHeaders(output) {
  // Apps Script Web App com acesso "Qualquer pessoa" já libera CORS automaticamente.
  // TextOutput não suporta setHeader — retorna direto.
  return output;
}

function getOrCreateSheet(name, headers) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    sheet.appendRow(headers);
    sheet.setFrozenRows(1);
    const header = sheet.getRange(1, 1, 1, headers.length);
    header.setBackground('#667eea');
    header.setFontColor('#ffffff');
    header.setFontWeight('bold');
    sheet.setColumnWidth(1, 160);
  }
  return sheet;
}

// ─── 📥 GET — retorna config da escola para o mini app ───────────────────────
function doGet(e) {
  const params      = e.parameter || {};
  const communityId = params.communityId || '';
  const surveyId    = params.surveyId || CONFIG.surveyId;

  const escola = comunidadeInfo(communityId);

  const hoje    = new Date();
  hoje.setHours(0, 0, 0, 0);
  const dtOpen  = new Date(CONFIG.openDate  + 'T00:00:00');
  const dtClose = new Date(CONFIG.closeDate + 'T00:00:00');
  const status  = hoje < dtOpen ? 'nao_aberta' : hoje > dtClose ? 'encerrada' : 'aberta';

  const response = {
    ok:        true,
    surveyId,
    onda:      CONFIG.onda,
    openDate:  CONFIG.openDate,
    closeDate: CONFIG.closeDate,
    status,
    school:    escola.school,
    tipo:      escola.tipo,
    nome:      params.nome      || '',
    perfil:    params.perfil    || '',
    nomeAluno: params.nomeAluno || '',
    serie:     params.serie     || '',
  };

  return corsHeaders(
    ContentService.createTextOutput(JSON.stringify(response))
      .setMimeType(ContentService.MimeType.JSON)
  );
}

// ─── 📤 POST — roteador principal ────────────────────────────────────────────
function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);

    if (data.type === 'error') {
      return registrarErro(data);
    }

    return salvarResposta(data);

  } catch (err) {
    return corsHeaders(
      ContentService.createTextOutput(JSON.stringify({ ok: false, error: err.message }))
        .setMimeType(ContentService.MimeType.JSON)
    );
  }
}

// ─── 💾 SALVAR RESPOSTA ───────────────────────────────────────────────────────
function salvarResposta(data) {
  const surveyId = data.surveyId || 'csat';

  if (surveyId === 'csat') {
    return salvarRespostaCsat(data);
  }

  return salvarRespostaDinamica(data, surveyId);
}

function logDebug(data) {
  const sheet = getOrCreateSheet('_Debug', ['timestamp', 'payload_raw']);
  sheet.appendRow([new Date().toISOString(), JSON.stringify(data)]);
}

function salvarRespostaCsat(data) {
  logDebug(data);

  const sheet      = getOrCreateSheet('Respostas_csat', COLUNAS_CSAT);
  const escola     = comunidadeInfo(data.communityId);
  const escolaNome = data.nomeEscola || escola.nome;
  const escolaSlug = data.schoolSlug || escola.school;

  const bil = data.bilingue       || {};
  const ped = data.pedagogico     || {};
  const adm = data.administrativo || {};
  const inf = data.infraestrutura || {};

  const nps      = Number(data.nps?.nps ?? data.nps ?? 0);
  const segmento = nps >= 9 ? 'Promotor' : nps >= 7 ? 'Neutro' : 'Detrator';

  const PED_KEYS = Object.keys(ped);
  const ADM_KEYS = Object.keys(adm);
  const INF_KEYS = Object.keys(inf);

  const row = [
    new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' }),
    CONFIG.onda,
    'csat',
    data.communityId  || '',
    escolaNome,
    escolaSlug,
    escola.tipo,
    data.perfil       || '',
    data.nomeCompleto || '',
    data.nomeAluno    || '',
    data.serie        || '',
    data.userId       || '',
    nps,
    segmento,
    data.nps?.participa_bilingue || 'Não',
    bil.ingles_todo_dia?.[0] ?? '',
    bil.ingles_todo_dia?.[1] ?? '',
    bil.ingles_todo_dia?.[2] ?? '',
    bil.turno_integral?.[0]  ?? '',
    bil.turno_integral?.[1]  ?? '',
    bil.turno_integral?.[2]  ?? '',
    ped[PED_KEYS[0]] ?? '',
    ped[PED_KEYS[1]] ?? '',
    ped[PED_KEYS[2]] ?? '',
    adm[ADM_KEYS[0]] ?? '',
    adm[ADM_KEYS[1]] ?? '',
    adm[ADM_KEYS[2]] ?? '',
    inf[INF_KEYS[0]] ?? '',
    inf[INF_KEYS[1]] ?? '',
    inf[INF_KEYS[2]] ?? '',
  ];

  sheet.appendRow(row);

  return corsHeaders(
    ContentService.createTextOutput(JSON.stringify({ ok: true }))
      .setMimeType(ContentService.MimeType.JSON)
  );
}

// Para pesquisas futuras: cria aba com nome do surveyId e colunas dinâmicas
function salvarRespostaDinamica(data, surveyId) {
  const COLS_FIXAS = [
    'data_resposta', 'onda', 'survey_id', 'community_id',
    'escola_nome', 'escola_slug', 'tipo',
    'perfil', 'nome_responsavel', 'nome_aluno', 'serie', 'user_id',
  ];

  const META_KEYS = new Set([
    'type','surveyId','communityId','userId','session',
    'onda','school','tipo','perfil','nomeCompleto','nomeAluno','serie',
  ]);
  const respostaKeys = Object.keys(data).filter(k => !META_KEYS.has(k));

  const sheetName = 'Respostas_' + surveyId.replace(/[^a-zA-Z0-9_-]/g, '_');
  const sheet = getOrCreateSheet(sheetName, [...COLS_FIXAS, ...respostaKeys]);
  const escola = comunidadeInfo(data.communityId);

  const rowFixa = [
    new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' }),
    data.onda       || CONFIG.onda,
    surveyId,
    data.communityId || '',
    escola.nome,
    escola.school,
    escola.tipo,
    data.perfil       || '',
    data.nomeCompleto || '',
    data.nomeAluno    || '',
    data.serie        || '',
    data.userId       || '',
  ];

  const rowRespostas = respostaKeys.map(k => {
    const v = data[k];
    return typeof v === 'object' ? JSON.stringify(v) : (v ?? '');
  });

  sheet.appendRow([...rowFixa, ...rowRespostas]);

  return corsHeaders(
    ContentService.createTextOutput(JSON.stringify({ ok: true }))
      .setMimeType(ContentService.MimeType.JSON)
  );
}

// ─── ⚠️ REGISTRAR ERRO E NOTIFICAR ───────────────────────────────────────────
function registrarErro(data) {
  const COLUNAS_ERROS = ['timestamp', 'survey_id', 'community_id', 'user_id'];
  const sheet = getOrCreateSheet('Erros', COLUNAS_ERROS);

  sheet.appendRow([
    data.timestamp   || new Date().toISOString(),
    data.surveyId    || '',
    data.communityId || '',
    data.userId      || '',
  ]);

  // Conta total de ocorrências deste surveyId
  const allData    = sheet.getDataRange().getValues();
  const totalErros = allData.slice(1).filter(row => row[1] === data.surveyId).length;

  // Envia e-mail no máximo 1x por hora para o mesmo surveyId
  if (deveEnviarEmail(sheet, data.surveyId)) {
    const assunto = 'ERRO PESQUISA - ' + (data.surveyId || 'desconhecida');
    const corpo = [
      'Uma pesquisa não encontrada foi acessada.',
      '',
      'Pesquisa: '          + (data.surveyId    || '-'),
      'Escola/Comunidade: ' + (data.communityId || '-'),
      'Usuário: '           + (data.userId      || '-'),
      'Data/Hora: '         + (data.timestamp   || new Date().toISOString()),
      '',
      'Total de usuários atingidos por este erro: ' + totalErros,
      '(contagem acumulada na aba "Erros" do Sheets)',
    ].join('\n');

    MailApp.sendEmail(EMAIL_ERROS, assunto, corpo);
  }

  return corsHeaders(
    ContentService.createTextOutput(JSON.stringify({ ok: true }))
      .setMimeType(ContentService.MimeType.JSON)
  );
}

// Retorna true se não houve e-mail enviado para este surveyId na última hora
function deveEnviarEmail(sheet, surveyId) {
  const allData     = sheet.getDataRange().getValues();
  const umHoraAtras = new Date(Date.now() - 60 * 60 * 1000).toISOString();

  const errosRecentes = allData.slice(1).filter(row =>
    row[1] === surveyId && String(row[0]) > umHoraAtras
  );

  // Se só existe 1 registro (o que acabamos de inserir) → é o primeiro na hora → enviar
  return errosRecentes.length <= 1;
}
