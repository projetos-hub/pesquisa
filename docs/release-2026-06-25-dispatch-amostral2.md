# Release 2026-06-25 - estabilizacao do disparo Amostral 2

## Resumo

Rodada emergencial para diagnosticar, corrigir e concluir o disparo da pesquisa `amostral-2-2026` na Layers.

Resultado final:

```text
Amostra total:       12.903
Resolvidos validos:  12.355
Nao encontrados:        548

Enviados:            12.355/12.355
Falhas de envio:          0
```

## Dispatches finais

| Dispatch | Papel | Status | Jobs | Enviados | Falhas | Conclusao |
|---|---|---:|---:|---:|---:|---|
| `97c6ed75-2826-4cc9-a28d-ecc12cf54240` | Reenvio principal | `sent` | 16/16 | 5.792 | 0 | 2026-06-24 15:30 BRT |
| `0ff58d56-2b94-46da-a294-ea53365c7947` | Complementar das comunidades faltantes | `sent` | 23/23 | 6.563 | 0 | 2026-06-24 16:45 BRT |

## Causa raiz

Foram encontrados quatro problemas independentes no sistema de disparos:

1. Campos opcionais de canal salvos como string vazia (`""`) eram enviados para a Layers como titulo/corpo vazio.
   - Efeito: API Layers retornava `Existem campos invalidos`.
   - Correcao: normalizar campo vazio para `null` e fazer fallback para titulo/mensagem principal.

2. Backlog antigo de dispatches `sending` prendia jobs novos atras de filas zumbis.
   - Efeito: o reenvio parecia parado em `30/xxx`.
   - Mitigacao operacional: cancelados dispatches antigos em `sending` que estavam antes do reenvio atual.

3. O contador de progresso de amostra contava `layers_user_id = 'NOT_FOUND'` como enviavel.
   - Efeito: jobs ficavam quase completos, mas nao fechavam.
   - Correcao: contadores e queries de progresso passaram a excluir `NOT_FOUND`.

4. `resolveTargetCommunities()` para `target_scope='sample'` dependia de uma pagina unica do Supabase.
   - Efeito: so 16 comunidades foram selecionadas no primeiro reenvio, embora a amostra tivesse 40 comunidades.
   - Correcao: paginar todas as linhas de amostra e retornar todas as comunidades com `layers_user_id` valido.

## Operacoes executadas no banco

- Cancelado o dispatch com payload invalido:
  - `5d2bb1ab-d489-4b1e-b2ee-948faf032f34`
  - 16 jobs marcados como `skipped`
  - 480 falhas preservadas no audit log para rastreabilidade

- Cancelado backlog antigo em `sending` antes do reenvio valido:
  - 16 dispatches
  - 81 jobs

- Cancelados agendamentos antigos de `amostral-2-2026` que poderiam duplicar envio:
  - 8 dispatches `scheduled`
  - 328 jobs

- Criado dispatch complementar restrito as comunidades nao cobertas pelo primeiro reenvio:
  - `0ff58d56-2b94-46da-a294-ea53365c7947`
  - 23 comunidades
  - 6.563 usuarios validos

## Comunidades complementares

O dispatch complementar cobriu as comunidades que ficaram fora do primeiro envio:

```text
americano
az51800x
globaltree-abm
k4ys44r2
leonardodavinci-alfa
leonardodavinci-beta
leonardodavinci-gama
matriz-saojoaodemeriti
matriz-taquara
matriz-tijuca
ns8z5w8m
qi-freguesia
qi-metropolitano
qi-recreio
qi-rio2
qi-tijuca
rf3zk695
sarahdawsey-juizdefora
uniao
w9593n19
w95k0s77
xa7y5zam
yxak8s0k
```

`qi-botafogo` apareceu na amostra, mas tinha 0 usuarios resolvidos validos e 10 `NOT_FOUND`; por isso nao recebeu complemento.

## Mudancas publicadas

| Commit | Descricao |
|---|---|
| `a23f745` | Evita campos vazios no payload Layers |
| `6c11527` | Melhora visibilidade do progresso do disparo |
| `037c9b0` | Aumenta lote de envio personalizado de 30 para 75 e claim para 16 jobs |
| `0810e1a` | Ignora amostras nao resolvidas (`NOT_FOUND`) no progresso |
| `e0a652b` | Pagina comunidades da amostra em `resolveTargetCommunities()` |

## Parametros operacionais atuais

```text
PERSONALIZED_BATCH_SIZE = 75
PERSONALIZED_DELAY_MS   = 150
claim_sending_dispatch_jobs.p_limit = 16
cron process-dispatches = a cada 5 minutos
```

Isso permite processar ate 16 comunidades por ciclo, com ate 75 usuarios por comunidade por ciclo.

## Validacoes feitas

- `npm run typecheck`
- `npm run lint` focado nos arquivos alterados
- Vercel deploy `success` nos commits publicados
- `/api/health` em producao retornou `200 OK`
- Conferencia Supabase:
  - `amostral-2-2026`: 12.355 resolvidos validos
  - dispatch principal: 5.792 enviados, 0 falhas
  - dispatch complementar: 6.563 enviados, 0 falhas

## Recomendacoes

Antes de qualquer novo disparo amostral grande:

1. Conferir `survey_sample_lists`:
   - total da amostra;
   - resolvidos validos;
   - `NOT_FOUND`;
   - comunidades com resolvidos validos.
2. Conferir `survey_dispatches` e `survey_dispatch_jobs` por backlog antigo em `sending` ou `scheduled`.
3. Evitar disparar com campos customizados de canal vazios.
4. Acompanhar a tela de historico de disparos e `/api/admin/operations/dispatch-health`.
5. Se precisar acionar cron manualmente, usar apenas o endpoint autorizado:

```http
GET /api/cron/process-dispatches
Authorization: Bearer <CRON_SECRET>
```
