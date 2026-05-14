"""
Gera playbook HTML auto-contido (base64) otimizado para impressão/PDF.
Uso: python scripts/build-playbook-html.py
Output: docs/playbook-visual.html
Converter p/ PDF: abrir no Chrome → Imprimir → Salvar como PDF (A4, margens mínimas)
"""
import base64
from pathlib import Path

ROOT  = Path(__file__).parent.parent
SHOTS = ROOT / "docs" / "playbook-screenshots"
LOGO  = ROOT / "docs" / "logo-raiz.png"
OUT   = ROOT / "docs" / "playbook-visual.html"


def b64(path: Path) -> str:
    if not path.exists():
        return ""
    return "data:image/png;base64," + base64.b64encode(path.read_bytes()).decode()


def shot_tag(name: str, caption: str = "") -> str:
    src = b64(SHOTS / f"{name}.png")
    if not src:
        return f'<p class="missing">[screenshot {name} não encontrada]</p>'
    cap = f'<figcaption>{caption}</figcaption>' if caption else ""
    return f'<figure><img src="{src}" alt="{caption or name}">{cap}</figure>'


LOGO_SRC = b64(LOGO) if LOGO.exists() else ""

CSS = """
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

:root {
  --navy:  #0f3460;
  --dark:  #1a1a2e;
  --mid:   #16213e;
  --gray:  #555;
  --lgray: #999;
  --amber: #b07800;
  --amber-bg: #fff8e1;
  --amber-border: #ffc107;
  --red:   #e94560;
  --blue-hdr: #e8eef7;
  --blue-row: #f5f8ff;
  --white: #ffffff;
  --border: #dde3ee;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
  font-size: 11pt;
  line-height: 1.65;
  color: #222;
  background: #fff;
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
}

/* ── COVER ─────────────────────────────────────────────── */
.cover {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 96vh;
  text-align: center;
  page-break-after: always;
}
.cover img.logo { width: 180px; margin-bottom: 32px; }
.cover h1 {
  font-size: 32pt;
  font-weight: 700;
  color: var(--dark);
  line-height: 1.2;
  margin-bottom: 8px;
}
.cover .subtitle {
  font-size: 20pt;
  font-weight: 500;
  color: var(--navy);
  margin-bottom: 28px;
}
.cover .divider {
  width: 240px;
  height: 3px;
  background: var(--red);
  margin: 0 auto 28px;
  border-radius: 2px;
}
.cover .org { font-size: 13pt; color: var(--gray); margin-bottom: 6px; }
.cover .version { font-size: 9pt; color: var(--lgray); }

/* ── SECTIONS ───────────────────────────────────────────── */
section { page-break-before: always; padding-top: 8px; }

h2 {
  font-size: 18pt;
  font-weight: 700;
  color: var(--navy);
  border-bottom: 2px solid var(--blue-hdr);
  padding-bottom: 8px;
  margin-bottom: 20px;
  margin-top: 4px;
}
h3 {
  font-size: 13pt;
  font-weight: 600;
  color: var(--mid);
  margin-top: 24px;
  margin-bottom: 10px;
}
p { margin-bottom: 12px; }

/* ── LISTS ──────────────────────────────────────────────── */
ul, ol { margin: 0 0 14px 0; padding-left: 28px; }
li { margin-bottom: 5px; line-height: 1.6; }
ol { counter-reset: item; list-style: none; padding-left: 0; }
ol li { counter-increment: item; padding-left: 28px; position: relative; }
ol li::before {
  content: counter(item) ".";
  position: absolute; left: 0;
  font-weight: 600; color: var(--navy);
  min-width: 22px;
}

/* ── NOTE BOX ───────────────────────────────────────────── */
.note {
  border-left: 4px solid var(--amber-border);
  background: var(--amber-bg);
  padding: 10px 14px;
  margin: 16px 0;
  border-radius: 0 4px 4px 0;
  font-size: 10pt;
  color: var(--amber);
  page-break-inside: avoid;
}
.note strong { font-weight: 700; }

/* ── TABLES ─────────────────────────────────────────────── */
table {
  width: 100%;
  border-collapse: collapse;
  margin-bottom: 16px;
  font-size: 10pt;
  page-break-inside: avoid;
}
th {
  background: var(--blue-hdr);
  color: var(--navy);
  font-weight: 600;
  text-align: left;
  padding: 8px 12px;
  border: 1px solid var(--border);
}
td {
  padding: 7px 12px;
  border: 1px solid var(--border);
  vertical-align: top;
}
tr:nth-child(even) td { background: var(--blue-row); }

/* ── FIGURES ─────────────────────────────────────────────── */
figure {
  margin: 20px 0;
  page-break-inside: avoid;
  text-align: center;
}
figure img {
  max-width: 100%;
  width: 640px;
  border: 1px solid var(--border);
  border-radius: 6px;
  box-shadow: 0 2px 8px rgba(0,0,0,.10);
}
figcaption {
  font-size: 9pt;
  color: var(--lgray);
  font-style: italic;
  margin-top: 6px;
}
.missing { color: #c00; font-style: italic; font-size: 10pt; }

/* ── FOOTER ─────────────────────────────────────────────── */
footer {
  text-align: center;
  font-size: 9pt;
  color: var(--lgray);
  margin-top: 48px;
  padding-top: 16px;
  border-top: 1px solid var(--border);
}

/* ── PRINT ──────────────────────────────────────────────── */
@page {
  size: A4;
  margin: 18mm 16mm 18mm 16mm;
}
@media print {
  body { max-width: none; padding: 0; }
  .cover { min-height: 100vh; }
  a { color: inherit; text-decoration: none; }
  figure { page-break-inside: avoid; }
  h2 { page-break-after: avoid; }
  h3 { page-break-after: avoid; }
  table { page-break-inside: avoid; }
  .note { page-break-inside: avoid; }
}
"""

