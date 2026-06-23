# Diagnóstico — Sistema de Disparos (survey-platform)

**Data:** 2026-06-02  
**Branch:** feat/survey-arte-total-globaltree  
**Escopo:** leitura apenas — nenhuma alteração de código

---

## 1. Mapa do sistema atual

### Fluxo completo: criação → cron → execução → audit log

```
[Admin — /admin/surveys/[id]/dispatch (módulo dispatch/)]
    │
    ├─ DispatchForm.tsx (client)
    │      │  Chama POST /api/admin/surveys/[id]/dispatch
    │      │  Suporta: scope (all / communities / group / sample),
    │      │           personalized, régua (sequence), template
    │
    └─ ManualDispatch.tsx (client — disparo rápido, sem audit por usuário)
           │  Chama o mesmo endpoint via fetch
           └─ SamplePanel.tsx (exibe stats de resolução de emails)

[API — /api/admin/surveys/[id]/dispatch/route.ts]
    │
    ├─ Valida com Zod (DispatchSchema)
    ├─ resolveTargetCommunities() → lista de community IDs
    ├─ INSERT survey_dispatches (status: 'scheduled' | 'sending')
    ├─ INSERT survey_dispatch_jobs (1 row por comunidade, status: 'pending')
    │
    ├─ Se agendado → retorna imediatamente (cron vai processar)
    └─ Se imediato → chama executeDispatch(dispatch.id) in-band

[executeDispatch() — lib/layers-notifications.ts]
    │
    ├─ Busca dispatch + jobs 'pending'
    ├─ Marca dispatch como 'sending'
    │
    ├─ Modo grupo (personalized=false):
    │      ├─ buildNotificationPayload() → topic: {kind:'group', alias:'all'|group_alias}
    │      ├─ sendToOneCommunity() → POST /v2/notification/send
    │      └─ UPDATE job: sent | failed
    │
    └─ Modo personalizado (personalized=true):
           ├─ scope='sample' → executePersonalizedJobSample()
           │      ├─ Busca entradas de survey_sample_lists (layers_user_id resolvido)
           │      ├─ Envia 30 usuários por ciclo de cron
           │      ├─ INSERT notification_audit_logs por usuário
           │      └─ UPDATE job: processed_users, failed_users, status
           │
           └─ scope!='sample' → executePersonalizedJob()
                  ├─ fetchCommunityUsers() → GET /v1/users (paginado)
                  ├─ buildPersonalizedPayload() por usuário
                  ├─ sendToOneCommunity() por usuário
                  └─ UPDATE job: processed_users, failed_users, status

[Cron — /api/cron/process-dispatches/route.ts — a cada 5 min]
    │
    ├─ Passo 1: dispatches 'scheduled' com scheduled_at <= NOW()
    │      └─ executeDispatch(d.id) para cada um
    │
    ├─ Passo 2: dispatches 'sending' + personalized=true
    │      ├─ Busca jobs em 'sending' (até 3 por dispatch, max 5 dispatches)
    │      ├─ isSampleScope → executePersonalizedJobSample()
    │      └─ !isSampleScope → executePersonalizedJob()
    │
    ├─ Passo 2b: fecha dispatches cujos todos os jobs concluíram
    │      └─ UPDATE status: sent | failed | partial_failure
    │
    └─ Passo 3: resolve layers_user_id de amostras pendentes
           └─ fetchLayersUserByEmail() — até 5000 por ciclo, concorrência 20

[Tabelas Supabase]
    survey_dispatches         — registro mestre do disparo
    survey_dispatch_jobs      — execução por comunidade
    notification_audit_logs   — log por usuário (só modo personalizado)
    survey_sample_lists       — lista de emails para disparo amostral
    survey_sample_groups      — grupos de segmentação da amostra
    survey_sample_group_members — membros de cada grupo
```

### Fluxo do módulo legado (disparos/)

```
[Admin — /admin/surveys/[id]/disparos/ (módulo disparos/)]
    │
    ├─ DisparoForm.tsx (client — Server Action)
    │      └─ useActionState → createDisparo() [disparos/actions.ts]
    │
    └─ Histórico inline como tabela simples (sem expand, sem retry)

[disparos/actions.ts — Server Action]
    ├─ Usa lib/layers-api.ts → sendNotification() (payload formato antigo)
    ├─ Grava em survey_broadcasts (tabela diferente)
    ├─ NÃO cria survey_dispatch_jobs
    └─ NÃO tem cron / retomada / audit log por usuário
```

