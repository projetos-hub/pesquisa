# API externa

Base: `https://pesquisa-nu-sand.vercel.app/api/ops/v1`.

## Onboarding

1. `GET /config` retorna URL/key publica do Supabase.
2. Autenticar com conta interna confirmada.
3. `POST /tokens` com JWT Supabase em Bearer.
4. Disponibilizar o token `pml_live_...` em `PESQUISA_API_TOKEN` ou guarda-lo somente na configuracao local. Tokens nao expiram por padrao, mas permanecem individualmente revogaveis.

O cliente usa `https://pesquisa-nu-sand.vercel.app` por padrao. So `PESQUISA_API_TOKEN` e obrigatoria para operar em producao; `PESQUISA_API_URL` e opcional e substitui a URL para preview/local.

## Endpoints

- `GET /config`: configuracao publica para login.
- `POST|GET|DELETE /tokens`: emitir, listar e revogar tokens pessoais.
- `GET /capabilities`: recursos e operacoes permitidos.
- `POST /execute`: dry-run ou execucao tipada.

## Execute

Body comum:

```json
{
  operation: resource.list,
  resource: surveys,
  filters: {},
  limit: 100,
  offset: 0,
  dryRun: true
}
```

Operacoes: `resource.list`, `resource.get`, `resource.count`, `resource.create`, `resource.update`, `resource.upsert`, `resource.delete`, `rpc.call` e `dispatch.process`.

Escritas exigem `Idempotency-Key`. Exclusoes e operacoes externas exigem `X-Confirm-Operation` com o valor informado pela API.

## RPCs

- `duplicate_survey`
- `delete_survey`
- `replace_question_options`

## Limites

- 500 linhas por upsert.
- Apenas recursos e colunas da whitelist.
- Sem SQL, nome de tabela ou RPC arbitrarios.
- Todas as execucoes autenticadas geram auditoria sanitizada.
