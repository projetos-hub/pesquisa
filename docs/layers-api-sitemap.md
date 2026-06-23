# Layers Education API — Mapa de URLs

> Gerado em: 2026-06-02  
> Fonte: https://developers.layers.education/  
> Profundidade de crawl: completa (todas as páginas encontradas na navegação sidebar)

---

## Estrutura do site

```
developers.layers.education/
├── content/
│   ├── quickstart/
│   │   ├── layers.html                          — O que é a Layers?
│   │   ├── developer-center.html                — Introdução Developer Center
│   │   ├── principais-casos.html                — Principais Casos de Uso
│   │   └── conceitos/
│   │       ├── ecossistema-layers.html          — Ecossistema Layers
│   │       └── permissionamento-na-layers.html  — Permissionamento na Layers
│   │
│   ├── notification/
│   │   ├── [index]                              — Introdução Notificações
│   │   ├── guias/
│   │   │   ├── index.html                       — Guias de Notificações
│   │   │   ├── segmentar-publico-alvo.html      — Segmentar Público-alvo
│   │   │   ├── escolher-canal-notificacao.html  — Escolher Canal de Notificação
│   │   │   ├── configurar-acao-ao-clicar.html   — Configurar Ação ao Clicar
│   │   │   └── agendar-notificacao.html         — Agendar Notificação
│   │   └── referencia/
│   │       ├── index.html                       — Referência de Notificações
│   │       └── enviar-notificacao-por-publico-alvo.html — Enviar notificação
│   │
│   ├── single-sign-on/
│   │   ├── [index]                              — Introdução SSO
│   │   ├── sessoes/
│   │   │   ├── index.html                       — Sessões (Portais)
│   │   │   ├── guias/
│   │   │   │   ├── index.html                   — Guias de Sessões
│   │   │   │   ├── autenticacao-via-url.html    — Autenticação via URL
│   │   │   │   └── autenticacao-via-sdk-javascript.html — Autenticação via SDK JS
│   │   │   └── referencia/
│   │   │       ├── index.html                   — Referência de Sessões
│   │   │       ├── parametros.html              — Parâmetros
│   │   │       └── validate.html                — Validar sessão
│   │   └── oauth2/
│   │       ├── index.html                       — OAuth2
│   │       ├── guias/
│   │       │   ├── index.html                   — Guias OAuth2
│   │       │   ├── faca-o-login-com-a-layers.html — Formas de fazer login
│   │       │   ├── botao-logar-com-layers.html  — Botão "Logar com a Layers"
│   │       │   ├── implementando-um-fluxo-proprio-oauth2.html — Fluxo próprio
│   │       │   ├── requisitando-informacoes-usuario.html — Req. informações do usuário
│   │       │   └── validando-tokens.html        — Validando o Access Token
│   │       └── referencia/
│   │           ├── index.html                   — Referência OAuth2
│   │           ├── obter-access-token.html      — Obter Access Token
│   │           ├── informacoes-conta.html       — Informações de Conta
│   │           ├── informacoes-usuario.html     — Informações de Usuário
│   │           └── escopos-oauth2.html          — Escopos OAuth2
│   │
│   ├── layers-portal/
│   │   ├── [index]                              — Introdução Portais
│   │   ├── guias/
│   │   │   ├── index.html                       — Guias de Portais
│   │   │   ├── configurando-a-lib.html          — Configurando a lib
│   │   │   └── embarcar-aplicacao-dentro-layers.html — Embarcar aplicação (em construção)
│   │   └── referencia/
│   │       ├── index.html                       — Referência Portais
│   │       └── layers-portal-js.html            — LayersPortal.js
│   │
│   ├── data-sync/
│   │   ├── [index]                              — Introdução Sincronização de Dados
│   │   ├── guias/
│   │   │   ├── index.html                       — Guias Data Sync
│   │   │   ├── fluxo-de-importacao.html         — Fluxo de importação
│   │   │   └── tratamento-de-erros.html         — Tratamento de erros
│   │   └── referencia/
│   │       ├── index.html                       — Referência Data Sync
│   │       ├── check.html                       — Verificar status da integração
│   │       ├── incremental/
│   │       │   ├── index.html                   — Sincronização Incremental
│   │       │   ├── users-get-updated-after.html — Usuários atualizados
│   │       │   ├── members-get-updated-after.html — Membros atualizados
│   │       │   ├── groups-get-updated-after.html — Grupos atualizados
│   │       │   └── components-get-updated-after.html — Componentes atualizados
│   │       └── total/
│   │           ├── index.html                   — Sincronização Total
│   │           └── prepare.html                 — Preparar para sincronização
│   │
│   ├── api-hub/
│   │   ├── [index]                              — Introdução API Hub
│   │   └── guias/
│   │       ├── index.html                       — Guias do API Hub
│   │       ├── consumindo-actions.html          — Consumindo uma Action
│   │       └── provendo-dados-action.html       — Provendo dados para uma Action
│   │
│   ├── communication/
│   │   ├── [index]                              — Introdução Suíte de Comunicação
│   │   ├── agenda/
│   │   │   ├── index.html                       — Agenda
│   │   │   └── referencia/
│   │   │       ├── index.html                   — Referência Agenda
│   │   │       └── prover-eventos.html          — Prover eventos
│   │   └── comunicados/
│   │       ├── index.html                       — Comunicados
│   │       └── referencia/
│   │           ├── index.html                   — Referência Comunicados
│   │           └── prover-publicacoes.html      — Prover publicações
│   │
│   ├── pagamentos/
│   │   ├── [index]                              — Introdução Pagamentos
│   │   ├── guia/
│   │   │   ├── index.html                       — Guias de Pagamentos
│   │   │   ├── como-funciona-search.html        — Como funciona o endpoint de search
│   │   │   ├── sale-vs-salegroup.html           — Sale vs SaleGroup
│   │   │   └── como-integrar-venda.html         — Como integrar uma venda
│   │   ├── marketplace-integrado/
│   │   │   ├── index.html                       — Marketplace Integrado
│   │   │   └── referencia/
│   │   │       ├── prover-cotacao-de-frete.html — Prover cotação de frete
│   │   │       ├── prover-itens-da-tab-de-uma-loja.html — Prover Itens da tab de loja
│   │   │       └── prover-tabs-de-uma-loja.html — Prover Tabs de uma loja
│   │   ├── referencia/
│   │   │   ├── index.html                       — Referências de Pagamentos
│   │   │   ├── cobrancas/
│   │   │   │   ├── index.html
│   │   │   │   ├── estrutura-cobranca.html      — Estrutura da cobrança
│   │   │   │   ├── obter-cobranca-especifica.html — Obter uma cobrança específica
│   │   │   │   ├── procurar-cobranca.html       — Procurar uma cobrança
│   │   │   │   └── realizar-integracao-cobranca.html — Realizar integração de cobrança
│   │   │   ├── entregas/
│   │   │   │   ├── index.html
│   │   │   │   ├── criar-entrega.html           — Criar uma entrega
│   │   │   │   ├── estrutura-pacote.html        — Estrutura do pacote
│   │   │   │   ├── obter-entrega-especifico.html — Obter uma entrega
│   │   │   │   └── procurar-entrega.html        — Procurar uma entrega
│   │   │   ├── formularios/
│   │   │   │   ├── index.html
│   │   │   │   ├── atualizar-formulario.html    — Atualizar um formulário
│   │   │   │   ├── criar-formulario.html        — Criar um formulário
│   │   │   │   ├── estrutura-formulario.html    — Estrutura do formulário
│   │   │   │   ├── excluir-formulario.html      — Excluir um formulário
│   │   │   │   ├── listar-formulario.html       — Listar formulários
│   │   │   │   └── obter-formulario-especifico.html — Obter um formulário
│   │   │   ├── inventario/
│   │   │   │   ├── index.html
│   │   │   │   ├── ajustar-inventario.html      — Ajustar inventário
│   │   │   │   ├── estrutura-inventario.html    — Estrutura do inventário
│   │   │   │   ├── criar-inventario-virtual.html — Criar inventário virtual
│   │   │   │   └── procurar-inventario.html     — Procurar inventário
│   │   │   ├── item/
│   │   │   │   ├── index.html
│   │   │   │   ├── criar-item.html              — Criar um item
│   │   │   │   ├── criar-link-item.html         — Criar um link para o item
│   │   │   │   ├── obter-item-especifico.html   — Obter item específico
│   │   │   │   ├── estrutura-item.html          — Estrutura do item
│   │   │   │   ├── obter-link-item.html         — Obter um link para o item
│   │   │   │   └── procurar-item.html           — Procurar item
│   │   │   ├── kits/
│   │   │   │   ├── index.html
│   │   │   │   ├── criar-kit.html               — Criar um kit
│   │   │   │   ├── criar-link-kit.html          — Criar um link para o kit
│   │   │   │   ├── obter-kit-especifico.html    — Obter um kit
│   │   │   │   ├── obter-link-kit.html          — Obter um link para o kit
│   │   │   │   ├── estrutura-kit.html           — Estrutura do kit
│   │   │   │   └── procurar-kit.html            — Procurar kit
│   │   │   └── vendas/
│   │   │       ├── index.html
│   │   │       ├── estrutura-venda.html         — Estrutura da venda
│   │   │       ├── obter-cobrancas-de-uma-venda.html — Obter cobranças de uma venda
│   │   │       ├── obter-venda-especifica.html  — Obter venda específica
│   │   │       ├── procurar-venda.html          — Procurar venda
│   │   │       └── realizar-integracao-venda.html — Realizar integração de venda
│   │   └── webhook/
│   │       ├── index.html                       — Webhooks
│   │       ├── guia/
│   │       │   ├── index.html
│   │       │   ├── como-criar-webhook.html      — Como criar um webhook
│   │       │   ├── como-reenviar-webhook.html   — Como reenviar webhooks
│   │       │   └── como-encontrar-webhook-de-uma-venda.html — Encontrar webhook de venda
│   │       └── referencia/
│   │           ├── index.html
│   │           ├── corpos-de-resposta-de-um-webhook.html — Corpo de resposta
│   │           ├── entity-id.html               — Entity ID
│   │           ├── eventos-webhook.html         — Eventos possíveis
│   │           ├── permissoes.html              — Permissões de webhooks
│   │           └── politica-de-retentativas.html — Política de retentativas
│   │
│   └── apps-visualizadores/
│       ├── [index]                              — Introdução Apps Visualizadores
│       ├── notas-academicas/
│       │   ├── [index]                          — Notas Acadêmicas
│       │   ├── referencia/
│       │   │   ├── index.html
│       │   │   └── prover-notas-academicas.html — Prover notas acadêmicas
│       │   └── exemplos-interativos/
│       │       ├── index.html
│       │       ├── exemplo-1.html               — Um bimestre com duas disciplinas
│       │       ├── exemplo-2.html               — Múltiplos bimestres e categorias
│       │       └── exemplo-3.html               — Período encerrado com anexo
│       ├── visao-financeira/
│       │   ├── [index]                          — Visão Financeira
│       │   ├── referencia/
│       │   │   ├── index.html
│       │   │   └── prover-cobrancas.html        — Prover cobranças
│       │   └── exemplos-interativos/
│       │       ├── index.html
│       │       ├── exemplo-1.html               — Uma cobrança pendente
│       │       ├── exemplo-2.html               — Múltiplas parcelas
│       │       └── exemplo-3.html               — Cobrança com anexos
│       ├── frequencia/
│       │   ├── [index]                          — Frequência
│       │   ├── referencia/
│       │   │   ├── index.html
│       │   │   └── prover-frequencia.html       — Prover frequência
│       │   └── exemplos-interativos/
│       │       ├── index.html
│       │       ├── exemplo-1.html               — Resumo geral do aluno
│       │       ├── exemplo-2.html               — Frequência por disciplina e categorias
│       │       └── exemplo-3.html               — Registros detalhados
│       ├── registros-academicos/
│       │   ├── [index]                          — Registros Acadêmicos
│       │   ├── referencia/
│       │   │   ├── index.html
│       │   │   ├── prover-registros-academicos.html — Prover registros acadêmicos
│       │   │   └── marcar-registros-como-vistos.html — Marcar registros como vistos
│       │   └── exemplos-interativos/
│       │       ├── index.html
│       │       ├── exemplo-1.html               — Um registro não visualizado
│       │       ├── exemplo-2.html               — Vários registros (visto e não visto)
│       │       └── exemplo-3.html               — Registros por período e curso
│       ├── visao-de-horarios/
│       │   ├── [index]                          — Visão de Horários
│       │   ├── referencia/
│       │   │   ├── index.html
│       │   │   └── prover-grades-horarias.html  — Prover grades horárias
│       │   └── exemplos-interativos/
│       │       ├── index.html
│       │       ├── exemplo-1.html               — Grade simples de um dia
│       │       ├── exemplo-2.html               — Semana completa com várias disciplinas
│       │       └── exemplo-3.html               — Período com anexo de PDF
│       ├── ficha-medica/
│       │   ├── [index]                          — Ficha Médica
│       │   ├── referencia/
│       │   │   ├── index.html
│       │   │   └── prover-ficha-medica.html     — Prover ficha médica
│       │   └── exemplos-interativos/
│       │       ├── index.html
│       │       ├── exemplo-1.html               — Prontuário com contato e peso
│       │       ├── exemplo-2.html               — Múltiplas seções e anexo
│       │       └── exemplo-3.html               — Prontuário completo com mood
│       ├── calendario/
│       │   ├── [index]                          — Calendário
│       │   ├── referencia/
│       │   │   ├── index.html
│       │   │   └── prover-calendario.html       — Prover calendário
│       │   └── exemplos-interativos/
│       │       ├── index.html
│       │       ├── exemplo-1.html               — Um evento em um dia
│       │       ├── exemplo-2.html               — Múltiplos eventos e categorias
│       │       └── exemplo-3.html               — Calendário semanal com eventos recorrentes
│       ├── relatorios/
│       │   ├── [index]                          — Relatórios
│       │   ├── referencia/
│       │   │   ├── index.html
│       │   │   ├── prover-documentos.html       — Prover documentos
│       │   │   ├── build-form.html              — Construir formulário
│       │   │   └── generate-report.html         — Gerar relatório
│       │   └── exemplos-interativos/
│       │       ├── index.html
│       │       ├── exemplo-1.html               — Um grupo com relatório em PDF
│       │       ├── exemplo-2.html               — Múltiplos anexos
│       │       └── exemplo-3.html               — Vários grupos
│       └── entrada-e-saida/
│           ├── [index]                          — Entrada e Saída
│           ├── guias/
│           │   ├── index.html
│           │   ├── guia-visualizacao.html       — Visualização na Layers
│           │   └── guia-notificacoes.html       — Notificações
│           └── referencia/
│               ├── index.html
│               ├── prover-entradas-e-saida-por-usuario.html — Prover por usuário
│               ├── prover-entradas-e-saidas-por-data-de-atualizacao.html — Prover por data
│               └── publicar-nova-entrada-ou-saida.html — Publicar nova entrada/saída
│
└── open-api/
    ├── appmaker.html                            — API de Portais (AppMaker) — índice
    ├── auth.html                                — API de Autenticação — índice
    ├── appmaker/
    │   └── operations/
    │       ├── approve.html                     — POST Aprovar instalação de app
    │       ├── getInstallation.html             — GET Ver Instalação
    │       ├── updateInstallation.html          — PUT Atualizar Instalação
    │       └── listInstallations.html           — GET Ver Instalações
    └── auth/
        └── operations/
            ├── authenticateUser.html            — POST Autenticação usuário
            ├── getAccountInfo.html              — GET Informações de conta
            ├── getUserInfo.html                 — GET Informações de usuário
            └── validate.html                    — GET Validar sessão
```

