# Inbox -- lucas

<!-- Mensagens abaixo desta linha -->

---
De: Diretor
Para: Lucas
Data: 30/04/2026
STATUS: NOVO
Assunto: Sprint 1 — estado real + 2 decisoes necessarias

O Sprint 1 esta em andamento. O trabalho critico foi entregue — gate de amostra
funcionando, tema corrigido, tela de boas-vindas configuravel. A Amostral 1 foi
ao ar.

Ainda pendente para FECHAR o sprint:

1. PRs abertos — preciso da sua decisao:
   - PR #14 (feat/allow-all-roles): mergear, fechar ou Sprint 2?
   - PR #19 (fix/disparo-rapido-placeholders): mergear, fechar ou Sprint 2?
   - PR #20 (feat/sample-community-filter): mergear, fechar ou Sprint 2?

2. T2-2 (modal de confirmacao antes de disparar): era P0 no plano original.
   Ainda nao implementado. Isso e obrigatorio para segunda ou pode ficar para depois?

3. Suite de testes (Vitest + Playwright): os 5 Vitest estao falhando desde o inicio.
   Preciso que AGENTE-3 rode e cole o output antes de fechar o sprint.
   Mas dada a urgencia de segunda, posso aceitar fechar o sprint sem isso
   se voce autorizar explicitamente.

Responda aqui ou me fala diretamente.
---

---
De: Diretor
Para: Lucas
STATUS: RESPONDIDO
Assunto: Proposta de escopos dos agentes — aguardo aprovação

Explorei o repositório completo (`survey-platform/`, PROGRESSO.md, package.json,
estrutura de pastas). O projeto está na Fase 8, com PR #8 aberto e bloqueador
de migration pendente.

**Stack confirmado:**
Next.js 16 + React 19 + TypeScript + Supabase + Tailwind 4 + Vitest + Playwright + Vercel

Com base na estrutura real do código, proponho três escopos independentes:

---

**AGENTE-1 — Frontend Respondente**
Dono de tudo que o usuário final vê e interage:
- `components/survey-engine/` — steps, SurveyRunner, lógica condicional
- `components/ui/` — OptionBtn, ProgressBar, ScaleRow
- `app/(respondente)/` — portal, layout, CSS
- Telas de estado (AcessoNegado, AindaNaoAberta, Encerrada, Erro)
- Integração LayersPortal.js (contexto de usuário via URL params)

---

**AGENTE-2 — Painel Admin & Dispatch**
Dono da interface administrativa e do sistema de disparo:
- `app/admin/` — todas as páginas e layouts admin
- `app/admin/surveys/` — CRUD de pesquisas, editor de perguntas
- Sistema de dispatch (DispatchForm, ManualDispatch)
- Tabela de respostas, filtros, paginação
- Export Excel/XLSX (ExcelJS)

---

**AGENTE-3 — Backend, Infra & Dados**
Dono das APIs, banco de dados e infraestrutura:
- `app/api/` — todas as rotas API (surveys, submit, dispatch, audit)
- `lib/supabase-*.ts`, `lib/survey-config.ts`
- Migrations Supabase (`supabase/migrations/`)
- Cron jobs (pg_cron via Supabase), `notification_audit_logs`
- Sync Google Sheets (`lib/sheets.ts`, cron route)
- RLS, índices, constraints

---

**Comandos de build e teste (para o PROTOCOLO-SPRINT):**
```bash
cd survey-platform
npm run build        # build de produção
npm run typecheck    # zero erros TypeScript
npm run lint         # ESLint
npm run test         # Vitest (unitários)
npm run test:e2e     # Playwright (E2E)
```

---

**Estado atual do repositório:**
- Branch ativa: `fix/format-first-name`
- PR #8 aberto com bloqueador: migration `011_phase8_dispatch_audit.sql` precisa
  rodar no Supabase (incluindo `ALTER DATABASE postgres SET "app.cron_secret"`)
  ANTES do merge.

Aguardo sua aprovação para editar as personas e abrir o Sprint 1.

---

---
De: Diretor
Para: Lucas
STATUS: NOVO
Assunto: Decisão necessária — PRs #14, #19, #20, #21 bloqueiam fechamento do Sprint 1

Sprint 1 foi aberto. Agentes já estão trabalhando nas pré-condições e no frontend.

Preciso da sua decisão sobre 4 PRs abertos antes que o sprint possa fechar:

- **PR #14** — o que este PR faz? Mergear, fechar ou deixar para Sprint 2?
- **PR #19** — o que este PR faz? Mergear, fechar ou deixar para Sprint 2?
- **PR #20** — o que este PR faz? Mergear, fechar ou deixar para Sprint 2?
- **PR #21** (grupos de segmentação) — precisa ser mergeado antes de segunda?
  A migration 012 está sendo aplicada agora pelo AGENTE-3.

Além disso: para T3-6 (seed da nova pesquisa), preciso que você defina:
- Slug (ex: csat-2026-s1)
- Título da pesquisa
- Tipo (csat / nps / custom)
- Roles alvo (guardian / student / teacher)
- Comunidade(s) onde vai rodar

Sem essas informações, AGENTE-2 não consegue ativar a pesquisa.

---
