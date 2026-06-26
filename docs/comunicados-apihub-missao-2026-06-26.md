# Missao Comunicados via API Hub Layers - 2026-06-26

## Objetivo

Expandir os canais de divulgacao das pesquisas para alem de email e push, usando tambem o modulo Comunicados do app Layers. A motivacao de produto e aumentar adesao: push/email funcionam como alerta imediato; Comunicados deve funcionar como historico persistente dentro do app.

## Estado atual

Ha dois caminhos investigados:

1. Provider/pull documentado pela Layers: `@layers:Posts:getUpdatedAfter`.
2. API privada usada pela interface oficial de Comunicados: `https://comunicados-api.layers.digital/api/v1/post`.

O caminho operacionalmente mais correto agora e o primeiro: API Hub com action `@layers:Posts:getUpdatedAfter`. O caminho da API privada foi util para entender o produto, mas nao deve ser tratado como integracao server-side estavel.

## Implementacao existente no projeto

- Endpoint provider: `survey-platform/app/api/layers/actions/posts/route.ts`
- Tabela de comunicados: `survey-platform/supabase/migrations/029_comunicados.sql`
- RLS/hardening: `survey-platform/supabase/migrations/20260622210319_harden_comunicados_and_cron_rpc.sql`
- Rota temporaria de teste de portal: `survey-platform/app/(respondente)/portal/comunicados-test/page.tsx`
- Manifesto de referencia: `docs/layers-appmaker-manifest-apihub-2026-06-26.json`

Commits da rota temporaria:

- `8a39f1b` - `test(portal): adiciona rota de teste de comunicados Layers`
- `d28de6a` - `test(portal): envia parametros alternativos de sessao Layers`

## Manifesto AppMaker mais recente

Referencia salva em:

```text
docs/layers-appmaker-manifest-apihub-2026-06-26.json
```

Pontos importantes:

- App: `Pesquisa`
- App id usado na UI/API Hub: `m3jzq5s00b`
- Portal principal: `@raizeducacao:pesquisa`
- Portal temporario de teste: `@raizeducacao:m3jzq5s00b`
- API Hub habilitado.
- Respond configurado:
  - action: `@layers:Posts:getUpdatedAfter`
  - URL: `https://pesquisa-nu-sand.vercel.app/api/layers/actions/posts`
  - autenticacao: `Secret`
- Request configurado:
  - action: `@layers:Posts:getUpdatedAfter`

Atencao: o secret mostrado no AppMaker autentica chamadas da Layers ao nosso endpoint e nao deve ser salvo no repositorio. Se for usado no app, deve ir para env var de producao, por exemplo `LAYERS_POSTS_SECRET`.

## Resultado dos testes

### Provider local/producao

O endpoint de provider em producao responde quando chamado diretamente:

```text
POST https://pesquisa-nu-sand.vercel.app/api/layers/actions/posts
```

Com `context.community = "raizeducacao"`, retornou comunicados publicados da tabela `comunicados`. Um comunicado de teste geral foi criado com `targets.groups = ["all"]` e apareceu no payload que a Layers receberia.

### AppMaker/API Hub

Antes de habilitar API Hub, discovery retornava:

```text
400 - This app cannot use services feature
```

Depois que a secao API Hub apareceu na UI, discovery passou a retornar `200` e listou providers para a action:

```json
[
  {
    "id": "gestao-da-inadimplencia-raiz",
    "displayName": "Gestao de comunicados",
    "versions": [1]
  },
  {
    "id": "m3jzq5s00b",
    "displayName": "Pesquisa",
    "versions": []
  }
]
```

Esse resultado confirmou que a feature de Services/API Hub foi ativada e que o app Pesquisa aparecia como provider da action, mas ainda sem versao chamavel.

Chamadas testadas:

- `POST /v1/services/call/@layers:Posts:getUpdatedAfter/m3jzq5s00b?version=1` retornou `404 provider`.
- Sem `version`, retornou `400 Missing or invalid version: NaN`.
- Com `version=0`, retornou `400 Missing or invalid version: 0`.
- Chamando outro provider (`gestao-da-inadimplencia-raiz`) com `version=1`, a API respondeu que o provider falhou ao responder.