---

## URLs detalhadas

### 1. Início Rápido (Quickstart)

| URL | Título | Resumo |
|-----|--------|--------|
| `/content/quickstart/layers.html` | O que é a Layers? | Plataforma digital educacional unificada com integrações para 600+ instituições |
| `/content/quickstart/developer-center.html` | Introdução Developer Center | Portal para devs construírem, integrarem e publicarem apps no ecossistema Layers |
| `/content/quickstart/principais-casos.html` | Principais Casos de Uso | Exemplos de integração: OAuth2, sync de dados, embedding de portais |
| `/content/quickstart/conceitos/ecossistema-layers.html` | Ecossistema Layers | Explica Communities, Apps, Users, Members, Groups e Enrollments |
| `/content/quickstart/conceitos/permissionamento-na-layers.html` | Permissionamento na Layers | Como roles e permissões granulares funcionam por comunidade |

---

### 2. Notificações

| URL | Título | Resumo | Endpoint |
|-----|--------|--------|----------|
| `/content/notification/` | Introdução | Push notifications e e-mails para usuários Layers | — |
| `/content/notification/guias/index.html` | Guias de Notificações | Índice de guias práticos com exemplos de HTTP request | — |
| `/content/notification/guias/segmentar-publico-alvo.html` | Segmentar Público-alvo | Como estruturar `targets` com `topics` e `roles` | `POST /v2/notification/send` |
| `/content/notification/guias/escolher-canal-notificacao.html` | Escolher Canal de Notificação | Push vs e-mail, configuração de canais | — |
| `/content/notification/guias/configurar-acao-ao-clicar.html` | Configurar Ação ao Clicar | Deeplinks e ações ao clicar na notificação | — |
| `/content/notification/guias/agendar-notificacao.html` | Agendar Notificação | Envio agendado de notificações | — |
| `/content/notification/referencia/index.html` | Referência de Notificações | Índice de referências | — |
| `/content/notification/referencia/enviar-notificacao-por-publico-alvo.html` | Enviar notificação por público-alvo | Envia push/e-mail para Web, Android e iOS | `POST /v2/notification/send` |

