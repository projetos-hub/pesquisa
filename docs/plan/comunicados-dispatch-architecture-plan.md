# Task Plan: Comunicados no Fluxo de Disparos

## Goal

Adicionar Comunicados como terceiro canal de divulgacao das pesquisas, integrado ao fluxo atual de push/e-mail, com controle de publico, seguranca, rastreabilidade, UI admin e operacao confiavel via API Hub Layers.

## Contexto atual

O projeto ja tem:

- Disparo de push/e-mail em `survey_dispatches` e `survey_dispatch_jobs`.
- UI admin de disparo em `app/admin/surveys/[id]/dispatch`.
- Resolucao de publico por `target_scope`: `all`, `communities`, `group`, `sample`.
- Disparo personalizado por usuario para `personalized=true`.
- Auditoria em `notification_audit_logs`.
- Tabela `comunicados` criada por `029_comunicados.sql`.
- Provider API Hub validado:
  - action: `@layers:Posts:getUpdatedAfter`
  - provider: `m3jzq5s00b`
  - version: `1`
  - endpoint: `/api/layers/actions/posts`

## Principios de desenho

1. Comunicados nao substitui push/e-mail; ele adiciona persistencia.
2. Push/e-mail continuam sendo canais de alerta imediato.
3. Comunicados deve ser opcional por dispatch ate o comportamento estar validado em producao.
4. Criar comunicado deve ser idempotente: repetir um dispatch/retry nao pode duplicar cards.
5. Target de comunicado deve refletir o publico real do dispatch, sem ampliar audiencia por acidente.
6. O provider deve ser protegido por secret antes de uso amplo.
7. A primeira entrega deve favorecer controle e seguranca, nao automacao excessiva.

## Perguntas de produto que precisam de decisao

| Pergunta | Opcoes | Recomendacao inicial |
|---|---|---|
| Comunicados entra ligado por padrao? | off, on, herdado de template | Comecar off por padrao, com toggle explicito |
| Quais canais podem coexistir? | push, email, comunicados em qualquer combinacao | Permitir combinacao; exigir ao menos um canal |
| Quem recebe comunicado geral? | toda comunidade, roles, grupos, usuarios | Comecar com comunidade inteira para dispatch geral/comunidade |
| Amostra gera comunicado? | nao, users individuais, grupo geral | Comecar desativado para amostra ate confirmar `targets.users` na UI |
| Comunicado de sequencia/regua | um por etapa, so convite inicial, nenhum | Comecar so no convite inicial ou por etapa com toggle por step |
| Conteudo e igual ao push/email? | mesmo titulo/corpo, campos proprios, template | Comecar com mesmo titulo/corpo e permitir override depois |
| Aprovacao | always published, draft, autoapprove conforme AppMaker | Comecar `published`/`approved=true` apenas para admin autenticado |
| Arquivamento | manual, automatico por data, nunca | Adicionar campos planejados para arquivar depois; nao bloquear MVP |

## Modelo conceitual de canais

### Canais atuais

| Canal | Finalidade | Onde roda | Persistencia |
|---|---|---|---|
| Push | alerta imediato no app/celular | Layers Notification API | nao persistente no nosso feed |
| Email | alerta externo e registro na caixa postal | Layers Notification API | fora do app Layers |
| Comunicados | historico persistente dentro do app | Nosso provider API Hub + tabela Supabase | persistente em `comunicados` |

### Novo comportamento esperado

Ao criar um dispatch, o admin escolhe canais:

```text
[x] Push
[x] Email
[ ] Comunicados
```

Se Comunicados estiver marcado:

1. O backend cria ou agenda o dispatch normalmente.
2. O backend cria registros em `comunicados` para as comunidades alvo.
3. A Layers chama `/api/layers/actions/posts` quando o usuario abre Comunicados.
4. O provider retorna os comunicados publicados daquela comunidade.

## Publicos e segmentacao

### Tipos de comunicado

| Tipo | Exemplo | Target recomendado | Observacao |
|---|---|---|---|
| Geral por comunidade | "Pesquisa CSAT aberta" | `targets.groups = ["all"]` | Primeiro caso de uso |
| Por comunidade especifica | "Pesquisa da unidade X" | um registro por `community_id`, `groups:["all"]` | Seguro e simples |
| Por grupo Layers | "Pesquisa para turma X" | `target_scope='group'` com alias | Precisa validar formato no app Comunicados |
| Por usuario/amostra | "Pesquisa para familia Y" | `targets.users = [layers_user_id]` | API retorna, mas UI ainda precisa validacao |
| Admin-only/teste | validacao interna | `targets.users` ou role admin | Usar so em ambiente controlado |

### Regra inicial recomendada

