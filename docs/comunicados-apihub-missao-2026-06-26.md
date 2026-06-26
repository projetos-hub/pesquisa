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

Esse resultado confirma que a feature de Services/API Hub foi ativada e que o app Pesquisa aparece como provider da action. A pendencia e que o provider `m3jzq5s00b` aparece com `versions: []`.

Chamadas testadas:

- `POST /v1/services/call/@layers:Posts:getUpdatedAfter/m3jzq5s00b?version=1` retornou `404 provider`.
- Sem `version`, retornou `400 Missing or invalid version: NaN`.
- Com `version=0`, retornou `400 Missing or invalid version: 0`.
- Chamando outro provider (`gestao-da-inadimplencia-raiz`) com `version=1`, a API respondeu que o provider falhou ao responder.

Conclusao: o API Hub esta ativo, mas a publicacao/versionamento do nosso `respond` ainda nao esta em estado chamavel via `services/call`.

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
- Antes de usar o secret do API Hub, implementar validacao no endpoint `/api/layers/actions/posts`.
- O endpoint atual aceita chamada com `context.community`; antes de producao real, validar secret do body conforme configurado no AppMaker.

## Proximos passos

1. Confirmar no AppMaker se o `Respond` da action `@layers:Posts:getUpdatedAfter` permite definir/publicar versao. O discovery ja lista o app, mas com `versions: []`.
2. Testar novamente `services/discover` apos reinstalar/atualizar a instalacao e aguardar propagacao. Esperado: provider `m3jzq5s00b` com `versions: [1]`.
3. Quando houver versao, chamar `services/call` contra `m3jzq5s00b?version=1` e validar se a Layers chama nosso endpoint com `secret`.
4. Implementar validacao de `LAYERS_POSTS_SECRET` em `survey-platform/app/api/layers/actions/posts/route.ts`.
5. Remover ou esconder a rota temporaria `/portal/comunicados-test` apos conclusao da investigacao.
6. Criar fluxo admin para popular `comunicados`, ou integrar a criacao de comunicado ao dispatch de pesquisa.
7. Quando o provider estiver validado no app real, automatizar: ao criar um dispatch, inserir comunicados por comunidade com `status = "published"` e `approved = true`.

## Decisao atual

Seguir pelo API Hub/provider documentado. A permissao `@admin:layers-comunicados:*` abriu a configuracao de API Hub no AppMaker, mas nao significa que exista endpoint publico para criar posts diretamente. A missao agora e fazer o provider `@layers:Posts:getUpdatedAfter` aparecer com versao chamavel e validar o contrato de secret.