---

### 3. Single Sign-On (SSO)

#### 3.1 Sessões (Portais)

| URL | Título | Resumo | Endpoint |
|-----|--------|--------|----------|
| `/content/single-sign-on/` | Introdução SSO | OAuth2 para acesso via token e Session-based SSO para portais | — |
| `/content/single-sign-on/sessoes/index.html` | Sessões (Portais) | Autenticação sem fluxo OAuth2 de consentimento para portais embarcados/externos | — |
| `/content/single-sign-on/sessoes/guias/index.html` | Guias de Sessões | Índice de guias de sessões | — |
| `/content/single-sign-on/sessoes/guias/autenticacao-via-url.html` | Autenticação via URL | SSR: extrair `layers_session`, `layers_community_id`, `layers_user_id` da URL | — |
| `/content/single-sign-on/sessoes/guias/autenticacao-via-sdk-javascript.html` | Autenticação via SDK JavaScript | Usar LayersPortal.js para apps embarcados | — |
| `/content/single-sign-on/sessoes/referencia/index.html` | Referência de Sessões | Índice de referências de sessões | — |
| `/content/single-sign-on/sessoes/referencia/parametros.html` | Parâmetros | Parâmetros da sessão SSO | — |
| `/content/single-sign-on/sessoes/referencia/validate.html` | Validar sessão | Valida credenciais da sessão de portal | `GET /v1/sso/session/validate` |

