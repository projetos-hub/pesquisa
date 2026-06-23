# Layers Comunicados API — Diagnóstico Revisado (v2)

> Pesquisado em: 2026-06-02  
> URLs consultadas: 12 páginas da documentação Layers + 3 docs internos do projeto  
> Baseado em: sitemap completo, referência técnica de prover-publicacoes, guias API Hub, schema AppMaker updateInstallation, padrão Entrada/Saída (analogia PubSub)

---

## 1. Mapa das Seções Relevantes para Comunicados

| URL | Título | O que documenta | Relevância |
|-----|--------|-----------------|-----------|
| `/content/communication/` | Suíte de Comunicação | Visão geral do módulo; confirma que só existe provider model | Alta |
| `/content/communication/comunicados/index.html` | Comunicados — Introdução | O que é o app visualizador; link para referência | Alta |
| `/content/communication/comunicados/referencia/index.html` | Referência Comunicados | Índice com única action disponível: `@layers:Posts:getUpdatedAfter` | Alta |
| `/content/communication/comunicados/referencia/prover-publicacoes.html` | Prover Publicações | **Spec técnica completa** do endpoint que você implementa | Crítica |
| `/content/api-hub/` | API Hub — Introdução | Arquitetura dos dois modelos: Request/Respond e PubSub | Alta |
| `/content/api-hub/guias/provendo-dados-action.html` | Provendo dados para uma Action | Como declarar o endpoint no manifesto (`services.responds`) | Alta |
| `/content/api-hub/guias/consumindo-actions.html` | Consumindo uma Action | `GET /v1/services/discover/` + `POST /v1/services/call/` | Média |
| `/open-api/appmaker/operations/updateInstallation.html` | PUT updateInstallation | **Schema completo** do manifesto incluindo `services.responds` com `url` | Crítica |
| `/open-api/appmaker/operations/getInstallation.html` | GET getInstallation | Schema de retorno; confirma que `services` está no manifesto | Alta |
| `/content/apps-visualizadores/entrada-e-saida/referencia/publicar-nova-entrada-ou-saida.html` | Publicar Entrada/Saída | Único exemplo de PubSub "push do ERP para Layers" — confirma que **não existe push para Comunicados** | Alta |
| `/content/communication/agenda/referencia/prover-eventos.html` | Prover Eventos (Agenda) | Padrão idêntico ao de Comunicados — payload comparativo útil | Média |

**Seções sem relevância para Comunicados:** Pagamentos, SSO/OAuth2, Data Sync, Notificações (já implementado), Portais (já implementado).

---

## 2. Diagnóstico Revisado — O que o Provider Model Realmente Envolve

### 2.1 Arquitetura confirmada

O modelo de integração de Comunicados é **exclusivamente pull (provider model)**. Não existe endpoint da Layers que você possa chamar para "criar" ou "publicar" um comunicado. O fluxo é:

```
[Usuário abre Comunicados no app Layers]
        │
        ▼
[Layers descobre providers registrados para @layers:Posts:getUpdatedAfter]
  GET https://api.layers.digital/v1/services/discover/@layers:Posts:getUpdatedAfter
  Headers: Authorization + community-id
        │
        ▼
[Para cada provider encontrado, Layers chama o endpoint registrado]
  POST https://pesquisa-nu-sand.vercel.app/api/layers/actions/posts
  Body: { limit, after, context: { issuedAt, action, community, secret } }
        │
        ▼
[Seu servidor retorna as publicações no formato Layers]
  Body: { result: [ ...publicações ] }
        │
        ▼
[Layers exibe no feed de Comunicados do usuário]
```

### 2.2 Os dois modelos do API Hub — onde Comunicados se encaixa

O API Hub tem dois modelos distintos:

| Modelo | Quem inicia | Exemplo | Comunicados usa? |
|--------|-------------|---------|-----------------|
| **Request/Respond** | Consumer (Layers) chama o Provider | Notas, Frequência, Visão Financeira, **Comunicados** | **Sim — este** |
| **Publish/Subscribe** | Publisher (ERP/app) chama a Layers | Entrada e Saída (`@layers:education:Entrance:created`) | Não |

Comunicados usa Request/Respond. O único action disponível é `@layers:Posts:getUpdatedAfter` — não existe equivalente "publish" que você possa invocar.