| Dispatch scope | Comunicados no MVP? | Como criar |
|---|---|---|
| `all` | sim | um comunicado por comunidade ativa da survey, `groups:["all"]` |
| `communities` | sim | um comunicado por comunidade selecionada, `groups:["all"]` |
| `group` | com cautela | se alias for confiavel, target group; senao fallback bloqueado |
| `sample` | nao por padrao | liberar apenas depois de provar `targets.users` no app real |

## Opcoes de configuracao de um comunicado

### Campos minimos obrigatorios

Todo comunicado precisa destes campos para aparecer corretamente pelo provider API Hub:

| Campo | Obrigatorio | Origem no MVP | Observacao |
|---|---|---|---|
| `community_id` | sim | comunidade alvo do dispatch | Um comunicado por comunidade |
| `title` | sim | `dispatch.title` | Deve ser curto e escaneavel |
| `description` | sim | `dispatch.body` | Pode conter texto mais longo |
| `category` | sim | default `Avisos` | Validar se a Layers aceita categorias livres |
| `targets` | sim | `{"groups":["all"]}` | Define quem ve o comunicado |
| `status` | sim | `published` ou `draft` | `published` aparece; `draft` nao |
| `approved` | sim | `true` | Necessario para o provider retornar |
| `author_name` | nao, mas recomendado | `Raiz Educacao` | Exibicao/autoria |

Exemplo minimo:

```json
{
  "community_id": "raizeducacao",
  "title": "Pesquisa aberta",
  "description": "Responda a pesquisa de satisfacao.",
  "category": "Avisos",
  "targets": { "groups": ["all"] },
  "status": "published",
  "approved": true,
  "author_name": "Raiz Educacao"
}
```

### Publico-alvo

Publico e a decisao mais sensivel, porque erro aqui pode ampliar audiencia por acidente.

| Tipo | Estrutura esperada | Status para MVP | Observacao |
|---|---|---|---|
| Comunidade inteira | `{ "groups": ["all"] }` | liberar | Caminho mais seguro para comecar |
| Usuarios especificos | `{ "users": ["layers_user_id"] }` | bloquear ate validar | API retorna, mas UI real ainda precisa prova |
| Grupo/turma | `{ "groups": ["alias-do-grupo"] }` | bloquear/validar | Depende de alias aceito pela Layers |
| Admin/teste | users especificos ou role admin | uso tecnico | Apenas diagnostico |

Regra de produto inicial:

- Dispatch `all` e `communities`: permitido criar comunicado geral por comunidade.
- Dispatch `group`: exigir validacao do alias antes de liberar.
- Dispatch `sample`: nao criar comunicado automaticamente no MVP.

### Status e publicacao

| Campo/opcao | Uso | Recomendacao |
|---|---|---|
| `draft` | criado mas nao aparece | usar para agendados se nao houver publicacao futura confiavel |
| `published` | aparece no app | usar para dispatch imediato |
| `archived` | remove da exibicao sem apagar historico | usar para limpeza/encerramento |
| `approved=true` | liberado para retorno no provider | default para criacao por admin autenticado |
| `approved=false` | aguardando revisao | futuro fluxo editorial |

Para dispatch imediato:

```json
{
  "status": "published",
  "approved": true
}
```

Para dispatch agendado, decidir entre:

1. Criar `draft` e publicar no horario do envio.
2. Criar apenas quando o cron executar o dispatch.
3. Criar `published` imediatamente, aceitando que apareca antes do push/e-mail.

Recomendacao: opcao 1 ou 2. Evitar comunicado aparecer antes da comunicacao ativa.

### Datas e ciclo de vida

Campos recomendados:

| Campo | Necessidade |
|---|---|
| `created_at` | auditoria |
| `updated_at` | usado pelo `getUpdatedAfter` |
| `published_at` | controle de quando passa a aparecer |
| `expires_at` | retirada automatica futura |
| `archived_at` | historico de arquivamento |

No MVP, `created_at` e `updated_at` ja existem; adicionar os demais na migration de robustez.

### Relacao com pesquisa e dispatch

Campos necessarios para rastreabilidade:

| Campo | Uso |
|---|---|
| `survey_id` | qual pesquisa originou |
| `dispatch_id` | qual disparo originou |
| `source` | `manual`, `dispatch`, `test` |
| `created_by` | admin responsavel |

Esses campos permitem:

- evitar duplicidade;
- mostrar comunicados no historico do dispatch;
- auditar quem publicou;
- arquivar tudo que veio de um dispatch, se necessario.

### Conteudo por canal

O disparo hoje ja tem conteudos separados para push/e-mail. Comunicados deve poder herdar ou ter override proprio.