#### 3.2 OAuth2

| URL | Título | Resumo | Endpoint |
|-----|--------|--------|----------|
| `/content/single-sign-on/oauth2/index.html` | OAuth2 | Authorization Code flow para autenticação e consumo de APIs | — |
| `/content/single-sign-on/oauth2/guias/index.html` | Guias OAuth2 | Índice de guias OAuth2 | — |
| `/content/single-sign-on/oauth2/guias/faca-o-login-com-a-layers.html` | Formas de fazer o login com a Layers | Visão geral das abordagens de login | — |
| `/content/single-sign-on/oauth2/guias/botao-logar-com-layers.html` | Botão "Logar com a Layers" | Integrar botão de auth com customização de estilo | — |
| `/content/single-sign-on/oauth2/guias/implementando-um-fluxo-proprio-oauth2.html` | Implementando um fluxo próprio | Fluxo OAuth2 manual sem botão pré-fabricado | — |
| `/content/single-sign-on/oauth2/guias/requisitando-informacoes-usuario.html` | Requisitando informações do Usuário | Como solicitar dados do usuário com scopes | — |
| `/content/single-sign-on/oauth2/guias/validando-tokens.html` | Validando o Access Token | Como validar tokens de acesso OAuth2 | — |
| `/content/single-sign-on/oauth2/referencia/index.html` | Referência OAuth2 | Índice de referências OAuth2 | — |
| `/content/single-sign-on/oauth2/referencia/obter-access-token.html` | Obter Access Token | Troca authorization code por Bearer token (expira em 3600s) | `POST https://api.layers.digital/oauth/token` |
| `/content/single-sign-on/oauth2/referencia/informacoes-conta.html` | Informações de Conta | Retorna dados da conta autenticada conforme scopes | `GET /v1/oauth/account/info` |
| `/content/single-sign-on/oauth2/referencia/informacoes-usuario.html` | Informações de Usuário | Retorna dados do usuário na comunidade | — |
| `/content/single-sign-on/oauth2/referencia/escopos-oauth2.html` | Escopos OAuth2 | Lista escopos disponíveis: `openid`, `profile`, `fullname`, `email`, `related.communities`, `related.groups`, `related.members`, `related.members.groups` | — |

---

### 4. Portais (Layers Portal)

| URL | Título | Resumo | Endpoint / Método |
|-----|--------|--------|-------------------|
| `/content/layers-portal/` | Introdução Portais | Apps adicionam telas customizadas ao Layers com auth OAuth2 e push notifications | — |
| `/content/layers-portal/guias/index.html` | Guias de Portais | Índice de workflows para implementar Portais | — |
| `/content/layers-portal/guias/configurando-a-lib.html` | Configurando a lib | Como instalar e configurar LayersPortal.js | — |
| `/content/layers-portal/guias/embarcar-aplicacao-dentro-layers.html` | Embarcar aplicação | Integrar app no Portal e App (página em construção) | — |
| `/content/layers-portal/referencia/index.html` | Referência Portais | Índice de referências | — |
| `/content/layers-portal/referencia/layers-portal-js.html` | LayersPortal.js | Referência completa da lib: events (`ready`, `connected`), promises, properties, métodos (`go`, `close`, `download`, `startGeolocation`, `stopGeolocation`) | — |

---

### 5. Sincronização de Dados (Data Sync)