### 2.3 Como o registro no manifesto funciona (confirmado)

O schema do manifesto via `PUT /v1/appmaker/apps/{appId}/installations/{community}` tem o campo `services.responds`:

```json
{
  "services": {
    "enabled": true,
    "responds": [
      {
        "action": "@layers:Posts:getUpdatedAfter",
        "reason": "Prover comunicados da Raiz Educação para visualização no portal",
        "url": "https://pesquisa-nu-sand.vercel.app/api/layers/actions/posts"
      }
    ]
  }
}
```

Este é o campo exato para registrar o app como provider. Os campos são:
- `action` — string exata da action
- `reason` — descrição legível do motivo
- `url` — endpoint HTTPS do seu servidor que receberá os POSTs da Layers

**Não existe campo `secret` no schema do manifesto via API.** O secret provavelmente é configurado no AppMaker UI (painel web), não via API REST — isso precisa de verificação.

### 2.4 Payload técnico confirmado

**Recebido da Layers no seu endpoint:**

```json
{
  "limit": 10,
  "after": "2026-05-01T00:00:00.000Z",
  "context": {
    "issuedAt": "2026-06-02T14:30:00.000Z",
    "action": "@layers:Posts:getUpdatedAfter",
    "community": "uniao",
    "secret": "seu-secret-configurado-no-manifesto"
  }
}
```

**Retornado pelo seu endpoint para a Layers:**

```json
{
  "result": [
    {
      "id": "comunicado-001",
      "title": "Pesquisa de Satisfação — Colégio União 2026",
      "description": "A pesquisa anual de satisfação já está disponível. Sua opinião é muito importante para melhorarmos nossos serviços. Leva menos de 5 minutos.",
      "createdAt": "2026-06-01T09:00:00.000Z",
      "updatedAt": "2026-06-01T09:00:00.000Z",
      "category": "Geral",
      "targets": {
        "users": [],
        "members": [],
        "groups": ["all"]
      },
      "author": {
        "name": "Raiz Educação",
        "email": "pesquisa@raizeducacao.com.br",
        "alias": "raiz-pesquisa"
      },
      "attachments": [],
      "approved": true
    }
  ]
}
```

**Campos obrigatórios:** `id`, `title`, `description`, `createdAt`, `updatedAt`, `targets`  
**Campos opcionais:** `category`, `author`, `attachments`, `approved`

### 2.5 Constraint crítica confirmada sobre categorias

A documentação confirma explicitamente:

> "Publicações com categorias não pré-definidas pela comunidade não serão sincronizadas."

Isso significa que `category` é **lookup, não livre**. O valor deve corresponder exatamente a uma categoria cadastrada no painel admin da comunidade. Se não houver correspondência, a publicação é silenciosamente ignorada.

**Opção segura:** omitir o campo `category` completamente. O comportamento sem categoria não está explicitamente documentado como "rejeição" — apenas que categorias inválidas causam falha de sync.

---

## 3. Alternativas Mapeadas

Todas as formas possíveis de fazer comunicados aparecerem no feed Layers:

### Alternativa A: Provider Model (pull) — ÚNICO CAMINHO CONFIRMADO

Você implementa `POST /api/layers/actions/posts` e declara no manifesto. A Layers puxa quando o usuário abre o feed.

- **Status:** Documentado, confirmado pela Layers
- **Prós:** Suporte nativo do app Comunicados, histórico navegável, conteúdo rico
- **Contras:** Requer registro no manifesto (via AppMaker UI ou API), categorias precisam estar pré-cadastradas

### Alternativa B: PubSub Publish — NÃO EXISTE para Comunicados

O padrão PubSub (onde o ERP publica e a Layers distribui) existe para Entrada e Saída (`@layers:education:Entrance:created`). **Não há equivalente documentado para Comunicados/Posts.** Não existe action `@layers:Posts:created` ou similar.

### Alternativa C: Notificação Push (já implementado) — complementar

`POST /v2/notification/send` — push notification com deeplink para o portal da pesquisa. Já funciona em produção. Não cria entrada no feed de Comunicados, mas alerta o usuário.

**Recomendação de combinação:** Notificação push (alerta efêmero, imediato) + Comunicado via provider model (registro persistente no feed). São complementares, não excludentes.