| Campo | MVP | Futuro |
|---|---|---|
| `title` geral | usado como titulo do comunicado | pode continuar como fallback |
| `body` geral | usado como descricao do comunicado | pode continuar como fallback |
| `push_title` / `push_body` | apenas push | sem mudanca |
| `email_title` / `email_body` | apenas email | sem mudanca |
| `comunicado_title` | nao necessario | override especifico |
| `comunicado_description` | nao necessario | override especifico |
| `comunicado_category` | default `Avisos` | editavel |
| `comunicado_expires_at` | nao necessario | controle de validade |

Contrato recomendado no POST:

```json
{
  "channels": ["pushNotification", "email"],
  "comunicado": {
    "enabled": true,
    "title": "Pesquisa de satisfacao disponivel",
    "description": "Acesse o app Pesquisa e responda ate sexta-feira.",
    "category": "Avisos"
  }
}
```

### Anexos e midia

A tabela ja tem `attachments`.

Para MVP:

```json
[]
```

Futuro:

- link;
- imagem de capa;
- PDF;
- arquivo complementar;
- imagem especifica da pesquisa.

Antes de liberar anexos, validar o formato aceito pela UI da Layers no retorno da action.

### Categorias

Categoria atual usada nos testes:

```text
Avisos
```

Categorias candidatas:

- `Avisos`
- `Pesquisas`
- `Comunicados`
- `Eventos`
- `Academico`
- `Financeiro`

Risco:

- A Layers pode aceitar texto livre, mas a UI pode filtrar ou agrupar por categorias conhecidas.

Recomendacao:

- MVP usa `Avisos`.
- Depois testar `Pesquisas` e documentar se aparece igual.

### Opcoes que a UI deve expor no MVP

Na tela de disparo, expor apenas:

1. `Criar comunicado no app` (`enabled`)
2. `Titulo do comunicado` preenchido por default com o titulo do dispatch
3. `Descricao do comunicado` preenchida por default com o corpo do dispatch
4. `Categoria` com default `Avisos`
5. Preview do publico herdado do dispatch
6. Aviso/bloqueio para `sample`

Nao expor no MVP:

- anexos;
- comunicado individual/amostra;
- categorias avancadas;
- expiracao automatica;
- aprovacao manual;
- editor HTML rico.

### Validacoes obrigatorias

| Validacao | Motivo |
|---|---|
| `title` nao vazio e maximo razoavel | evitar card quebrado |
| `description` nao vazio | comunicado sem corpo perde valor |
| `community_id` resolvido | evitar registro orfao |
| `targets` compativel com scope | evitar audiencia errada |
| `sample` bloqueado no MVP | evitar falso senso de segmentacao individual |
| idempotencia por dispatch/comunidade | evitar duplicidade em retry |
| secret validado no provider | proteger leitura dos comunicados |

## Arquitetura de dados

### Tabela atual: `comunicados`

Campos existentes:

- `id`
- `survey_id`
- `community_id`
- `title`
- `description`
- `category`
- `target_scope`
- `targets`
- `author_name`
- `attachments`
- `approved`
- `status`
- `created_at`
- `updated_at`

### Gaps para operacao robusta

Campos ou tabela de ligacao recomendados:

| Necessidade | Solucao recomendada |
|---|---|
| Evitar duplicidade por dispatch/comunidade | adicionar `dispatch_id` em `comunicados` e unique parcial |
| Saber se comunicado veio de automacao ou admin | adicionar `source` com `dispatch`, `manual`, `test` |
| Auditar criador | adicionar `created_by` UUID opcional |
| Controlar validade | adicionar `published_at`, `archived_at` ou `expires_at` |
| Guardar payload retornado ao API Hub | derivar em runtime; nao duplicar inicialmente |
| Rastrear falhas de criacao | criar tabela `comunicado_dispatch_links` ou logs estruturados |

### Migration proposta

Adicionar campos:

```sql
ALTER TABLE comunicados
  ADD COLUMN IF NOT EXISTS dispatch_id UUID REFERENCES survey_dispatches(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'manual'
    CHECK (source IN ('manual', 'dispatch', 'test')),
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;
```

Indice/idempotencia:

```sql
CREATE UNIQUE INDEX IF NOT EXISTS uniq_comunicados_dispatch_community
  ON comunicados(dispatch_id, community_id)
  WHERE dispatch_id IS NOT NULL AND source = 'dispatch';
```

Observacao: para sequencias/regua, talvez seja necessario incluir `sequence_step_key` ou `sequence_step_index` na chave unica.

## Arquitetura de servidor

### Componentes

| Componente | Responsabilidade |
|---|---|
| `POST /api/admin/surveys/[id]/dispatch` | Receber canais, criar dispatch e decidir se cria comunicados |
| `lib/layers-notifications.ts` | Continuar responsavel por push/e-mail |
| novo `lib/layers-comunicados.ts` | Criar, mapear e arquivar comunicados |
| `POST /api/layers/actions/posts` | Provider API Hub, listar comunicados publicados |
| Cron de dispatch | Processar jobs agendados/personalizados; nao deve duplicar comunicados |

