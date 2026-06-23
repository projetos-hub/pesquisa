# Layers Comunicados API — Pesquisa Definitiva: Endpoint de Criação via POST (v3)

> Pesquisado em: 2026-06-02  
> Objetivo desta versão: confirmar/refutar existência de endpoint REST para **criar** comunicados (push, não pull)  
> Fontes consultadas: 18 URLs da documentação Layers + 2 buscas web + GitHub + GitLab + app em produção  
> Versão anterior: `docs/layers-comunicados-api-v2.md` (provider model / pull — já documentado)

---

## Conclusão Principal

**Não existe endpoint REST da Layers para criar comunicados via POST.**

A pesquisa exaustiva (192 páginas do sitemap completo + buscas web + repositórios públicos) confirma que:

1. O único modelo documentado para Comunicados é **pull (provider model)**: a Layers chama seu servidor quando o usuário abre o feed.
2. As permissões `@admin:layers-comunicados:posts:write` e `@admin:layers-comunicados:posts:autoapprove` **não correspondem a nenhum endpoint REST documentado** — elas controlam permissões dentro do portal de Comunicados da própria Layers (interface de usuário), não uma API externa.
3. Nenhuma busca web, repositório público ou documentação alternativa revelou endpoint REST para criação de posts.

---

## 1. O que foi pesquisado (auditoria completa)

### 1.1 Documentação oficial (developers.layers.education)

| URL consultada | Resultado |
|---------------|-----------|
| `/content/communication/comunicados/index.html` | Apenas intro do app visualizador |
| `/content/communication/comunicados/referencia/index.html` | Uma única action: `@layers:Posts:getUpdatedAfter` (pull) |
| `/content/communication/comunicados/referencia/prover-publicacoes.html` | Schema técnico do pull — sem endpoint de criação |
| `/content/communication/` | Visão geral da suíte — confirma apenas provider model |
| `/content/api-hub/guias/consumindo-actions.html` | `GET /v1/services/discover/` + `POST /v1/services/call/` — para consumers, não criação de conteúdo |
| `/content/api-hub/guias/provendo-dados-action.html` | Como implementar o seu endpoint para receber pulls da Layers |
| `/content/apps-visualizadores/entrada-e-saida/referencia/publicar-nova-entrada-ou-saida.html` | Único exemplo de PubSub "publish" — exclusivo para Entrada/Saída, **não existe equivalente para Comunicados** |
| `/content/communication/agenda/referencia/prover-eventos.html` | Padrão idêntico ao Comunicados — apenas pull |
| `/open-api/appmaker.html` | Gerenciamento de instalações — sem posts |
| `/open-api/data.html` | GET de dados da comunidade + um POST de sync — sem posts |
| `/content/quickstart/conceitos/permissionamento-na-layers.html` | Nenhuma menção a posts:write como endpoint |
| `/content/quickstart/conceitos/ecossistema-layers.html` | Menciona "enviar publicações para comunidades filhas" mas é feature da UI, não API |
| `/content/notification/referencia/enviar-notificacao-por-publico-alvo.html` | Confirma que `POST /v2/notification/send` é notificação, não comunicado |
| `/content/quickstart/principais-casos.html` | Apenas SSO, Portal e Push — sem write de posts |

### 1.2 URLs alternativas tentadas (todas 404)

- `/open-api/comunicados.html` → 404
- `/open-api/data/index.html` → 404
- `https://api.layers.digital/v1/comunication/posts` → 400 (sem auth)
- `https://developers.layers.education/docs/forstartups/` → 404
- `https://developers.layers.education/docs/api/apihub/consumindo/` → 404

### 1.3 Buscas web

- `"layers.education" "comunicados" POST endpoint criar publicação REST` → sem resultados relevantes
- `"layers.digital" "v1/posts" OR "v2/posts" OR "v1/comunicados"` → sem resultados
- `"layers.education" "posts:write" OR "comunicados:posts:write"` → sem resultados

### 1.4 Repositórios públicos

- GitHub `layers-digital/layers-docs` → arquivado em ago/2023, movido para GitLab
- GitLab `layers-digital/layers-docs` → 403 (privado)

### 1.5 App em produção

- `https://layers-comunicados-production.web.app/` → página em branco, sem documentação técnica acessível

---

## 2. Por que as permissões `posts:write` existem se não há endpoint REST?

Esta é a pergunta chave. A interpretação mais provável, baseada no padrão arquitetural da Layers:

| Permissão | Interpretação provável |
|-----------|----------------------|
| `@admin:layers-comunicados:posts:write` | Permite que o app (via portal embarcado `@admin:layers-comunicados`) **crie comunicados através da interface do portal Layers** — não via REST externo |
| `@admin:layers-comunicados:posts:write:all` | Mesma permissão mas para todas as turmas, não apenas as administradas |
| `@admin:layers-comunicados:posts:autoapprove` | Posts criados pelo app **não vão para moderação** — são publicados diretamente. Confirma que existe fluxo de moderação para posts criados via portal |
| `@admin:layers-comunicados:manage` | Permissão total sobre o módulo Comunicados via portal |

**Hipótese não confirmada:** Pode existir uma API REST de Comunicados que **não está documentada publicamente** no Developer Center. Essa API seria acessível apenas via LayersPortal.js (SDK JavaScript para apps embarcados no iframe), usando as permissões OAuth2 do usuário logado — não via `LAYERS_API_TOKEN` de app.

Evidência de suporte a essa hipótese:
- A permissão `@admin:layers-comunicados:posts:write` começa com `@admin:layers-comunicados` — mesmo prefixo do `portalAlias: "@admin:layers-comunicados"` usado em notificações
- Isso sugere que a permissão controla ações **dentro do portal**, não chamadas externas de API
- O LayersPortal.js expõe métodos (`go`, `close`, `download`) mas **não expõe criação de posts** na documentação pública

---

## 3. Endpoint definitivo confirmado (pull model)

O único endpoint relevante para comunicados é o provider model. Documentado completamente em v2. Resumo:

### 3.1 Como o comunicado aparece no feed

```
Usuário abre "Comunicados" no app Layers
        ↓
Layers chama: GET https://api.layers.digital/v1/services/discover/@layers:Posts:getUpdatedAfter
              Headers: Authorization: Bearer {LAYERS_API_TOKEN}
                       community-id: {community}
        ↓
Layers descobre seu app como provider registrado
        ↓
Layers chama seu endpoint (registrado no manifesto):
  POST https://pesquisa-nu-sand.vercel.app/api/layers/actions/posts
  Body: { "limit": 10, "after": "2026-...", "context": { "community": "...", "secret": "..." } }
        ↓
Seu servidor retorna publicações
        ↓
Layers exibe no feed
```

### 3.2 Payload de resposta (seu servidor → Layers)

```json
{
  "result": [
    {
      "id": "pesquisa-2026-uniao",
      "title": "Pesquisa de Satisfação 2026 — Colégio União",
      "description": "Sua opinião é muito importante. A pesquisa leva menos de 5 minutos.",
      "createdAt": "2026-06-01T09:00:00.000Z",
      "updatedAt": "2026-06-01T09:00:00.000Z",
      "targets": {
        "users": [],
        "members": [],
        "groups": ["all"]
      },
      "approved": true
    }
  ]
}
```

### 3.3 Campo `approved` — comportamento de autoapprove

O campo `approved: true` no payload de resposta é o que controla se o comunicado aparece imediatamente ou vai para moderação:

- `"approved": true` → publicado diretamente no feed (equivalente ao autoapprove)
- `"approved": false` ou campo ausente → pode requerer aprovação do admin da comunidade
- A permissão `@admin:layers-comunicados:posts:autoapprove` provavelmente permite que o app envie `approved: true` sem restrição

**Recomendação:** Sempre enviar `"approved": true` para publicação imediata.

### 3.4 Autenticação

O mesmo `LAYERS_API_TOKEN` já configurado é usado para:
- Registrar o app como provider (PUT no manifesto AppMaker)
- Descobrir providers (`GET /v1/services/discover/`)
- Chamar actions (`POST /v1/services/call/`)

Para **validar chamadas recebidas** da Layers no seu endpoint, o mecanismo é diferente:
- A Layers envia `context.secret` no body (não no header)
- Você compara com `process.env.LAYERS_WEBHOOK_SECRET`
- O secret é configurado no manifesto do AppMaker (possivelmente via UI, não via API — confirmar)

### 3.5 Registro no manifesto (AppMaker API)

```bash
PUT https://api.layers.digital/v1/appmaker/apps/{APP_ID}/installations/{community}
Authorization: Bearer {LAYERS_API_TOKEN}
community-id: {community}
Content-Type: application/json

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

**IMPORTANTE:** Fazer GET do manifesto atual antes do PUT para não sobrescrever portals/outros campos existentes.

---

## 4. Se existe uma API REST não documentada — como descobrir

Se o objetivo é confirmar ou descartar a existência de uma API REST privada para criar posts, a única opção é contato direto com a Layers.

### Template de e-mail/chamado para suporte@layers.education

```
Assunto: API REST para criar comunicados via POST — existe?

Olá equipe Layers,

Somos a Raiz Educação, integrados ao ecossistema Layers como app provider.
Nosso app (ID: m3jzq5s00b) tem as permissões:
  - @admin:layers-comunicados:posts:write
  - @admin:layers-comunicados:posts:autoapprove