---

## 2. Duplicidade `dispatch/` vs `disparos/`

### O que cada módulo faz

| Dimensão | `dispatch/` (novo) | `disparos/` (legado) |
|---|---|---|
| **Rota admin** | `/admin/surveys/[id]/dispatch` | `/admin/surveys/[id]/disparos` |
| **Tabela de destino** | `survey_dispatches` + `survey_dispatch_jobs` | `survey_broadcasts` |
| **API backend** | `POST /api/admin/surveys/[id]/dispatch` | Server Action `createDisparo()` |
| **Lib usada** | `layers-notifications.ts` | `layers-api.ts` |
| **Payload Layers** | `/v2/notification/send` com `channels: { pushNotification, email }` | `/v2/notification/send` com `channels: ['push', 'email']` (formato antigo v1) |
| **Cron / retomada** | Sim (`process-dispatches`) | Não |
| **Modo personalizado** | Sim (com audit log por usuário) | Não |
| **Amostra (Excel)** | Sim (scope='sample') | Não |
| **Régua (sequence)** | Sim | Não |
| **Template** | Sim | Não |
| **Histórico detalhado** | Sim (expand + jobs + audit) | Tabela simples |
| **Retry manual** | Sim | Não |

### Conflito / sobreposição

Não há conflito funcional direto (escrevem em tabelas diferentes), mas há **sobreposição de responsabilidade**: as duas rotas entregam o mesmo objetivo ao usuário (disparar notificação para comunidades instaladas de uma survey), com experiências diferentes. O módulo `disparos/` é o precursor; `dispatch/` é o substituto completo. A coexistência gera:

1. **Confusão de navegação** — o admin vê dois destinos distintos para "disparar".
2. **Dados fragmentados** — histórico de disparos antigos está em `survey_broadcasts`, recentes em `survey_dispatches`. Não há visão unificada.
3. **Formato Layers divergente** — `layers-api.ts` passa `channels: ['push', 'email']` (array de strings) enquanto `layers-notifications.ts` passa `channels: { pushNotification: {...}, email: {...} }` (objeto). A API v2 espera o objeto. O módulo legado pode estar silenciosamente errando nos canais.

---

## 3. Bugs e gaps classificados

### P0 — Crítico (produção impactada agora)

**P0-A: Schema migration 008 não aceita `target_scope = 'sample'`**
- Arquivo: `supabase/migrations/008_survey_dispatches.sql`, linha 27
- O CHECK constraint é `CHECK (target_scope IN ('all', 'communities', 'group'))` — sem `'sample'`.
- O código em `route.ts` e `layers-notifications.ts` usa `'sample'` extensivamente.
- Se a migration não foi alterada em migrations posteriores (não lidas aqui), qualquer INSERT com `target_scope='sample'` lança violação de constraint no banco, retornando 500 silencioso para o admin.
- Risco: todos os disparos para amostra falham na criação do registro sem mensagem clara.

**P0-B: `disparos/actions.ts` usa formato de channels da API v1**
- Arquivo: `app/admin/surveys/[id]/disparos/actions.ts`, linha 53
- Passa `channels: ['push', 'email']` (array de strings).
- A API v2 (`/v2/notification/send`) espera `channels: { pushNotification: {...}, email: {...} }` (objeto com payload por canal).
- Resultado: a Layers pode rejeitar ou usar apenas push padrão sem os textos customizados.

### P1 — Alto (causa dados incorretos ou falha silenciosa)

**P1-A: `executePersonalizedJobSample` faz fetch do perfil Layers por usuário dentro do loop de disparo**
- Arquivo: `lib/layers-notifications.ts`, linhas 491–499
- Para cada entrada da amostra, chama `fetchLayersUser()` para enriquecer `nomeAluno` e `serie`.
- Isso adiciona 1 chamada HTTP extra por usuário, dobrando o tempo de execução e aumentando risco de timeout no Vercel (default 300s).
- Com 30 usuários por lote, 150ms de delay + ~200ms de fetchLayersUser = ~10,5s/lote vs. ~4,5s sem o fetch.
- Em amostras grandes (>200 por comunidade), o cron não consegue manter o ritmo e dispatches atrasam.