### Funcao nova recomendada

```ts
createComunicadosForDispatch({
  dispatch,
  survey,
  targetCommunities,
  createdBy,
  mode,
})
```

Responsabilidades:

- Construir titulo/descricao do comunicado.
- Resolver `targets` conforme `target_scope`.
- Inserir um comunicado por comunidade.
- Usar upsert/unique para idempotencia.
- Retornar contadores e IDs criados.
- Logar `dispatch_id`, `survey_id`, `community_id`, `comunicado_id`.

### Quando criar comunicados

| Caso | Momento recomendado |
|---|---|
| Dispatch imediato | apos criar `survey_dispatches` e `survey_dispatch_jobs`, antes de `executeDispatch` |
| Dispatch agendado | no momento da criacao do agendamento, com `published_at` futuro ou status `draft/scheduled` |
| Regua/sequencia | criar conforme cada step e sua data |
| Retry de dispatch | nao criar novos comunicados |

### Status para agendados

Duas opcoes:

1. Criar `status='published'` imediatamente.
2. Criar `status='draft'` ou `published_at` futuro e publicar no cron.

Recomendacao inicial:

- Para MVP, em dispatch agendado, criar comunicado `draft` ou nao criar ate o cron efetivar o envio.
- Evita comunicado aparecer antes do push/email.

## UI admin

### Mudancas na tela de disparo

Adicionar uma secao "Canais" com tres opcoes:

```text
[x] Push
[x] Email
[ ] Comunicados
```

Ao marcar Comunicados, exibir:

- Preview do comunicado.
- Categoria (`Avisos` inicialmente).
- Texto explicativo curto: "Ficara disponivel no modulo Comunicados da Layers para o publico selecionado."
- Aviso para amostra: "Comunicados para amostra individual ainda dependem de validacao."

### Conteudo

MVP:

- `title` do comunicado = `title` do dispatch.
- `description` = `body` do dispatch.
- `category` = `Avisos`.
- `author_name` = `Raiz Educacao`.

Evolucao:

- Toggle "Usar texto especifico para Comunicados".
- Campos:
  - `comunicado_title`
  - `comunicado_description`
  - `comunicado_category`
  - `comunicado_expires_at`

### Preview

Preview deve mostrar:

- titulo;
- descricao;
- categoria;
- comunidades alvo;
- publico estimado;
- status: "sera publicado agora" ou "sera publicado no horario agendado".

### Historico de disparos

Adicionar no historico:

- contador de comunicados criados;
- link/lista de `comunicado_id`;
- status agregado: `published`, `draft`, `archived`, `failed`;
- alerta se push/email saiu mas comunicado falhou.

### Tela admin dedicada

Nao precisa ser MVP, mas arquitetura deve prever:

```text
/admin/comunicados
/admin/comunicados/new
/admin/comunicados/[id]
```

Casos de uso:

- criar comunicado sem pesquisa;
- editar/arquivar comunicado;
- republicar comunicado;
- ver quais pesquisas/disparos geraram comunicado.

## Fluxo com push/e-mail

### Dispatch sem Comunicados

Comportamento atual permanece.

### Dispatch com Comunicados

Fluxo:

```text
Admin preenche mensagem
Admin seleciona Push/E-mail/Comunicados
Backend valida publico
Backend cria survey_dispatches
Backend cria survey_dispatch_jobs
Backend cria comunicados idempotentes
Se imediato: executeDispatch envia push/e-mail
Se agendado: cron envia push/e-mail e publica/cria comunicados na hora certa
```

### Relacao entre canais

| Cenario | Push/e-mail | Comunicados |
|---|---|---|
| Push falha, comunicado criado | Usuario pode ver no app, mas nao recebeu alerta | Mostrar alerta operacional |
| Push envia, comunicado falha | Usuario recebe alerta, mas nao ve historico | Permitir retry so do comunicado |
| Email falha, comunicado existe | Canal persistente cobre parte do gap | Auditoria separada |
| Comunicados desativado | Fluxo atual sem mudanca | sem registro |

## Contratos API

### POST dispatch

Adicionar ao body:

```json
{
  "channels": ["pushNotification", "email", "comunicados"],
  "comunicado": {
    "enabled": true,
    "title": "Pesquisa aberta",
    "description": "Conteudo do comunicado",
    "category": "Avisos",
    "publishMode": "with_dispatch"
  }
}
```

Alternativa mais simples:

```json
{
  "channels": ["pushNotification", "email"],
  "create_comunicado": true
}
```

Recomendacao:

- Nao misturar `comunicados` no array `channels` tipado para Layers Notification API.
- Usar campo separado `comunicado.enabled`.
- Evita confundir `Channel = 'pushNotification' | 'email'` com canal persistente interno.

### Provider API Hub