Conclusao naquele momento: o API Hub estava ativo, mas a publicacao/versionamento do nosso `respond` ainda nao estava em estado chamavel via `services/call`.

### API Hub operacional apos propagacao

Apos gerar/rotacionar o secret do Respond no AppMaker e aguardar propagacao, o discovery passou a retornar o provider `Pesquisa` com versao:

```json
[
  {
    "id": "gestao-da-inadimplencia-raiz",
    "displayName": "Gestao de comunicados",
    "versions": [1]
  },
  {
    "id": "m3jzq5s00b",
    "displayName": "Pesquisa",
    "versions": [1]
  }
]
```

O call tambem passou:

```text
POST /v1/services/call/@layers:Posts:getUpdatedAfter/m3jzq5s00b?version=1
```

Resposta confirmada:

- `context.version = 1`
- `context.community = "raizeducacao"`
- `data.result` retornou os comunicados publicados da tabela `comunicados`

Comunicados retornados no teste:

- `TESTE - Comunicado da Pesquisa Raiz` com `targets.groups = ["all"]`
- `Teste de Comunicado via API` com `targets.users = ["6377844ce70782001c8b06fc"]`

Esse teste prova que o API Hub consegue chamar nosso provider e receber publicacoes. Ainda falta validar a exibicao visual dentro do app Comunicados da Layers, porque `services/call` valida o contrato API Hub, mas nao prova todos os filtros/caches da interface final.

## Arquitetura operacional

Fluxo esperado:

```text
Usuario abre Comunicados na Layers
  -> Layers/API Hub chama o Respond @layers:Posts:getUpdatedAfter
  -> POST https://pesquisa-nu-sand.vercel.app/api/layers/actions/posts
  -> Vercel executa a route handler Next.js
  -> Route consulta Supabase tabela comunicados
  -> Vercel devolve JSON para a Layers
  -> Layers exibe no modulo Comunicados, se targets/categoria/cache permitirem
```

Responsabilidades:

- Vercel: recebe as requisicoes da Layers, executa a API route e formata o payload.
- Supabase: persiste os comunicados e responde a consulta feita pela route.
- Layers/API Hub: descobre providers, chama nossa route e exibe os posts no produto final.

O Supabase nao recebe chamada direta da Layers. Ele e dependencia interna do nosso endpoint no Vercel.

## Riscos e limitacoes da estrutura atual

| Risco | Impacto | Mitigacao |
|---|---|---|
| Endpoint ainda sem validacao de secret | Qualquer cliente que conheca a URL pode consultar comunicados publicados por `community` | Implementar `LAYERS_POSTS_SECRET` antes de producao real |
| Service role no endpoint | Se houver bug no filtro, a route pode ler dados alem do esperado | Manter query estrita por `community_id`, `status='published'`, `approved=true`; adicionar testes |
| Disponibilidade Vercel | Se Vercel estiver fora, Comunicados nao carrega nossos posts | Monitorar `/api/health`; logs e alertas de 5xx |
| Disponibilidade Supabase | Se Supabase falhar, provider retorna erro interno | Logs estruturados e fallback vazio apenas se produto aceitar; hoje retorna 500 |
| Cache/propagacao Layers | Posts podem demorar ou nao aparecer imediatamente na UI mesmo com API OK | Validar no app real e registrar comportamento observado |
| Target/categoria aceitos pela Layers | `groups:["all"]` ou `users:[...]` podem ser filtrados diferente na UI | Testar com usuario real de `raizeducacao` e depois com escola/unidade especifica |
| Volume de chamadas | Se a Layers chamar o provider a cada abertura, pode aumentar leituras Supabase | Query indexada por `community_id/status/updated_at`; limitar payload e monitorar |
| Volume de comunicados | Feed pode crescer e cada call precisa filtrar por `after` e `limit` | Respeitar `after`/`limit`; arquivar comunicados antigos quando fizer sentido |
| Rota temporaria de teste | Superficie desnecessaria apos validacao | Remover/esconder `/portal/comunicados-test` |
| HAR sensivel | Exposicao de contexto de sessao se versionado | Manter `docs/app.layers.education.criacaocomunicado.har` fora do git |

