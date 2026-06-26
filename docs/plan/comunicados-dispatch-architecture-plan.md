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