Continuar retornando:

```json
{
  "result": [
    {
      "id": "...",
      "title": "...",
      "description": "...",
      "createdAt": "...",
      "updatedAt": "...",
      "category": "Avisos",
      "attachments": [],
      "targets": { "groups": ["all"] },
      "author": { "name": "Raiz Educacao" },
      "approved": true
    }
  ]
}
```

Adicionar validacao de secret antes de ampliar uso.

## Seguranca e privacidade

### Secret API Hub

Obrigatorio antes de producao:

- `LAYERS_POSTS_SECRET` no Vercel.
- `POST /api/layers/actions/posts` valida `body.secret`.
- Nao logar secret.

### Service role

O provider usa service role para consultar `comunicados`. Isso e aceitavel se:

- filtro por `community_id` for obrigatorio;
- somente `status='published'` e `approved=true` forem retornados;
- campos sensiveis nao forem adicionados ao payload;
- testes cobrirem isolamento por comunidade.

### Publico restrito

Para publico individual/amostra:

- validar visualmente `targets.users` no app real antes de usar;
- evitar inserir nomes/alunos no comunicado geral;
- se o texto for personalizado por usuario, nao criar um comunicado geral com variaveis interpoladas de uma pessoa.

## Observabilidade

### Logs necessarios

No provider:

- `community`
- `after`
- `limit`
- quantidade retornada
- status HTTP
- correlationId

Na criacao:

- `dispatch_id`
- `survey_id`
- `community_id`
- `comunicado_id`
- `source`
- `status`

Nunca logar:

- secret;
- corpo completo se houver dados pessoais;
- lista completa de usuarios em targets individuais.

### Smoke test

Script/manual:

1. `services/discover` para `@layers:Posts:getUpdatedAfter`.
2. Confirmar `m3jzq5s00b.versions` contem `1`.
3. `services/call` com `version=1`.
4. Confirmar `data.result` nao quebra schema.

## Rollout recomendado

### Stage 0: Seguranca do provider

- Validar `LAYERS_POSTS_SECRET`.
- Adicionar testes unitarios/API.
- Smoke API Hub apos deploy.

### Stage 1: Validacao visual manual

- Manter comunicados de teste para `raizeducacao`.
- Abrir app Comunicados e confirmar exibicao.
- Registrar comportamento de cache/targets.

### Stage 2: MVP admin controlado

- Adicionar toggle "Criar comunicado no app".
- Habilitar apenas para `target_scope=all` e `communities`.
- Criar comunicados por comunidade.
- Sem suporte inicial a `sample`.

### Stage 3: Integracao com dispatch real

- Criar comunicados idempotentes junto ao dispatch.
- Mostrar status no historico.
- Permitir retry/arquivamento manual.

### Stage 4: Amostras e segmentacao fina

- Validar `targets.users`.
- Se aprovado, permitir comunicados individuais/amostra.
- Se nao aprovado, manter Comunicados apenas para publico geral/comunidade.

### Stage 5: Tela dedicada de Comunicados

- CRUD admin.
- Arquivamento.
- Templates.
- Relatorios de cobertura.

## Phases

### Phase 0: Test Specification (RED)

- [ ] Escrever acceptance criteria para provider protegido por secret. **Done when:** cenarios sem secret, secret invalido e secret valido estao especificados.
- [ ] Escrever acceptance criteria para criacao idempotente de comunicados por dispatch/comunidade. **Done when:** duplicidade, retry e dispatch agendado estao cobertos.
- [ ] Escrever acceptance criteria de UI para toggle de Comunicados. **Done when:** estados habilitado/desabilitado, scope sample e preview estao cobertos.
- **Status:** pending
- **Estimate:** M

### Phase 1: Provider seguro

- [ ] Adicionar `LAYERS_POSTS_SECRET` ao ambiente de producao Vercel. **Done when:** deploy consegue ler a env var.
- [ ] Implementar validacao do secret em `/api/layers/actions/posts`. **Done when:** chamadas sem/erradas recebem `401` e `services/call` com secret correto passa.
- [ ] Adicionar testes do endpoint. **Done when:** unit/API tests cobrem auth, community obrigatoria, filtro de status e approved.
- [ ] Rodar smoke API Hub. **Done when:** `services/discover` retorna `versions:[1]` e `services/call` retorna comunicados.
- **Status:** pending
- **Estimate:** M

### Phase 2: Validacao de exibicao e targets

- [ ] Validar visualmente posts de teste no app Comunicados. **Done when:** post `groups:["all"]` aparece para usuario de `raizeducacao`.
- [ ] Testar target por usuario. **Done when:** post `targets.users` aparece apenas para usuario esperado ou limitacao fica documentada.
- [ ] Testar target por grupo/turma, se aplicavel. **Done when:** formato aceito ou bloqueio documentado.
- [ ] Documentar cache/latencia observada. **Done when:** tempo ate aparecer e comportamento de refresh estao registrados.
- **Status:** pending
- **Estimate:** M
- **Depends on:** Phase 1