**P1-B: `fetchCommunityUsers` aceita apenas 1 role por vez**
- Arquivo: `lib/layers-notifications.ts`, linhas 271–273
- Quando múltiplos roles são selecionados (ex: guardian + student), o código passa apenas `roles[0]` para a Layers Hub API.
- Usuários com outros roles não são notificados — sem erro visível, o admin não percebe.

**P1-C: `executePersonalizedJob` não registra audit log**
- Arquivo: `lib/layers-notifications.ts`, linhas 629–656
- `executePersonalizedJobSample` insere em `notification_audit_logs` por usuário; `executePersonalizedJob` (para scope all/communities/group) não o faz.
- Dispatches não-amostra em modo personalizado não têm rastreabilidade por usuário.

**P1-D: `disparos/` escreve em `survey_broadcasts` mas o cron não processa agendamentos dessa tabela**
- Arquivo: `app/admin/surveys/[id]/disparos/actions.ts`, linhas 62–75
- Um disparo agendado via módulo `disparos/` é salvo com `status='scheduled'` em `survey_broadcasts`.
- O cron `process-dispatches` só lê `survey_dispatches`. Esses agendamentos nunca disparam.

### P2 — Médio (degradação de experiência ou risco operacional)

**P2-A: Cron busca até 5000 entradas de `survey_sample_lists` pendentes em cada ciclo**
- Arquivo: `app/api/cron/process-dispatches/route.ts`, linha 132
- `.limit(5000)` com concorrência 20. Em 5000 entradas × ~250ms médio = ~62,5s só para resolução.
- Somado ao processamento de dispatches, o ciclo de 5min pode exceder o timeout do Vercel Hobby (60s para funções serverless).
- Sem fallback: se a função é abortada no meio, entradas parcialmente resolvidas ficam com `layers_user_id = null` e são reprocessadas no próximo ciclo (idempotente, mas custoso).

**P2-B: Retry em DispatchHistory chama endpoint inexistente**
- Arquivo: `app/admin/surveys/[id]/dispatch/DispatchHistory.tsx`, linha 115
- Chama `POST /api/admin/dispatch/${dispatchId}/retry`.
- Não foi encontrada a rota `/api/admin/dispatch/[id]/retry` nos arquivos listados. Se ela não existe, o botão "Retry" sempre retorna 404, sem feedback ao admin.

**P2-C: `resolveTargetCommunities` com `scope='sample'` não respeita `target_group_alias` ao resolver comunidades**
- Arquivo: `lib/layers-notifications.ts`, linhas 123–137
- Ao criar jobs, a função busca comunidades com base em `communityIds` filtrados, mas ignora `target_group_alias` (que pode ser um UUID de grupo de amostra).
- Se um grupo de amostra contém usuários de uma única comunidade, os jobs são criados corretamente. Mas se o grupo tiver membros de múltiplas comunidades e o admin filtrou por comunidades específicas, o filtro é aplicado errado.

**P2-D: Disparo imediato e agendado têm status inicial diferente sem consistência**
- Arquivo: `app/api/admin/surveys/[id]/dispatch/route.ts`, linha 131
- Imediato: `initialStatus = 'sending'` (mesmo antes de executar)
- Agendado: `initialStatus = 'scheduled'`
- `executeDispatch` só busca jobs com `status='pending'` — mas o dispatch já foi marcado como 'sending'. Se `executeDispatch` falha antes de processar, o dispatch fica em 'sending' para sempre (zombie), sem o guard do cron passo 2b (que só olha dispatches já em 'sending' com jobs em 'sending', não 'pending').

**P2-E: `DispatchHistory` limita audit log a 200 registros sem paginação**
- Arquivo: `app/admin/surveys/[id]/dispatch/DispatchHistory.tsx`, linha 104
- `?limit=200` hardcoded. Para amostras grandes, os primeiros 200 usuários são visíveis; o restante é silenciosamente omitido.

### P3 — Melhoria

**P3-A: `KNOWN_COMMUNITIES` hardcoded no DispatchForm**
- Arquivo: `app/admin/surveys/[id]/dispatch/DispatchForm.tsx`, linhas 50–58
- Lista de 27 community aliases hardcoded no cliente. Novas instalações (ex: arte-total, globaltree-rio2) não aparecem na datalist.

**P3-B: `formatFirstName` não lida com nomes em all-caps corretamente para nomes compostos**
- Arquivo: `lib/layers-notifications.ts`, linhas 302–307
- "MARIA CLARA" → "Maria" (descarta "Clara"). Comportamento esperado, mas pode gerar mensagens estranhas para usuários com nome composto hiphenado ou nomes curtos.