| URL | Título | Resumo | Endpoint / Action |
|-----|--------|--------|-------------------|
| `/content/data-sync/` | Introdução | Plataforma de sincronização para importar/exportar dados normalizados | — |
| `/content/data-sync/guias/index.html` | Guias Data Sync | Índice de guias de sync | — |
| `/content/data-sync/guias/fluxo-de-importacao.html` | Fluxo de importação | Workflow completo de integração (incremental e total) para PM, TL e Devs | — |
| `/content/data-sync/guias/tratamento-de-erros.html` | Tratamento de erros | Como lidar com erros na sincronização | — |
| `/content/data-sync/referencia/index.html` | Referência Data Sync | Índice de referências | — |
| `/content/data-sync/referencia/check.html` | Verificar status da integração | App recebe POST para verificar status de sync | `@layers:data:Check` (API Hub) |
| `/content/data-sync/referencia/incremental/index.html` | Sincronização Incremental | Endpoints que retornam entidades atualizadas após uma data | — |
| `/content/data-sync/referencia/incremental/users-get-updated-after.html` | Usuários atualizados | Retorna usuários com `updatedAt >= after` | `@layers:data:Users:getUpdatedAfter` |
| `/content/data-sync/referencia/incremental/members-get-updated-after.html` | Membros atualizados | Retorna membros atualizados | `@layers:data:Members:getUpdatedAfter` |
| `/content/data-sync/referencia/incremental/groups-get-updated-after.html` | Grupos atualizados | Retorna grupos atualizados | `@layers:data:Groups:getUpdatedAfter` |
| `/content/data-sync/referencia/incremental/components-get-updated-after.html` | Componentes atualizados | Retorna componentes atualizados | `@layers:data:Components:getUpdatedAfter` |
| `/content/data-sync/referencia/total/index.html` | Sincronização Total | Documentação de sync total (full replace) | — |
| `/content/data-sync/referencia/total/prepare.html` | Preparar para sincronização | Recebe POST com `uploadUrl`, `syncProfileId`, `syncRunId`, `season` | `@layers:data:Prepare` (API Hub) |

---

### 6. API Hub

| URL | Título | Resumo | Endpoint |
|-----|--------|--------|----------|
| `/content/api-hub/` | Introdução API Hub | Exchange de informações entre apps via Actions (request/respond ou publish/subscribe) | — |
| `/content/api-hub/guias/index.html` | Guias do API Hub | Índice de guias | — |
| `/content/api-hub/guias/consumindo-actions.html` | Consumindo uma Action | Consumer descobre providers e chama actions | `GET /v1/services/discover/{{action}}` / `POST /v1/services/call/{{action}}/{{id_app}}` |
| `/content/api-hub/guias/provendo-dados-action.html` | Provendo dados para uma Action | Provider implementa `POST /v1/layers/actions/{{action}}` no seu servidor | endpoint no servidor do provider |

---

### 7. Suíte de Comunicação

| URL | Título | Resumo | Endpoint / Action |
|-----|--------|--------|-------------------|
| `/content/communication/` | Introdução | Centraliza comunicação escola-família: agenda, tickets, comunicados | — |
| `/content/communication/agenda/index.html` | Agenda | Exibe informações de eventos vindos de sistemas integrados | — |
| `/content/communication/agenda/referencia/index.html` | Referência Agenda | Índice de referências | — |
| `/content/communication/agenda/referencia/prover-eventos.html` | Prover eventos | Retorna eventos de calendário atualizados após uma data | `@layers:Events:getUpdatedAfter` |
| `/content/communication/comunicados/index.html` | Comunicados | Exibe publicações/anúncios de sistemas integrados | — |
| `/content/communication/comunicados/referencia/index.html` | Referência Comunicados | Índice de referências | — |
| `/content/communication/comunicados/referencia/prover-publicacoes.html` | Prover publicações | Retorna publicações atualizadas após uma data | `@layers:Posts:getUpdatedAfter` |

---

### 8. Pagamentos

#### 8.1 Guias

| URL | Título | Resumo | Endpoint |
|-----|--------|--------|----------|
| `/content/pagamentos/` | Introdução | Serviço para processar transações financeiras | — |
| `/content/pagamentos/guia/index.html` | Guias de Pagamentos | Índice de guias | — |
| `/content/pagamentos/guia/como-funciona-search.html` | Como funciona o endpoint de search | Filtros, paginação e operadores de comparação na API de pagamentos | — |
| `/content/pagamentos/guia/sale-vs-salegroup.html` | Sale vs SaleGroup | Diferenças entre venda individual e grupo de vendas | — |
| `/content/pagamentos/guia/como-integrar-venda.html` | Como integrar uma venda | Webhook + `GET /v1/payments/sales/:SALEID` antes de processar | `GET /v1/payments/sales/:SALEID` |

#### 8.2 Marketplace Integrado

| URL | Título | Resumo |
|-----|--------|--------|
| `/content/pagamentos/marketplace-integrado/index.html` | Marketplace Integrado | Integração de marketplace na plataforma de pagamentos Layers |
| `/content/pagamentos/marketplace-integrado/referencia/prover-cotacao-de-frete.html` | Prover cotação de frete | Action para prover cotação de frete ao marketplace |
| `/content/pagamentos/marketplace-integrado/referencia/prover-itens-da-tab-de-uma-loja.html` | Prover Itens da tab de loja | Action para listar itens de uma tab de loja |
| `/content/pagamentos/marketplace-integrado/referencia/prover-tabs-de-uma-loja.html` | Prover Tabs de uma loja | Action para listar tabs de uma loja |

#### 8.3 Referência — Cobranças

| URL | Título | Resumo |
|-----|--------|--------|
| `/content/pagamentos/referencia/cobrancas/estrutura-cobranca.html` | Estrutura da cobrança | Schema/estrutura de objeto cobrança |
| `/content/pagamentos/referencia/cobrancas/obter-cobranca-especifica.html` | Obter uma cobrança específica | GET por ID de cobrança |
| `/content/pagamentos/referencia/cobrancas/procurar-cobranca.html` | Procurar uma cobrança | Search com filtros |
| `/content/pagamentos/referencia/cobrancas/realizar-integracao-cobranca.html` | Realizar integração de cobrança | Marcar cobrança como integrada |

#### 8.4 Referência — Entregas

| URL | Título | Resumo |
|-----|--------|--------|
| `/content/pagamentos/referencia/entregas/criar-entrega.html` | Criar uma entrega | POST para criar entrega |
| `/content/pagamentos/referencia/entregas/estrutura-pacote.html` | Estrutura do pacote | Schema do objeto pacote/entrega |
| `/content/pagamentos/referencia/entregas/obter-entrega-especifico.html` | Obter uma entrega | GET por ID de entrega |
| `/content/pagamentos/referencia/entregas/procurar-entrega.html` | Procurar uma entrega | Search com filtros |