### Phase 3: Schema e idempotencia

- [ ] Criar migration para `dispatch_id`, `source`, `created_by`, datas de publicacao/arquivamento e unique parcial. **Done when:** migration revisada e RLS mantida.
- [ ] Adicionar helpers de construcao de comunicado. **Done when:** helper puro transforma dispatch + comunidade em payload de insert.
- [ ] Adicionar testes de idempotencia. **Done when:** criar duas vezes para mesmo dispatch/comunidade nao duplica.
- **Status:** pending
- **Estimate:** M
- **Depends on:** Phase 2

### Phase 4: UI de disparo

- [ ] Adicionar toggle "Criar comunicado no app" na tela de dispatch. **Done when:** admin consegue ligar/desligar sem afetar push/e-mail.
- [ ] Adicionar preview do comunicado. **Done when:** mostra titulo, descricao, categoria, publico e comunidades alvo.
- [ ] Bloquear ou alertar para `sample` enquanto target individual nao estiver validado. **Done when:** UI impede uso arriscado ou exige confirmacao explicita.
- [ ] Enviar `comunicado.enabled` no POST de dispatch. **Done when:** payload chega validado no backend.
- **Status:** pending
- **Estimate:** G
- **Depends on:** Phase 3

### Phase 5: Backend de criacao no dispatch

- [ ] Estender schema do POST de dispatch com `comunicado`. **Done when:** Zod valida campos novos e preserva compatibilidade.
- [ ] Criar `lib/layers-comunicados.ts`. **Done when:** modulo cria comunicados por comunidade com upsert/idempotencia.
- [ ] Integrar criacao apos `survey_dispatch_jobs`. **Done when:** dispatch com comunicado cria registros corretos.
- [ ] Tratar rollback/erro parcial. **Done when:** se criacao falhar, resposta/log deixam claro e nao corrompem dispatch.
- [ ] Ajustar dispatch agendado. **Done when:** comunicado nao aparece antes da hora planejada ou decisao contraria esta documentada.
- **Status:** pending
- **Estimate:** G
- **Depends on:** Phase 4

### Phase 6: Historico, retry e operacao

- [ ] Mostrar comunicados no historico de dispatch. **Done when:** admin ve quantidade, IDs/status e falhas.
- [ ] Criar retry de criacao de comunicados. **Done when:** falha parcial pode ser refeita sem duplicar.
- [ ] Adicionar logs estruturados. **Done when:** provider e criacao registram eventos sem PII/secret.
- [ ] Atualizar runbook. **Done when:** existe procedimento para "push saiu, comunicado nao apareceu".
- **Status:** pending
- **Estimate:** G
- **Depends on:** Phase 5

### Phase 7: Automacao ampla e tela dedicada

- [ ] Definir se `/admin/comunicados` entra no produto. **Done when:** decisao registrada com trade-offs.
- [ ] Implementar CRUD se aprovado. **Done when:** admin cria, edita, arquiva e lista comunicados sem dispatch.
- [ ] Habilitar sample/usuarios se validado. **Done when:** comunicados restritos aparecem apenas para publico correto.
- [ ] Adicionar metricas de uso/cobertura. **Done when:** dashboard/report mostra comunicados criados e visibilidade operacional.
- **Status:** pending
- **Estimate:** G
- **Depends on:** Phase 6

## Decisions Made

| Decision | Rationale |
|---|---|
| Usar API Hub/provider, nao API privada `comunicados-api.layers.digital` | API privada depende de contexto do portal oficial e nao e contrato estavel |
| Manter Comunicados separado de `channels` da Layers Notification API | Evita misturar canal persistente interno com canais suportados por `/v2/notification/send` |
| Comecar com comunicados gerais por comunidade | E o publico mais seguro e ja compativel com `targets.groups=["all"]` |
| Desativar amostra no MVP | `targets.users` ainda precisa validacao visual no app Comunicados |
| Criar idempotencia por `dispatch_id + community_id` | Retry/cron nao podem duplicar posts |
| Proteger provider com `LAYERS_POSTS_SECRET` antes do uso amplo | Endpoint usa service role e nao deve ser consultavel publicamente |

## Errors Encountered

| Error | Attempt | Resolution |
|---|---|---|
| `versions: []` no discovery | Rotacionar secret e aguardar propagacao | Provider passou a `versions:[1]` |
| API privada retornou 400 fora do portal oficial | Reproduzir HAR com session/query/referrer | Caminho descartado para server-side |
| PUT AppMaker rejeitou manifesto | Tentar enviar manifesto completo via API | UI AppMaker ficou como fonte pratica de configuracao |