**P3-C: Migration 008 não inclui índice em `target_scope`**
- Arquivo: `supabase/migrations/008_survey_dispatches.sql`
- O cron filtra `WHERE status = 'sending' AND personalized = true`. Há índice em `status` mas não em `(status, personalized)`. Com poucos dispatches não impacta, mas escala mal.

**P3-D: Módulo `disparos/` não tem link visível para `dispatch/`**
- O módulo legado não indica ao admin que existe uma versão mais completa na rota `dispatch/`.

---

## 4. Gap principal — disparo por comunidade sem Excel

### Por que hoje depende de lista manual

O sistema tem 4 scopes de segmentação:

| Scope | Como funciona | Dependência |
|---|---|---|
| `all` | Uma chamada Layers por comunidade instalada, `topic: {kind:'group', alias:'all'}` | Nenhuma — funciona nativamente |
| `communities` | Mesma coisa, mas para um subset de comunidades | Nenhuma |
| `group` | Uma chamada com `topic: {kind:'group', alias:'<turma>'}` | Admin saber o alias da turma |
| `sample` | Loop por usuário em `survey_sample_lists` | Upload manual de planilha Excel + resolução de emails |

O scope `sample` existe porque o sistema precisava atingir **subconjuntos específicos de responsáveis** (ex: "apenas quem tem filho matriculado em 2026") que a Layers não filtra nativamente. A Layers só filtra por turma (`group alias`) ou por toda a comunidade (`all`).

### Por que `kind: group, alias: all` não elimina o Excel

`{"targets": {"topics": [{"kind": "group", "alias": "all"}], "roles": ["guardian"]}}` dispara para **todos os responsáveis de todos os alunos de uma comunidade**. Isso:

- Cobre 100% dos responsáveis ativos na Layers — sem lista manual.
- Não permite personalização por usuário (sem `{{nome}}`, `{{nomeAluno}}`).
- Não permite filtrar por critério externo (ex: somente quem não respondeu ainda, somente determinado segmento TOTVS).

O Excel é necessário **apenas** nos casos:
1. Mensagem personalizada com nome do responsável ou aluno.
2. Segmentação por critério externo (status TOTVS, segmento, status de resposta).
3. Restrição a um subset menor que a comunidade toda.

### O que falta para usar `kind: group, alias: all` nativamente

A funcionalidade já existe e funciona hoje para `scope='all'` e `scope='communities'`. O código em `buildNotificationPayload()` (`layers-notifications.ts`, linhas 161–163) já emite exatamente esse payload:

```typescript
const topic: LayersTopic =
  dispatch.target_scope === 'group' && dispatch.target_group_alias
    ? { kind: 'group', alias: dispatch.target_group_alias }
    : { kind: 'group', alias: 'all' }
```

O disparo para toda a comunidade via `scope='all'` já usa `alias: 'all'` nativamente — sem Excel, sem loop de usuários.

O gap real é diferente: o sistema **não tem scope 'community_broadcast'** (ou equivalente) que:
1. Envie para toda a comunidade (sem Excel).
2. Mas ainda suporte placeholders de personalização — `{{nomeEscola}}` já funciona sem Excel; `{{nome}}` e `{{nomeAluno}}` requerem o loop por usuário.

Para o caso de uso "disparo broadcast para toda comunidade sem personalização de nome", o sistema já está completo. O Excel só é obrigatório quando `personalized=true`.

### Resumo do gap

| Caso de uso | Precisa de Excel hoje? | O que falta |
|---|---|---|
| Broadcast para toda comunidade, sem nome personalizado | Não — já funciona via `scope='all'` | Nada |
| Broadcast para toda comunidade, com `{{nomeEscola}}` | Não — já funciona | Nada |
| Broadcast com `{{nome}}` do responsável | Sim — precisa de Excel | Implementar scope `community_personalized` que busca usuários da Layers Hub API diretamente (já existe via `executePersonalizedJob` + `fetchCommunityUsers`), sem exigir Excel |
| Disparo para subset (ex: não respondentes) | Sim — sempre vai precisar de lista | Integração TOTVS/Supabase para gerar lista automaticamente |