#### 8.5 Referência — Formulários

| URL | Título | Resumo |
|-----|--------|--------|
| `/content/pagamentos/referencia/formularios/atualizar-formulario.html` | Atualizar um formulário | PUT para atualizar |
| `/content/pagamentos/referencia/formularios/criar-formulario.html` | Criar um formulário | POST para criar |
| `/content/pagamentos/referencia/formularios/estrutura-formulario.html` | Estrutura do formulário | Schema do objeto formulário |
| `/content/pagamentos/referencia/formularios/excluir-formulario.html` | Excluir um formulário | DELETE por ID |
| `/content/pagamentos/referencia/formularios/listar-formulario.html` | Listar formulários | GET lista com filtros |
| `/content/pagamentos/referencia/formularios/obter-formulario-especifico.html` | Obter um formulário | GET por ID |

#### 8.6 Referência — Inventários

| URL | Título | Resumo |
|-----|--------|--------|
| `/content/pagamentos/referencia/inventario/ajustar-inventario.html` | Ajustar inventário | Incrementar/decrementar estoque |
| `/content/pagamentos/referencia/inventario/estrutura-inventario.html` | Estrutura do inventário | Schema do objeto inventário |
| `/content/pagamentos/referencia/inventario/criar-inventario-virtual.html` | Criar inventário virtual | POST para inventário virtual (sem estoque físico) |
| `/content/pagamentos/referencia/inventario/procurar-inventario.html` | Procurar inventário | Search com filtros |

#### 8.7 Referência — Itens

| URL | Título | Resumo |
|-----|--------|--------|
| `/content/pagamentos/referencia/item/criar-item.html` | Criar um item | POST para criar item vendável |
| `/content/pagamentos/referencia/item/criar-link-item.html` | Criar um link para o item | POST para gerar link de venda do item |
| `/content/pagamentos/referencia/item/obter-item-especifico.html` | Obter item específico | GET por ID |
| `/content/pagamentos/referencia/item/estrutura-item.html` | Estrutura do item | Schema do objeto item |
| `/content/pagamentos/referencia/item/obter-link-item.html` | Obter um link para o item | GET link de venda por ID |
| `/content/pagamentos/referencia/item/procurar-item.html` | Procurar item | Search com filtros |

#### 8.8 Referência — Kits

| URL | Título | Resumo |
|-----|--------|--------|
| `/content/pagamentos/referencia/kits/criar-kit.html` | Criar um kit | POST para criar bundle de itens |
| `/content/pagamentos/referencia/kits/criar-link-kit.html` | Criar um link para o kit | POST para gerar link de venda do kit |
| `/content/pagamentos/referencia/kits/obter-kit-especifico.html` | Obter um kit | GET por ID |
| `/content/pagamentos/referencia/kits/obter-link-kit.html` | Obter um link para o kit | GET link de venda por ID |
| `/content/pagamentos/referencia/kits/estrutura-kit.html` | Estrutura do kit | Schema do objeto kit |
| `/content/pagamentos/referencia/kits/procurar-kit.html` | Procurar kit | Search com filtros |

#### 8.9 Referência — Vendas

| URL | Título | Resumo |
|-----|--------|--------|
| `/content/pagamentos/referencia/vendas/estrutura-venda.html` | Estrutura da venda | Schema do objeto venda |
| `/content/pagamentos/referencia/vendas/obter-cobrancas-de-uma-venda.html` | Obter cobranças de uma venda | GET cobranças vinculadas à venda |
| `/content/pagamentos/referencia/vendas/obter-venda-especifica.html` | Obter venda específica | GET por ID de venda |
| `/content/pagamentos/referencia/vendas/procurar-venda.html` | Procurar venda | Search com filtros |
| `/content/pagamentos/referencia/vendas/realizar-integracao-venda.html` | Realizar integração de venda | Marcar venda como integrada via webhook |

#### 8.10 Webhooks de Pagamentos

| URL | Título | Resumo |
|-----|--------|--------|
| `/content/pagamentos/webhook/index.html` | Webhooks | Hub de guias e referências de webhooks |
| `/content/pagamentos/webhook/guia/como-criar-webhook.html` | Como criar um webhook | Configurar webhook na plataforma |
| `/content/pagamentos/webhook/guia/como-reenviar-webhook.html` | Como reenviar webhooks | Reprocessar eventos com falha |
| `/content/pagamentos/webhook/guia/como-encontrar-webhook-de-uma-venda.html` | Encontrar webhook de venda | Localizar webhook associado a uma venda |
| `/content/pagamentos/webhook/referencia/corpos-de-resposta-de-um-webhook.html` | Corpo de resposta | Schema do payload de webhook |
| `/content/pagamentos/webhook/referencia/entity-id.html` | Entity ID | Como identificar entidades via Entity ID |
| `/content/pagamentos/webhook/referencia/eventos-webhook.html` | Eventos possíveis | Lista completa de eventos que disparam webhooks |
| `/content/pagamentos/webhook/referencia/permissoes.html` | Permissões de webhooks | Quais permissões são necessárias |
| `/content/pagamentos/webhook/referencia/politica-de-retentativas.html` | Política de retentativas | Como funciona o retry de webhooks com falha |

---

### 9. Apps Visualizadores

> Apps nativos da Layers que consomem dados de sistemas integrados via API Hub para exibir na plataforma.

#### 9.1 Notas Acadêmicas