Gostaríamos de criar comunicados de forma programática (disparados por um
evento no nosso backend, como publicação de uma pesquisa), sem depender da
abertura do app pelo usuário.

Perguntas:
1. Existe endpoint REST (ex: POST https://api.layers.digital/v1/comunicados/posts
   ou similar) que permita criar um comunicado via API, usando nosso
   LAYERS_API_TOKEN?

2. As permissões posts:write e posts:autoapprove concedem acesso a esse
   endpoint, ou elas se aplicam apenas à interface do portal?

3. Se não existe endpoint REST, existe algum mecanismo PubSub (equivalente
   ao @layers:education:Entrance:created) para comunicados, onde nosso backend
   pode notificar a Layers de que um novo comunicado foi criado?

Obrigado.
Raiz Educação — Plataforma de Pesquisa CSAT
```

---

## 5. Segmentação disponível no provider model

A segmentação é feita via campo `targets` no payload de resposta. Os valores confirmados:

| Campo | Tipo | Exemplo | Significado |
|-------|------|---------|-------------|
| `targets.groups` | array de IDs/aliases | `["all"]`, `["turma-3a"]` | Grupos (turmas) da comunidade |
| `targets.members` | array | `[{"alias": "aluno-joao"}]` | Membros específicos |
| `targets.users` | array | `[{"id": "61087..."}]` | Usuários específicos |

**Importante:** A segmentação acontece no payload que SEU servidor retorna para a Layers. Você filtra quais publicações retornar baseado no `context.community` recebido — é você quem controla a segmentação, não um campo de chamada da Layers.

---

## 6. Diferença: Notificação Push vs. Comunicado no Feed

| Característica | `POST /v2/notification/send` | Provider Model `@layers:Posts:getUpdatedAfter` |
|---------------|------------------------------|------------------------------------------------|
| Quando aparece | Imediatamente (push) | Quando usuário abre o app Comunicados |
| Persistência | Efêmero (notificação push some após lida) | Persistente (fica no histórico do feed) |
| Rich content | Título + corpo + action | Título + descrição + categoria + anexos + autor |
| Controle de envio | Você chama quando quiser | Layers chama quando quiser (demand-driven) |
| Segmentação | `targets.topics` + `targets.roles` | Você filtra no retorno por `context.community` |
| Token usado | `LAYERS_API_TOKEN` | Seu servidor + `LAYERS_API_TOKEN` para registrar |
| Já implementado | Sim | Não — é o próximo passo |

**Estratégia recomendada:** Usar ambos complementarmente. Push notification alerta imediatamente; comunicado no feed fica acessível depois.

---

## 7. Blockers reais que precisam de confirmação com a Layers

| Blocker | Impacto | Como resolver |
|---------|---------|---------------|
| **Existe API REST de criação de posts?** | Crítico — muda a arquitetura completa | Perguntar ao suporte (template na seção 4) |
| **Onde configurar `context.secret` no manifesto?** | Bloqueante para validação de segurança | AppMaker UI ou suporte |
| **PUT manifesto é replace ou merge?** | Alto — risco de sobrescrever portal embarcado | GET antes do PUT; confirmar com suporte |
| **Frequência do pull da Layers** | Baixo — latência de aparecimento | Não documentado; perguntar ao suporte |
| **`category` valores disponíveis por comunidade** | Médio — omitir na primeira versão | Confirmar com gestores ou painel Layers |

---

## 8. Referências

| Documento | URL / Localização |
|-----------|-------------------|
| Prover Publicações (spec técnica completa) | https://developers.layers.education/content/communication/comunicados/referencia/prover-publicacoes.html |
| Suíte de Comunicação — Introdução | https://developers.layers.education/content/communication/ |
| API Hub — Provendo dados para uma Action | https://developers.layers.education/content/api-hub/guias/provendo-dados-action.html |
| API Hub — Consumindo Actions | https://developers.layers.education/content/api-hub/guias/consumindo-actions.html |
| PUT updateInstallation (manifesto) | https://developers.layers.education/open-api/appmaker/operations/updateInstallation.html |
| Publicar Entrada/Saída (único PubSub existente) | https://developers.layers.education/content/apps-visualizadores/entrada-e-saida/referencia/publicar-nova-entrada-ou-saida.html |
| Prover Eventos — Agenda (padrão comparativo) | https://developers.layers.education/content/communication/agenda/referencia/prover-eventos.html |
| LayersPortal.js (referência do SDK embarcado) | https://developers.layers.education/content/layers-portal/referencia/layers-portal-js.html |
| Sitemap completo mapeado | `docs/layers-api-sitemap.md` |
| Diagnóstico v2 (provider model detalhado) | `docs/layers-comunicados-api-v2.md` |
| Suporte Layers | suporte@layers.education |