O caminho mais direto para eliminar o Excel no caso de uso mais comum (personalizado para toda comunidade) é adicionar uma opção no `DispatchForm` de "Toda a comunidade — personalizado" que use `scope='all'` + `personalized=true`, ativando `executePersonalizedJob` que já busca usuários diretamente da Layers Hub API sem precisar de planilha.

---

## 5. Plano de sprints

### Sprint 1 — Estabilidade crítica (P0 + P1 mais impactantes)

**Objetivo:** Garantir que nenhum disparo falha silenciosamente.

| # | Fix | Arquivo(s) | Tipo |
|---|---|---|---|
| 1.1 | Adicionar `'sample'` ao CHECK de `target_scope` em migration nova (não editar 008) | Nova migration `0XX_add_sample_scope.sql` | Migration |
| 1.2 | Corrigir formato de channels em `disparos/actions.ts` para objeto ou deprecar o módulo | `disparos/actions.ts` | Fix |
| 1.3 | Corrigir `fetchCommunityUsers` para iterar por role quando múltiplos selecionados | `lib/layers-notifications.ts` | Fix |
| 1.4 | Verificar/criar rota `POST /api/admin/dispatch/[id]/retry` | Nova rota ou fix no DispatchHistory | Fix |
| 1.5 | Adicionar audit log a `executePersonalizedJob` (paridade com sample) | `lib/layers-notifications.ts` | Feature |

### Sprint 2 — Qualidade operacional (P1-D, P2)

**Objetivo:** Eliminar zombies, melhorar observabilidade e fechar o módulo legado.

| # | Fix | Arquivo(s) | Tipo |
|---|---|---|---|
| 2.1 | Processar agendamentos de `survey_broadcasts` no cron (ou migrar todos para `survey_dispatches`) | `app/api/cron/process-dispatches/route.ts` ou deprecação de `disparos/` | Fix |
| 2.2 | Remover `fetchLayersUser` do loop de disparo da amostra; pré-carregar dados antes do loop | `lib/layers-notifications.ts` (executePersonalizedJobSample) | Refactor/Perf |
| 2.3 | Reduzir limite de resolução de amostras por ciclo de 5000 para ~500 com múltiplos ciclos | `app/api/cron/process-dispatches/route.ts` linha 132 | Fix |
| 2.4 | Paginação no audit log do DispatchHistory | `DispatchHistory.tsx` + endpoint `dispatch-audit` | Feature |
| 2.5 | Adicionar índice composto `(status, personalized)` em `survey_dispatches` | Nova migration | Migration |

### Sprint 3 — Eliminação do Excel para caso de uso principal + unificação

**Objetivo:** Permitir disparo personalizado para toda a comunidade sem upload de planilha; deprecar `disparos/`.

| # | Fix | Arquivo(s) | Tipo |
|---|---|---|---|
| 3.1 | Adicionar scope `community_personalized` no DispatchForm: usa `scope='all'` + `personalized=true`, sem exigir amostra | `DispatchForm.tsx`, `route.ts`, `layers-notifications.ts` | Feature |
| 3.2 | Atualizar `DispatchSchema` e `resolveTargetCommunities` para distinguir broadcast-group de broadcast-personalizado | `route.ts`, `layers-notifications.ts` | Refactor |
| 3.3 | Redirecionar `/admin/surveys/[id]/disparos` → `/admin/surveys/[id]/dispatch` com banner de deprecação | `disparos/page.tsx` | Deprecação |
| 3.4 | Migrar registros históricos de `survey_broadcasts` para exibição somente-leitura no DispatchHistory | Nova query no `dispatch/page.tsx` | Feature |
| 3.5 | Atualizar `KNOWN_COMMUNITIES` para busca dinâmica via API | `DispatchForm.tsx` | Melhoria |

---

## Apêndice — arquivos relevantes por tema

| Tema | Arquivo |
|---|---|
| Cron principal | `survey-platform/app/api/cron/process-dispatches/route.ts` |
| Módulo dispatch (novo) | `survey-platform/app/admin/surveys/[id]/dispatch/` |
| Módulo disparos (legado) | `survey-platform/app/admin/surveys/[id]/disparos/` |
| Lógica de notificação | `survey-platform/lib/layers-notifications.ts` |
| Client Layers legado | `survey-platform/lib/layers-api.ts` |
| Schema do banco | `survey-platform/supabase/migrations/008_survey_dispatches.sql` |
| Referência da API Layers | `docs/layers-notifications.md` (raiz do repo) |