## Open Questions

| Pergunta | Como responder |
|---|---|
| `targets.users` aparece na UI real? | Criar/usar post de teste individual e abrir com usuario esperado |
| `targets.groups` aceita alias diferente de `all`? | Testar com grupo real pequeno |
| Comunicados aparece em home/preview da Layers ou so no modulo? | Capturar HAR da home/launcher e procurar actions de cards/preview |
| Existe limite de payload/quantidade no provider? | Testar `limit`, `after` e observar resposta da Layers |
| A UI cacheia provider por quanto tempo? | Registrar horarios de insert/update e aparicao no app |

## Plano de bateria de testes do contrato de Comunicados

Objetivo: descobrir com seguranca qual payload do provider `@layers:Posts:getUpdatedAfter` a UI real do app Comunicados renderiza, antes de integrar a criacao automatica ao dispatch.

Base visual observada no formulario nativo de criacao de Comunicados:

- `Titulo` obrigatorio.
- `Imagem do post` opcional.
- `Descricao` obrigatoria com editor rico.
- `Para quem enviar` obrigatorio, baseado em publico/topicos.
- `Quem pode ver esta publicacao?` obrigatorio, baseado em perfis/roles.
- `Categoria` obrigatoria, em `raizeducacao` observada como `Geral`.
- `Anexos` opcionais, ate 5 anexos de 15 MB cada.
- `App Agenda` opcional para adicionar evento.
- `Enviar notificacao` opcional.
- `Permitir solicitacoes` opcional.

### Hipoteses a validar

| Hipotese | Por que importa |
|---|---|
| Categoria invalida faz a publicacao sumir | Nosso teste usou `Avisos`, mas a categoria existente observada e `Geral` |
| `targets` precisa conter `users`, `members` e `groups` mesmo vazios | A spec antiga mostra esse shape completo |
| Roles/perfis influenciam renderizacao | O formulario nativo exige "Quem pode ver esta publicacao?" |
| Provider pull usa shape diferente da API privada de criacao | HAR de criacao usa `targets.topics` + `targets.roles`; spec provider usa `groups/users/members` |
| `approved: true` e necessario | Sem autoapprove pode nao aparecer |
| `category` pode ser omitida com mais sucesso que categoria invalida | Doc antiga recomenda omitir se categorias nao forem conhecidas |
| UI tem cache | API Hub retorna `200`, mas UI pode atrasar aparicao |

### Perfis/roles observados na UI

Perfis exibidos no print:

- `mother` / Mae
- `father` / Pai
- `academic_responsible` / Responsavel Academico
- `financial_responsible` / Responsavel Financeiro
- `director` / Direcao
- `secretary` / Secretaria / Adm
- `coordenator` / Coordenador
- `multiplicator` / Multiplicador
- `library` / Biblioteca
- `admin` / Administrador Geral
- `student` / Estudante
- `collaborator` / Colaborador ProRaiz
- `marketplace_owner` / Marketplace Owner
- `partner_school` / Escola / Parceiro
- `professor` / Professor
- `guardian` / Responsavel
- `attendant` / Atendente

Observacao: a API de notificacao usa roles agregados como `guardian`, `student`, `admin`. Para Comunicados, a UI nativa mostra roles mais granulares. Precisamos validar se o provider aceita os agregados, os granulares, ou se roles nao entram no payload provider.

### Matriz de testes minima

Cada teste deve criar um comunicado unico em `comunicados`, chamar `services/call`, abrir o app Comunicados e registrar:

- aparece na UI? sim/nao;
- tempo ate aparecer;
- categoria exibida;
- publico esperado;
- logs Vercel da chamada;
- payload retornado pelo provider;
- usuario usado no teste.

| Teste | Categoria | Targets | Author | Approved | Esperado |
|---|---|---|---|---|---|
| T01 baseline seguro | omitida/null | `{ users: [], members: [], groups: ["all"] }` | completo | true | Deve aparecer se categoria nao for obrigatoria no provider |
| T02 categoria Geral | `Geral` | `{ users: [], members: [], groups: ["all"] }` | completo | true | Deve aparecer se categoria precisa ser valida |
| T03 categoria Avisos | `Avisos` | `{ users: [], members: [], groups: ["all"] }` | completo | true | Provavel nao aparecer; confirma categoria invalida |
| T04 targets atual | `Geral` | `{ groups: ["all"] }` | completo | true | Isola se arrays vazios sao obrigatorios |
| T05 sem author | `Geral` | completo | ausente | true | Descobre se author e opcional de fato |
| T06 approved ausente | `Geral` | completo | completo | ausente | Descobre se approved e obrigatorio |
| T07 approved false | `Geral` | completo | completo | false | Deve nao aparecer ou ir para moderacao |
| T08 usuario especifico string | `Geral` | `{ users: ["637..."], members: [], groups: [] }` | completo | true | Deve aparecer so para usuario alvo se formato for aceito |
| T09 usuario especifico objeto | `Geral` | `{ users: [{ id: "637..." }], members: [], groups: [] }` | completo | true | Testa formato citado em doc v3 |
| T10 grupo all + role guardian | `Geral` | completo + roles se suportado | completo | true | Avalia se role entra no provider |
| T11 grupo real | `Geral` | `{ users: [], members: [], groups: ["alias-ou-id-grupo"] }` | completo | true | Valida turma/grupo |
| T12 HTML simples | `Geral` | completo | completo | true | Valida descricao com `<p>`, `<strong>`, links |
| T13 anexos vazios vs ausentes | `Geral` | completo | completo | true | Confirma se `attachments: []` e necessario |
| T14 updatedAt novo | `Geral` | completo | completo | true | Confirma se `after`/cache atualiza alteracoes |