### Alternativa D: Criar comunicado via painel Layers — fora do escopo de API

Administratores podem criar comunicados manualmente pelo painel Layers. Não é programático. Inviável para automação.

### Alternativa E: Data Sync — não aplicável

Data Sync sincroniza Users, Members, Groups e Components. Não existe sync de Posts/Publicações.

---

## 4. Respostas às Perguntas Bloqueantes

### P1: Como registrar o app como provider de Posts no AppMaker?

**Resposta: Via campo `services.responds` no manifesto.**

Usar a API AppMaker:

```bash
PUT https://api.layers.digital/v1/appmaker/apps/m3jzq5s00b/installations/{community}
Authorization: Bearer {LAYERS_API_TOKEN}
community-id: {community}

{
  "services": {
    "enabled": true,
    "responds": [
      {
        "action": "@layers:Posts:getUpdatedAfter",
        "reason": "Prover comunicados e anúncios de pesquisas da Raiz Educação",
        "url": "https://pesquisa-nu-sand.vercel.app/api/layers/actions/posts"
      }
    ]
  }
}
```

**Pendência restante:** Verificar se fazer o PUT de `services.responds` sobrescreve outras configurações existentes do manifesto (portals, api, etc.) ou se faz merge. O safe approach é fazer GET primeiro, copiar o manifesto atual, adicionar `services.responds`, e fazer PUT completo.

**Pendência sobre secret:** O schema do manifesto via API não expõe campo `secret` para `services.responds`. O secret pode ser configurável apenas via AppMaker UI. Verificar com suporte.

---

### P2: Como funciona o campo `category`? É pré-cadastrado ou livre?

**Resposta: Pré-cadastrado na comunidade, não livre.**

A documentação confirma: publicações com categorias não pré-cadastradas não são sincronizadas (silenciosamente ignoradas).

**Recomendação imediata:** Para a primeira implementação, omitir o campo `category` ou usar `"Geral"` (mais provável de já existir). Confirmar com gestor de cada escola quais categorias estão cadastradas.

**Alternativa de mitigação:** Criar um endpoint de diagnóstico que retorne publicações sem `category` para mapear o que a Layers aceita em cada comunidade durante os testes iniciais.

---

### P3: O token `auth:app` funciona para validar chamadas recebidas da Layers?

**Resposta parcialmente confirmada: NÃO — são mecanismos diferentes.**

- **Para você chamar a Layers:** usa `LAYERS_API_TOKEN` (Bearer token `auth:app`) — já funciona
- **Para validar chamadas recebidas da Layers no seu endpoint:** a Layers envia `context.secret` no body do POST. Você valida `context.secret === process.env.LAYERS_WEBHOOK_SECRET`

São dois mecanismos independentes:
- `LAYERS_API_TOKEN` = credencial do app para chamar APIs da Layers
- `LAYERS_WEBHOOK_SECRET` = segredo compartilhado para validar que uma requisição veio de fato da Layers

**Pendência:** O valor exato do `context.secret` que a Layers usa precisa ser configurado no manifesto. Não está claro se isso é feito via API (não aparece no schema) ou via AppMaker UI.

---

### P4: Existe alguma forma de a Raiz PUBLICAR um comunicado via API (push, não pull)?

**Resposta: NÃO. Não existe.**

A documentação completa do sitemap (192 páginas) não contém nenhum endpoint da Layers para criar/publicar comunicados via chamada externa. O único padrão documentado para Comunicados é pull (provider model).

O padrão PubSub (onde o ERP publica) existe apenas para Entrada e Saída. Para comunicados, o modelo é exclusivamente pull.

**Implicação prática:** A Raiz não pode "disparar" um comunicado quando quiser. O comunicado só aparece quando o usuário abre o app Comunicados e a Layers faz a consulta. Para alertar o usuário, usar Notificação push (já implementado).

---

### P5: Qual é o modelo exato de segurança das Actions recebidas?

**Resposta: secret no body (não header).**

A Layers autentica as chamadas que faz para o seu endpoint enviando um `secret` dentro do objeto `context` no body do POST:

```json
{
  "context": {
    "secret": "valor-configurado-no-manifesto"
  }
}
```

**NÃO é via header Authorization** — é via campo no body.