LOGO_HTML = f'<img class="logo" src="{LOGO_SRC}" alt="Raiz Educação">' if LOGO_SRC else ""

HTML = f"""<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Playbook Operacional — Plataforma de Pesquisa CSAT</title>
<style>{CSS}</style>
</head>
<body>

<!-- ═══════════════════ CAPA ═══════════════════════════════ -->
<div class="cover">
  {LOGO_HTML}
  <h1>Plataforma de Pesquisa CSAT</h1>
  <p class="subtitle">Guia Operacional</p>
  <div class="divider"></div>
  <p class="org">Raiz Educação &nbsp;|&nbsp; 2026</p>
  <p class="version">Versão 1.0 &nbsp;·&nbsp; pesquisa-nu-sand.vercel.app</p>
</div>

<!-- ═══════════════════ 1. INTRODUÇÃO ══════════════════════ -->
<section>
<h2>1. Introdução</h2>

<h3>O que é o sistema</h3>
<p>A Plataforma de Pesquisa CSAT é um mini-app de satisfação integrado à Layers Education. Permite que a equipe Raiz crie, configure e dispare pesquisas para alunos e responsáveis de escolas parceiras, coletando respostas estruturadas e exportando os dados para análise.</p>

<h3>Personas</h3>
<p><strong>Gestor Admin</strong> — membro da equipe Raiz com acesso ao painel administrativo. Cria e configura pesquisas, gerencia comunidades, dispara notificações e acompanha respostas.</p>
<p><strong>Respondente</strong> — aluno ou responsável de uma escola parceira. Acessa a pesquisa pelo portal Layers (iframe) ou por link direto.</p>

<h3>Acesso ao sistema</h3>
<ul>
  <li>Painel Admin: <strong>https://pesquisa-nu-sand.vercel.app/admin</strong></li>
  <li>Login: e-mail e senha cadastrados no sistema</li>
  <li>Portal do respondente: integrado ao app Layers da escola via iframe</li>
</ul>
</section>

<!-- ═══════════════════ 2. PRIMEIROS PASSOS ════════════════ -->
<section>
<h2>2. Primeiros Passos (Admin)</h2>

<h3>Login</h3>
<ol>
  <li>Acesse <strong>https://pesquisa-nu-sand.vercel.app/admin/login</strong></li>
  <li>Insira seu e-mail e senha</li>
  <li>Clique em <strong>Entrar</strong></li>
</ol>
<p>Você será redirecionado automaticamente para a listagem de pesquisas.</p>

{shot_tag("01-login", "Tela de login — acesso ao painel administrativo")}
{shot_tag("01b-login-preenchido", "Tela de login com credenciais preenchidas")}

<h3>Visão geral do painel</h3>
<p>O painel admin possui as seguintes seções no menu lateral:</p>
<table>
  <thead><tr><th>Seção</th><th>Descrição</th></tr></thead>
  <tbody>
    <tr><td>Pesquisas</td><td>Lista e gerencia todas as pesquisas</td></tr>
    <tr><td>Comunidades</td><td>Configura identidade visual global das escolas</td></tr>
    <tr><td>Disparos</td><td>Cria e agenda notificações push/e-mail para respondentes</td></tr>
    <tr><td>Exportar</td><td>Faz download das respostas em XLSX</td></tr>
  </tbody>
</table>

{shot_tag("02-painel-visao-geral", "Painel principal — listagem de pesquisas ativas e em rascunho")}
</section>

<!-- ═══════════════════ 3. GERENCIAMENTO ═══════════════════ -->
<section>
<h2>3. Gerenciamento de Pesquisas</h2>

<h3>Criar nova pesquisa</h3>
<ol>
  <li>Acesse <strong>Pesquisas</strong> no menu</li>
  <li>Clique em <strong>+ Nova pesquisa</strong></li>
  <li>Preencha: Título, Slug (gerado automaticamente), Tipo, Datas de abertura/encerramento, Controle de acesso</li>
  <li>Clique em <strong>Criar pesquisa</strong></li>
</ol>

{shot_tag("03-criar-pesquisa-botao", "Botão '+ Nova pesquisa' em destaque no canto superior direito do painel")}
{shot_tag("04-criar-pesquisa-form", "Formulário de criação de nova pesquisa")}

<h3>Painel da pesquisa</h3>
<p>Após criar, você acessa o painel individual da pesquisa, que centraliza todas as configurações: comunidades instaladas, amostra segmentada, disparos e respostas.</p>

{shot_tag("05-painel-pesquisa", "Painel da pesquisa — estatísticas, comunidades instaladas e ações rápidas")}

<h3>Status da pesquisa</h3>
<table>
  <thead><tr><th>Status</th><th>Significado</th></tr></thead>
  <tbody>
    <tr><td>Rascunho</td><td>Em construção, não visível para respondentes</td></tr>
    <tr><td>Ativa</td><td>Aberta para respostas</td></tr>
    <tr><td>Pausada</td><td>Temporariamente suspensa</td></tr>
    <tr><td>Encerrada</td><td>Fechada, não aceita mais respostas</td></tr>
  </tbody>
</table>
<div class="note"><strong>Importante:</strong> a pesquisa só fica acessível ao respondente quando o status é <strong>Ativa</strong> e a data de abertura já passou.</div>

{shot_tag("07-editar-pesquisa-status-datas", "Formulário de edição — status, datas de abertura e encerramento")}

<h3>Adicionar perguntas</h3>
<p>No painel da pesquisa, clique em <strong>Nova pergunta</strong> e escolha o tipo:</p>
<table>
  <thead><tr><th>Tipo</th><th>Uso</th></tr></thead>
  <tbody>
    <tr><td>NPS</td><td>Nota de 0 a 10 com pergunta de recomendação</td></tr>
    <tr><td>Escala</td><td>Avaliação de 1 a 5 para múltiplos aspectos</td></tr>
    <tr><td>Múltipla escolha (Radio)</td><td>Seleção de uma opção entre várias</td></tr>
    <tr><td>Caixa de seleção (Checkbox)</td><td>Seleção de múltiplas opções</td></tr>
    <tr><td>Texto aberto</td><td>Campo livre para comentários</td></tr>
    <tr><td>Upload de arquivo</td><td>Envio de documento, imagem, etc.</td></tr>
  </tbody>
</table>

{shot_tag("06-nova-pergunta-form", "Modal de nova pergunta — seleção de tipo e configuração dos campos")}
</section>

<!-- ═══════════════════ 4. COMUNIDADES ═════════════════════ -->
<section>
<h2>4. Comunidades e Identidade Visual</h2>

<h3>O que é uma comunidade</h3>
<p>Uma comunidade representa uma escola parceira integrada à Layers Education. Cada escola tem um identificador único (<code>community_id</code>) que o Layers usa para identificar o contexto do usuário.</p>

<h3>Instalar pesquisa em uma comunidade</h3>
<p>No painel da pesquisa, na seção <strong>Comunidades</strong>, insira o ID da escola no campo e clique em <strong>Instalar</strong>. Uma pesquisa só aparece para os respondentes das comunidades em que está instalada.</p>

{shot_tag("08-instalar-comunidade", "Seção Comunidades — campo de ID e botão Instalar para vincular escolas à pesquisa")}

<h3>Identidade visual</h3>
<p>A identidade visual (logo, cor primária, cor secundária) é configurada em dois níveis:</p>
<ul>
  <li><strong>Nível global</strong> — em <em>Identidade Visual</em> no menu principal: vale para todas as pesquisas da escola (fallback)</li>
  <li><strong>Nível por pesquisa</strong> — na aba <em>Identidade Visual</em> dentro de cada pesquisa: sobrescreve o tema global para aquela pesquisa</li>
</ul>

{shot_tag("09-identidade-visual", "Identidade Visual por pesquisa — lista de comunidades com configuração de tema individual")}
{shot_tag("16-comunidades-global", "Identidade Visual global — gerenciamento de temas de todas as escolas")}
{shot_tag("17-editor-tema-global", "Editor de tema — cor primária, cor secundária, logo e preview em tempo real")}

<h3>Como configurar</h3>
<ol>
  <li>Acesse a comunidade desejada e clique em <strong>Editar</strong></li>
  <li>Faça upload do logo (PNG ou SVG recomendado)</li>
  <li>Defina as cores primária e secundária em hexadecimal (ex: #C8102E)</li>
  <li>Salve — o tema é aplicado imediatamente para os respondentes dessa escola</li>
</ol>
</section>

<!-- ═══════════════════ 5. DISPAROS ════════════════════════ -->
<section>
<h2>5. Disparos de Notificação</h2>

<h3>Como funcionam</h3>
<p>O sistema envia notificações (push e/ou e-mail) para os usuários da escola no Layers. Os disparos são criados no painel e executados automaticamente pelo cron a cada 5 minutos.</p>

{shot_tag("10-disparos-visao-geral", "Painel de Disparos — formulário de novo disparo com destinatários, canais e mensagem")}

<h3>Régua de disparos (sequência automática)</h3>
<p>A régua é uma sequência de notificações programadas automaticamente a partir da data de abertura da pesquisa.</p>
<ol>
  <li>Acesse a pesquisa → aba <strong>Disparos</strong></li>
  <li>Configure o conteúdo padrão (título e corpo da mensagem)</li>
  <li>Ative a <strong>Régua de disparos</strong> e adicione passos com offset em dias (ex: Passo 0 = dia da abertura, Passo 7 = 7 dias após)</li>
  <li>Escolha os canais: Push, E-mail ou ambos</li>
  <li>Clique em <strong>Criar régua</strong></li>
</ol>

{shot_tag("11-disparos-regua-form", "Formulário de disparo — seções de destinatários, canais e mensagem padrão")}
{shot_tag("12-disparos-regua-passos", "Régua ativada — passos configurados: Convite inicial (Dia 0) e Lembrete (Dia 7)")}

<div class="note"><strong>Dica:</strong> o horário dos disparos segue a hora de abertura da pesquisa. Configure 09:00 ou 17:00 para atingir o usuário no momento certo.</div>

<h3>Disparo Rápido</h3>
<p>Para envios imediatos (testes ou comunicados urgentes), use o <strong>Disparo rápido</strong> no final da página de Disparos. Escolha a comunidade, informe os e-mails e clique em <strong>Enviar agora</strong>.</p>

{shot_tag("13-disparo-rapido", "Disparo Rápido expandido — comunidade, lista de e-mails e campos de mensagem")}

<h3>Amostra Segmentada</h3>
<p>Permite restringir o disparo a uma lista específica de usuários (ex: apenas responsáveis de uma turma).</p>
<ol>
  <li>Prepare uma planilha Excel com coluna <code>email</code> (e opcionalmente <code>nome</code>)</li>
  <li>Na aba <strong>Amostra</strong> da pesquisa, faça o upload</li>
  <li>O sistema resolve automaticamente os IDs Layers de cada e-mail</li>
  <li>Na aba <strong>Disparos</strong>, selecione <em>Escopo: Amostra</em> ao criar o disparo</li>
</ol>

{shot_tag("14-amostra-segmentada", "Amostra Segmentada — upload de lista de e-mails e status de resolução dos IDs Layers")}

<h3>Placeholders disponíveis</h3>
<p>Use nos títulos e corpos das notificações e nas mensagens de boas-vindas/agradecimento:</p>
<table>
  <thead><tr><th>Placeholder</th><th>O que exibe</th><th>Fallback</th></tr></thead>
  <tbody>
    <tr><td><code>{{{{nome}}}}</code></td><td>Primeiro nome do responsável</td><td>"você"</td></tr>
    <tr><td><code>{{{{nomeAluno}}}}</code></td><td>Nome completo do aluno</td><td>"seu filho(a)"</td></tr>
    <tr><td><code>{{{{nomeEscola}}}}</code></td><td>Nome da escola</td><td>"a escola"</td></tr>
    <tr><td><code>{{{{serie}}}}</code></td><td>Série/turma do aluno</td><td>"a turma"</td></tr>
  </tbody>
</table>
</section>

<!-- ═══════════════════ 6. RESPOSTAS ═══════════════════════ -->
<section>
<h2>6. Acompanhar Respostas</h2>

<h3>Tabela de respostas</h3>
<p>Na aba <strong>Respostas</strong> de cada pesquisa: visualize todas as respostas em tabela paginada, filtre por nome, perfil (aluno/responsável), escola, série e onda.</p>

{shot_tag("15-respostas-tabela", "Tabela de respostas — listagem paginada com filtros por escola, perfil e onda")}

<h3>Exportar para XLSX</h3>
<ol>
  <li>Acesse <strong>Exportar</strong> no menu principal</li>
  <li>Selecione a pesquisa</li>
  <li>Clique em <strong>⬇ Baixar XLSX</strong></li>
</ol>
<p>O arquivo gerado segue o padrão Metabase: uma linha por respondente, colunas de data/perfil/escola/série/onda + uma coluna por pergunta. Pronto para análise em BI.</p>

{shot_tag("18-exportar", "Tela Exportar — seleção de pesquisa e download do XLSX estruturado")}
</section>

<!-- ═══════════════════ 7. RESPONDENTE ═════════════════════ -->
<section>
<h2>7. Fluxo do Respondente</h2>

<h3>Como o respondente acessa</h3>
<p><strong>Via Layers (padrão):</strong> o app da escola exibe a pesquisa como iframe. O Layers passa automaticamente os dados do usuário (<code>userId</code>, <code>communityId</code>) para o sistema.</p>
<p><strong>Via link direto:</strong> o gestor pode compartilhar um link com parâmetros de comunidade para testes ou acesso alternativo.</p>

{shot_tag("19-respondente-portal", "Portal do respondente — tela de boas-vindas com personalização por nome e escola")}

<h3>Personalização automática</h3>
<p>Ao entrar, o sistema busca em tempo real: nome do responsável ou aluno, nome do filho (para responsáveis com vínculo ativo) e série/turma (via matrícula ativa).</p>

<div class="note"><strong>Importante:</strong> para <code>{{{{serie}}}}</code> aparecer, o aluno precisa ter uma matrícula ativa em uma turma na plataforma Layers — não basta estar em um grupo.</div>

<h3>Percurso do respondente</h3>
<ol>
  <li><strong>Boas-vindas</strong> — mensagem de apresentação com nome personalizado</li>
  <li><strong>Perguntas</strong> — percorre cada pergunta com barra de progresso</li>
  <li><strong>Obrigatórias</strong> — não é possível avançar sem responder os campos obrigatórios</li>
  <li><strong>Agradecimento</strong> — confirmação de envio com mensagem personalizada</li>
</ol>

<h3>Estados da pesquisa para o respondente</h3>
<table>
  <thead><tr><th>Estado</th><th>O que vê</th></tr></thead>
  <tbody>
    <tr><td>Pesquisa não encontrada</td><td>Tela de erro</td></tr>
    <tr><td>Ainda não aberta</td><td>"Esta pesquisa ainda não está disponível"</td></tr>
    <tr><td>Encerrada</td><td>"Esta pesquisa foi encerrada"</td></tr>
    <tr><td>Acesso negado</td><td>"Você não tem acesso a esta pesquisa" (role incorreto)</td></tr>
    <tr><td>Aberta</td><td>Fluxo normal de resposta</td></tr>
  </tbody>
</table>
</section>

<!-- ═══════════════════ 8. GLOSSÁRIO ═══════════════════════ -->
<section>
<h2>8. Glossário</h2>

<table>
  <thead><tr><th>Termo</th><th>Definição</th></tr></thead>
  <tbody>
    <tr><td>Comunidade</td><td>Escola parceira integrada à Layers Education, identificada por um <code>community_id</code> único</td></tr>
    <tr><td>Onda</td><td>Ciclo de uma pesquisa (ex: "1º semestre 2026") — campo informativo nas respostas</td></tr>
    <tr><td>Amostra</td><td>Lista segmentada de usuários que podem responder uma pesquisa restrita</td></tr>
    <tr><td>Régua</td><td>Sequência automática de notificações distribuídas ao longo do tempo</td></tr>
    <tr><td>Slug</td><td>Identificador único da pesquisa na URL (ex: amostral-1-2026)</td></tr>
    <tr><td>Placeholder</td><td>Variável no texto substituída por dado real do usuário (ex: <code>{{{{nomeAluno}}}}</code>)</td></tr>
    <tr><td>Role</td><td>Papel do usuário na plataforma Layers: <code>guardian</code> (responsável), <code>student</code> (aluno)</td></tr>
    <tr><td>CSAT</td><td>Customer Satisfaction Score — tipo de pesquisa de satisfação</td></tr>
    <tr><td>NPS</td><td>Net Promoter Score — pergunta de recomendação com nota de 0 a 10</td></tr>
    <tr><td>Offset</td><td>Número de dias a partir da abertura para disparar uma notificação da régua</td></tr>
  </tbody>
</table>

<footer>Documento gerado automaticamente a partir do código-fonte da plataforma — Raiz Educação, 2026.</footer>
</section>

</body>
</html>
"""

OUT.write_text(HTML, encoding="utf-8")
size_kb = OUT.stat().st_size / 1024
print(f"OK: {OUT}")
print(f"   Tamanho: {size_kb:.0f} KB")
print("   Para PDF: abrir no Chrome -> Ctrl+P -> Salvar como PDF (A4, sem margens extras)")