Shape "completo" de targets para a matriz:

```json
{
  "users": [],
  "members": [],
  "groups": ["all"]
}
```

Author completo para a matriz:

```json
{
  "name": "Raiz Educacao",
  "email": "pesquisa@raizeducacao.com.br",
  "alias": "raiz-pesquisa"
}
```

### Matriz de perfis

Depois que um payload geral aparecer, validar perfis em lote pequeno.

| Teste | Perfil/role | Usuario de validacao | Objetivo |
|---|---|---|---|
| R01 | `admin` | Projetos/admin | Confirmar visibilidade admin |
| R02 | `guardian` | responsavel real/teste | Confirmar familias |
| R03 | `student` | aluno real/teste | Confirmar alunos |
| R04 | `professor` | professor real/teste | Confirmar professor |
| R05 | `mother`/`father` | responsavel com papel especifico | Confirmar granularidade |
| R06 | multiplos roles | admin + guardian | Confirmar OR/AND da UI |

Pergunta a responder: no provider pull, roles devem estar dentro de `targets`, em campo separado, ou nao sao considerados?

Possiveis shapes para testar se necessario:

```json
{
  "targets": {
    "users": [],
    "members": [],
    "groups": ["all"],
    "roles": ["admin"]
  }
}
```

ou:

```json
{
  "targets": {
    "topics": [{ "kind": "tag", "id": "*", "name": "Todos" }],
    "roles": ["admin"]
  }
}
```

O segundo shape vem da API privada de criacao e so deve ser testado depois que o shape documentado falhar ou ficar incompleto.

### Testes de categoria

Categoria confirmada no HAR para `raizeducacao`:

```json
{
  "id": "600099cf22c83b01a046cb39",
  "name": "Geral",
  "slug": "geral",
  "default": true
}
```

Testes:

| Teste | `category` retornado | Esperado |
|---|---|---|
| C01 | ausente | Ver se UI assume default |
| C02 | `"Geral"` | Deve ser aceito |
| C03 | objeto `{ id, name }` | Ver se provider aceita objeto ou so string |
| C04 | `"Avisos"` | Deve falhar se categoria invalida for ignorada |

### Testes de imagem, anexos e flags

Esses campos aparecem no formulario nativo, mas nao sao essenciais para MVP.

| Area | Teste | Decisao MVP |
|---|---|---|
| Imagem do post | cover image ausente vs URL | nao suportar no MVP |
| Anexos | `attachments: []` vs ausente | usar `[]` |
| App Agenda | nao testar inicialmente | fora do escopo |
| Enviar notificacao | nao usar pelo provider | push/email ja cobrem alerta |
| Permitir solicitacoes | nao usar inicialmente | fora do escopo |
| Editor rico | HTML simples na descricao | permitir texto simples; HTML depois |

### Procedimento padrao para cada teste

1. Inserir ou atualizar um registro em `comunicados` com titulo unico `CONTRATO Txx - ...`.
2. Garantir `community_id = 'raizeducacao'`, `status='published'`, `approved=true`.
3. Chamar `services/call` com `version=1`.
4. Confirmar que o payload retornou o teste esperado.
5. Abrir app Comunicados na Layers.
6. Registrar se apareceu.
7. Se nao apareceu, verificar log Vercel e repetir com refresh/tempo.
8. Arquivar o teste quando terminar.

### Criterio para liberar a feature

So iniciar implementacao de Comunicados no dispatch quando estes pontos estiverem comprovados:

- Um comunicado geral por comunidade aparece visualmente.
- Categoria aceita esta definida: omitida ou `Geral`.
- Shape de `targets` aceito esta definido.
- `approved`/author/attachments minimos estao definidos.
- Comportamento de cache/latencia esta conhecido.
- `LAYERS_POSTS_SECRET` esta validado em producao.
- Casos que nao funcionam estao documentados e bloqueados na UI.