Implementação recomendada no endpoint:

```typescript
// src/app/api/layers/actions/posts/route.ts
export async function POST(request: Request) {
  const body = await request.json()
  
  // Validar autenticidade
  if (body.context?.secret !== process.env.LAYERS_WEBHOOK_SECRET) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }
  
  // Processar
  const { limit, after, context } = body
  const communityId = context.community
  
  // ... buscar publicações no Supabase ...
  
  return Response.json({ result: publicacoes })
}
```

---

## 5. Plano de Ação Revisado

### Fase 0: Pré-requisitos (1-2h) — ANTES de qualquer código

| Tarefa | Detalhe | Blocker? |
|--------|---------|---------|
| **0.1** GET getInstallation da comunidade `raizeducacao` | Verificar estado atual do manifesto, especialmente `services` | Não |
| **0.2** GET getInstallation da comunidade `uniao` | Idem para a segunda comunidade ativa | Não |
| **0.3** Confirmar com AppMaker UI se `secret` é configurável | Entrar no AppMaker → Meus Apps → Pesquisa → Manifesto → verificar se há campo de secret para services | Sim — sem secret, não tem como validar autenticidade |
| **0.4** Confirmar categorias de comunicados em cada escola | Perguntar ao gestor ou verificar no painel Layers de cada comunidade | Médio — pode usar sem category no início |

### Fase 1: Criar endpoint provider (2-3h)

| Tarefa | Arquivo | Detalhe |
|--------|---------|---------|
| **1.1** Criar route handler | `src/app/api/layers/actions/posts/route.ts` | POST handler, validar secret, buscar pesquisas ativas do Supabase, formatar como publicações |
| **1.2** Adicionar env var | `.env.local` | `LAYERS_WEBHOOK_SECRET=valor-a-definir` |
| **1.3** Implementar query Supabase | Dentro do handler | `SELECT * FROM surveys WHERE active = true AND community_id = $1` com filtro por `after` |
| **1.4** Formatar resposta | Dentro do handler | Mapear survey para objeto de publicação Layers |

### Fase 2: Registrar no manifesto (30min)

| Tarefa | Detalhe |
|--------|---------|
| **2.1** GET do manifesto atual de cada comunidade | Para não sobrescrever configurações existentes |
| **2.2** PUT para adicionar `services.responds` | Para comunidade `raizeducacao` e `uniao` separadamente |
| **2.3** Verificar no app Layers se comunicado aparece | Abrir o app Comunicados logado como usuário da comunidade |

### Fase 3: Testes e ajuste de categorias (1h)

| Tarefa | Detalhe |
|--------|---------|
| **3.1** Testar sem `category` | Verificar se publicação aparece no feed |
| **3.2** Se sim, confirmar quais categorias estão cadastradas | Via painel ou perguntando ao gestor |
| **3.3** Adicionar `category` às publicações | Atualizar mapeamento no handler |

### Fase 4: Notificação + Comunicado (30min, já está pronto)

A notificação push já está implementada. Combinar: ao disparar pesquisa, enviar push notification E registrar a pesquisa no Supabase de forma que apareça no feed de Comunicados.

**Esforço total estimado:** 1 dia de desenvolvimento (excluindo Fase 0 que depende de acesso ao AppMaker e confirmação de secret).

---

## 6. Blockers Reais vs. Blockers Já Respondidos

### Blockers RESOLVIDOS pelo sitemap:

| Blocker anterior | Status | Resolução |
|-----------------|--------|-----------|
| Campos exatos do manifesto para declarar action provider | RESOLVIDO | `services.responds[].action`, `url`, `reason` via `PUT /v1/appmaker/apps/{appId}/installations/{community}` |
| Token `auth:app` é suficiente para registrar como provider? | RESOLVIDO | Sim para chamar a AppMaker API; para validar chamadas recebidas usa `context.secret`, não o token |
| Existe forma de publicar via push? | RESOLVIDO | Não existe. Apenas pull (provider model) |
| Arquitetura exata do provider model | RESOLVIDO | Request/Respond, Layers chama periodicamente quando usuário abre o feed |

### Blockers REAIS que ainda precisam de confirmação:

| Blocker | Impacto | Como resolver |
|---------|---------|---------------|
| **Secret do manifesto:** onde configurar o `context.secret` que a Layers enviará | BLOQUEANTE — sem isso não tem como validar autenticidade das chamadas | AppMaker UI: verificar manualmente se há campo de secret ao registrar action respond. Ou perguntar ao suporte Layers |
| **PUT parcial vs. completo:** o `PUT updateInstallation` substitui todo o manifesto ou faz merge? | Alto — risco de sobrescrever `portals` (embed já funcionando) | GET o manifesto atual, incluir todos os campos no PUT. Safe por padrão |
| **Categorias:** quais estão cadastradas em cada comunidade? | Médio — publicações sem categoria provavelmente funcionam; confirmar | Verificar no painel Layers de cada comunidade. Alternativa: omitir `category` na primeira versão |
| **Frequência de pull:** com que periodicidade a Layers chama `getUpdatedAfter`? | Baixo — afeta apenas latência de aparecimento do comunicado | Não documentado. Perguntar ao suporte. Provavelmente: só quando usuário abre o app |

### Pergunta mínima para o suporte Layers:

> "Para registrar nosso app como provider de `@layers:Posts:getUpdatedAfter`, fizemos PUT do manifesto com `services.responds`. Precisamos de dois esclarecimentos: (1) o campo `secret` que queremos enviar no `context.secret` para autenticar chamadas — onde isso é configurado? No PUT do manifesto ou no AppMaker UI? (2) O PUT em `/v1/appmaker/apps/{appId}/installations/{community}` sobrescreve todo o manifesto ou faz merge dos campos enviados?"

---

## 7. Recomendação de Abordagem

### Caminho recomendado: Provider Model com notificação push complementar

Não existe alternativa — é o único caminho documentado. A questão é como implementar bem.

**Estratégia de implementação:**

1. **Não bloquear no secret ainda:** Criar o endpoint sem validação de secret inicialmente (retornar HTTP 200 sem verificar). Isso permite testar o fluxo completo enquanto o secret é confirmado. Adicionar validação depois.

2. **Começar sem `category`:** Omitir o campo para evitar o problema de categorias não cadastradas. Adicionar depois quando confirmar quais existem.

3. **Usar `approved: true`:** Para publicação imediata sem necessidade de aprovação manual.

4. **Combinar com notificação push:** O comunicado fica no feed (persistente, navegável). A notificação push alerta o usuário quando a pesquisa é disparada. São complementares.

5. **GET antes do PUT:** Sempre buscar o manifesto atual antes de atualizar para não perder configurações existentes (portals do embed, etc.).

**Sequência de execução segura:**

```
Pré-requisito: GET /v1/appmaker/apps/m3jzq5s00b/installations/raizeducacao
                → Copiar manifesto atual
                → Adicionar services.responds
                → PUT com manifesto completo
Implementar:    POST /api/layers/actions/posts (sem secret validation)
Testar:         Abrir Comunicados no app Layers com usuário da comunidade
                → Verificar se comunicados aparecem
Refinar:        Adicionar secret validation + categories
```

---

## 8. Referências

| Documento | URL |
|-----------|-----|
| Prover Publicações (spec técnica) | https://developers.layers.education/content/communication/comunicados/referencia/prover-publicacoes.html |
| Provendo dados para uma Action | https://developers.layers.education/content/api-hub/guias/provendo-dados-action.html |
| PUT updateInstallation (manifesto) | https://developers.layers.education/open-api/appmaker/operations/updateInstallation.html |
| GET getInstallation | https://developers.layers.education/open-api/appmaker/operations/getInstallation.html |
| API Hub — Introdução | https://developers.layers.education/content/api-hub/ |
| Suíte de Comunicação | https://developers.layers.education/content/communication/ |
| Prover Eventos — Agenda (padrão comparativo) | https://developers.layers.education/content/communication/agenda/referencia/prover-eventos.html |
| Publicar Entrada/Saída (padrão PubSub para comparação) | https://developers.layers.education/content/apps-visualizadores/entrada-e-saida/referencia/publicar-nova-entrada-ou-saida.html |
| Diagnóstico anterior (v1) | `docs/layers-comunicados-api.md` |
| Layers API Hub — Notificações (já implementado) | `docs/layers-notifications.md` |
| Layers Hub API — dados de usuários | `docs/layers-api.md` |