### API privada de Comunicados

O HAR de criacao manual mostrou uma API privada:

```text
POST https://comunicados-api.layers.digital/api/v1/post?community=raizeducacao&userId=...
```

Payload observado:

- `kind`
- `title`
- `description` em HTML
- `category`
- `targets`
- `allowTickets`
- `notifyChannels`
- `draftId`

Tentativas de reproduzir essa API fora do portal oficial de Comunicados falharam com:

```text
400 - session | community | userId not provided in query params
```

Isso aconteceu mesmo com sessao encaminhada pelo nosso portal. O JWT recebido pelo nosso portal tinha `portalAlias` do app Pesquisa, nao do app oficial `@admin:layers-comunicados`. Conclusao: essa API provavelmente depende do contexto interno do portal oficial de Comunicados e nao deve ser usada como base da automacao server-side.

O arquivo HAR usado na investigacao e sensivel e esta fora do versionamento:

```text
docs/app.layers.education.criacaocomunicado.har
```

Nao commitar esse arquivo.

## AppMaker API GET/PUT

Observacoes:

- `.env.local` contem `NEXT_PUBLIC_LAYERS_APP_ID=m3jzq5s00braiz@2026`; manter como esta por enquanto.
- Para consulta de instalacao, o id historico `m3jzq5s00b` funcionou:
  - `GET /v1/appmaker/apps/m3jzq5s00b/installations/raizeducacao`
- A resposta veio resumida e nao trouxe o manifesto completo da UI.
- `GET /v1/appmaker/apps/m3jzq5s00b` com token de app retornou `401`, indicando que a rota provavelmente exige contexto de usuario.
- Tentativas de `PUT` com manifesto completo falharam com `400 InvalidParameter`.

Conclusao: a UI do AppMaker e a fonte pratica para configurar API Hub neste momento. Nao insistir em PUT automatico sem documentacao ou suporte da Layers.

## Riscos e cuidados

- A rota `/portal/comunicados-test` e temporaria e deve permanecer restrita a `raizeducacao`.
- Nao usar API privada `comunicados-api.layers.digital` como integracao de producao sem validacao formal da Layers.
- Nao commitar HARs, sessoes, secrets ou tokens.
- Antes de usar o canal em producao real, implementar validacao do secret do API Hub no endpoint `/api/layers/actions/posts`.
- O endpoint atual aceita chamada com `context.community`; antes de producao real, validar secret do body conforme configurado no AppMaker.

## Proximos passos

1. Validar no app Comunicados da Layers se os dois posts de teste aparecem visualmente para usuario de `raizeducacao`.
2. Colocar o secret rotacionado no Vercel como `LAYERS_POSTS_SECRET`.
3. Implementar validacao de `LAYERS_POSTS_SECRET` em `survey-platform/app/api/layers/actions/posts/route.ts`.
4. Remover ou esconder a rota temporaria `/portal/comunicados-test` apos conclusao da investigacao.
5. Criar fluxo admin para popular `comunicados`, ou integrar a criacao de comunicado ao dispatch de pesquisa.
6. Quando o provider estiver validado no app real, automatizar: ao criar um dispatch, inserir comunicados por comunidade com `status = "published"` e `approved = true`.

## Decisao atual

Seguir pelo API Hub/provider documentado. A permissao `@admin:layers-comunicados:*` abriu a configuracao de API Hub no AppMaker, mas nao significa que exista endpoint publico para criar posts diretamente. O provider `@layers:Posts:getUpdatedAfter` ja aparece com `versions: [1]` e responde via `services/call`; a missao agora e validar exibicao no app Comunicados, proteger o endpoint com secret e automatizar a populacao da tabela `comunicados`.