| URL | Título | Resumo | Action |
|-----|--------|--------|--------|
| `/content/apps-visualizadores/notas-academicas/` | Notas Acadêmicas | Visualizador de boletins, avaliações e notas | — |
| `/content/apps-visualizadores/notas-academicas/referencia/prover-notas-academicas.html` | Prover notas acadêmicas | Implementar action de notas por período/disciplina | `@layers:education:GradeBooks:getRelated` |
| `/content/apps-visualizadores/notas-academicas/exemplos-interativos/exemplo-1.html` | Um bimestre com duas disciplinas | Exemplo interativo de payload | — |
| `/content/apps-visualizadores/notas-academicas/exemplos-interativos/exemplo-2.html` | Múltiplos bimestres e categorias | Exemplo com múltiplos bimestres | — |
| `/content/apps-visualizadores/notas-academicas/exemplos-interativos/exemplo-3.html` | Período encerrado com anexo | Exemplo com período finalizado | — |

#### 9.2 Visão Financeira

| URL | Título | Resumo | Action |
|-----|--------|--------|--------|
| `/content/apps-visualizadores/visao-financeira/` | Visão Financeira | Visualizador de cobranças, pagamentos e situação financeira | — |
| `/content/apps-visualizadores/visao-financeira/referencia/prover-cobrancas.html` | Prover cobranças | Implementar action de cobranças financeiras | — |
| `/content/apps-visualizadores/visao-financeira/exemplos-interativos/exemplo-1.html` | Uma cobrança pendente | Exemplo com cobrança única | — |
| `/content/apps-visualizadores/visao-financeira/exemplos-interativos/exemplo-2.html` | Múltiplas parcelas | Exemplo com parcelas em diferentes status | — |
| `/content/apps-visualizadores/visao-financeira/exemplos-interativos/exemplo-3.html` | Cobrança com anexos | Exemplo com arquivos anexados | — |

#### 9.3 Frequência

| URL | Título | Resumo |
|-----|--------|--------|
| `/content/apps-visualizadores/frequencia/` | Frequência | Visualizador de presença, ausências e controle |
| `/content/apps-visualizadores/frequencia/referencia/prover-frequencia.html` | Prover frequência | Implementar action de frequência |
| `/content/apps-visualizadores/frequencia/exemplos-interativos/exemplo-1.html` | Resumo geral do aluno | Exemplo com dados de frequência consolidados |
| `/content/apps-visualizadores/frequencia/exemplos-interativos/exemplo-2.html` | Frequência por disciplina | Exemplo por disciplina e categoria |
| `/content/apps-visualizadores/frequencia/exemplos-interativos/exemplo-3.html` | Registros detalhados | Exemplo com presente, falta e falta justificada |

#### 9.4 Registros Acadêmicos

| URL | Título | Resumo |
|-----|--------|--------|
| `/content/apps-visualizadores/registros-academicos/` | Registros Acadêmicos | Visualizador de ocorrências disciplinares e observações |
| `/content/apps-visualizadores/registros-academicos/referencia/prover-registros-academicos.html` | Prover registros acadêmicos | Implementar action de registros |
| `/content/apps-visualizadores/registros-academicos/referencia/marcar-registros-como-vistos.html` | Marcar registros como vistos | Action para confirmar visualização |
| `/content/apps-visualizadores/registros-academicos/exemplos-interativos/exemplo-1.html` | Um registro não visualizado | Exemplo com registro novo |
| `/content/apps-visualizadores/registros-academicos/exemplos-interativos/exemplo-2.html` | Vários registros | Exemplo com vistos e não vistos |
| `/content/apps-visualizadores/registros-academicos/exemplos-interativos/exemplo-3.html` | Registros por período e curso | Exemplo filtrado |

#### 9.5 Visão de Horários

| URL | Título | Resumo |
|-----|--------|--------|
| `/content/apps-visualizadores/visao-de-horarios/` | Visão de Horários | Visualizador de grade horária de aulas |
| `/content/apps-visualizadores/visao-de-horarios/referencia/prover-grades-horarias.html` | Prover grades horárias | Implementar action de horários |
| `/content/apps-visualizadores/visao-de-horarios/exemplos-interativos/exemplo-1.html` | Grade simples de um dia | Exemplo de um dia |
| `/content/apps-visualizadores/visao-de-horarios/exemplos-interativos/exemplo-2.html` | Semana completa | Exemplo com várias disciplinas |
| `/content/apps-visualizadores/visao-de-horarios/exemplos-interativos/exemplo-3.html` | Período com anexo de PDF | Exemplo com arquivo |

#### 9.6 Ficha Médica

| URL | Título | Resumo |
|-----|--------|--------|
| `/content/apps-visualizadores/ficha-medica/` | Ficha Médica | Visualizador de informações de saúde, alergias e condições |
| `/content/apps-visualizadores/ficha-medica/referencia/prover-ficha-medica.html` | Prover ficha médica | Implementar action de ficha médica |
| `/content/apps-visualizadores/ficha-medica/exemplos-interativos/exemplo-1.html` | Prontuário com contato e peso | Exemplo básico |
| `/content/apps-visualizadores/ficha-medica/exemplos-interativos/exemplo-2.html` | Múltiplas seções e anexo | Exemplo com seções variadas |
| `/content/apps-visualizadores/ficha-medica/exemplos-interativos/exemplo-3.html` | Prontuário completo com mood | Exemplo completo |

#### 9.7 Calendário

| URL | Título | Resumo |
|-----|--------|--------|
| `/content/apps-visualizadores/calendario/` | Calendário | Visualizador de eventos e atividades acadêmicas |
| `/content/apps-visualizadores/calendario/referencia/prover-calendario.html` | Prover calendário | Implementar action de calendário |
| `/content/apps-visualizadores/calendario/exemplos-interativos/exemplo-1.html` | Um evento em um dia | Exemplo simples |
| `/content/apps-visualizadores/calendario/exemplos-interativos/exemplo-2.html` | Múltiplos eventos e categorias | Exemplo com categorias |
| `/content/apps-visualizadores/calendario/exemplos-interativos/exemplo-3.html` | Calendário semanal recorrente | Exemplo com recorrência |

#### 9.8 Relatórios

| URL | Título | Resumo |
|-----|--------|--------|
| `/content/apps-visualizadores/relatorios/` | Relatórios | Visualizador de documentos, formulários e relatórios geráveis |
| `/content/apps-visualizadores/relatorios/referencia/prover-documentos.html` | Prover documentos | Implementar action de documentos |
| `/content/apps-visualizadores/relatorios/referencia/build-form.html` | Construir formulário | Action para construir formulário dinâmico |
| `/content/apps-visualizadores/relatorios/referencia/generate-report.html` | Gerar relatório | Action para gerar e retornar relatório |
| `/content/apps-visualizadores/relatorios/exemplos-interativos/exemplo-1.html` | Um grupo com relatório em PDF | Exemplo básico |
| `/content/apps-visualizadores/relatorios/exemplos-interativos/exemplo-2.html` | Múltiplos anexos | Exemplo com relatório e planilha |
| `/content/apps-visualizadores/relatorios/exemplos-interativos/exemplo-3.html` | Vários grupos | Exemplo por período ou tipo |

#### 9.9 Entrada e Saída

| URL | Título | Resumo | Action |
|-----|--------|--------|--------|
| `/content/apps-visualizadores/entrada-e-saida/` | Entrada e Saída | Registro em tempo real de entrada/saída com notificações às famílias | — |
| `/content/apps-visualizadores/entrada-e-saida/guias/guia-visualizacao.html` | Visualização na Layers | Como exibir registros de entrada/saída | — |
| `/content/apps-visualizadores/entrada-e-saida/guias/guia-notificacoes.html` | Notificações | Como enviar alertas de entrada/saída | — |
| `/content/apps-visualizadores/entrada-e-saida/referencia/prover-entradas-e-saida-por-usuario.html` | Prover por usuário | Retorna registros de um usuário específico | `@layers:education:Entrance:getRelated` |
| `/content/apps-visualizadores/entrada-e-saida/referencia/prover-entradas-e-saidas-por-data-de-atualizacao.html` | Prover por data de atualização | Sync incremental de registros | `@layers:education:Entrance:getUpdatedAfter` |
| `/content/apps-visualizadores/entrada-e-saida/referencia/publicar-nova-entrada-ou-saida.html` | Publicar nova entrada/saída | Notifica nova entrada ou saída | `@layers:education:Entrance:created` |

---

### 10. Open API (Swagger/Reference)

#### 10.1 AppMaker API

| URL | Título | Resumo | Endpoint |
|-----|--------|--------|----------|
| `/open-api/appmaker.html` | API de Portais (AppMaker) | Índice da API REST de gerenciamento de instalações de apps | — |
| `/open-api/appmaker/operations/approve.html` | Aprovar instalação de um app | Aprovação manual de instalação em comunidade específica | `POST /v1/appmaker/apps/{appId}/installations/{community}/approve` |
| `/open-api/appmaker/operations/getInstallation.html` | Ver Instalação | Recupera detalhes de instalação do app na comunidade | `GET /v1/appmaker/apps/{appId}/installations/{community}` |
| `/open-api/appmaker/operations/updateInstallation.html` | Atualizar Instalação | Atualiza configurações da instalação | `PUT /v1/appmaker/apps/{appId}/installations/{community}` |
| `/open-api/appmaker/operations/listInstallations.html` | Ver Instalações | Lista todas as instalações de um app | `GET /v1/appmaker/apps/{appId}/installations` |

#### 10.2 Auth API

| URL | Título | Resumo | Endpoint |
|-----|--------|--------|----------|
| `/open-api/auth.html` | API de Autenticação | Índice da API REST de autenticação | — |
| `/open-api/auth/operations/authenticateUser.html` | Autenticação usuário | Gera link de redirect autenticado via e-mail e federation token | `POST /v1/federation/auth` |
| `/open-api/auth/operations/getAccountInfo.html` | Informações de conta | Retorna dados da conta autenticada | `GET /v1/oauth/account/info` |
| `/open-api/auth/operations/getUserInfo.html` | Informações de usuário | Retorna dados do usuário na comunidade | `GET /v1/oauth/user/info` |
| `/open-api/auth/operations/validate.html` | Validar sessão | Valida credenciais de sessão SSO | `GET /v1/sso/session/validate` |

---

## Resumo por seção

| Seção | Total de páginas | Descrição |
|-------|-----------------|-----------|
| Quickstart | 5 | Introdução, conceitos, casos de uso |
| Notificações | 8 | Push/e-mail, segmentação, agendamento |
| SSO — Sessões | 8 | Auth via URL e JS SDK para portais |
| SSO — OAuth2 | 13 | Authorization Code flow completo |
| Portais | 6 | LayersPortal.js, embedding de apps |
| Data Sync | 11 | Sync incremental e total de Users/Members/Groups/Components |
| API Hub | 4 | Consumir e prover Actions |
| Suíte de Comunicação | 7 | Agenda e Comunicados |
| Pagamentos | ~55 | Cobranças, entregas, formulários, inventários, itens, kits, vendas, webhooks, marketplace |
| Apps Visualizadores | ~65 | 9 apps com referências e exemplos interativos |
| Open API AppMaker | 5 | Gerenciamento de instalações de apps |
| Open API Auth | 5 | Autenticação REST |
| **TOTAL** | **~192** | **Inventário completo** |

---

## Observações

- **Padrão de URL:** As páginas com extensão `.html` na raiz dos serviços (ex: `/content/notification.html`) retornam 404 — as URLs funcionais são as com trailing slash (ex: `/content/notification/`) ou com path completo (ex: `/content/notification/guias/index.html`).
- **API Hub:** Diferente de REST puro — usa um sistema de Actions identificadas por strings no formato `@layers:namespace:Action:method`. Apps publicam e consomem actions via `POST /v1/services/call/` e `GET /v1/services/discover/`.
- **Base URL da API:** `https://api.layers.digital`
- **Autenticação padrão:** Bearer token no header `Authorization`. Instalações via AppMaker requerem também o header `community-id`.
- **Página em construção:** `/content/layers-portal/guias/embarcar-aplicacao-dentro-layers.html`
