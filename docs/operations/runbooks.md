# Runbooks de Incidentes

## Submit de pesquisa quebrado

Sintomas:

- aumento de `submit.invalid_body`, `submit.session_insert_failed` ou `submit.responses_insert_failed`
- `POST /api/surveys/[slug]/submit` retornando 4xx/5xx
- respondente preso em loading, acesso negado indevido ou sem tela de obrigado

Diagnostico:

1. Consultar logs por `route="POST /api/surveys/[slug]/submit"` e `correlationId`.
2. Verificar `/api/health`; se `supabase.ok=false`, tratar como incidente de banco/env.
3. Para survey amostral, validar `survey_sample_lists` com `layers_user_id` resolvido e `survey_communities.status='ativa'`.
4. Rodar `npm run test:e2e -- tests/e2e/respondente.spec.ts tests/e2e/sample-gate.spec.ts` em ambiente controlado.

Mitigacao:

- Se for regra de amostra, pausar disparos dessa survey ate corrigir lista/resolucao.
- Se for erro em insert de session/responses, verificar migrations recentes, constraints e RLS.
- Se o erro for de payload, manter resposta 400/422; nao relaxar validacao sem teste unitario.

## Cron parado

Sintomas:

- `GET /api/admin/operations/dispatch-health` mostra `due_scheduled_dispatches > 0`.
- Logs sem `cron.dispatches.completed` por mais de 10 minutos.
- Dispatches permanecem em `scheduled` ou `sending`.

Diagnostico:

1. Chamar `/api/health` e confirmar `environment`, `supabase` e `dispatch_queue`.
2. Chamar `/api/admin/operations/dispatch-health` com usuario admin.
3. Verificar se `CRON_SECRET` esta configurado na Vercel e se o cron envia `Authorization: Bearer <CRON_SECRET>`.
4. Procurar logs `cron.dispatches.unauthorized` e `cron.dispatches.*_failed`.

Mitigacao:

- Corrigir secret/env e redeploy se necessario.
- Reexecutar manualmente o cron apenas com token valido.
- Para jobs presos, usar retry admin quando existirem falhas reprocessaveis.

## Layers 429 ou indisponivel

Sintomas:

- aumento de jobs `failed` com erro de rate limit ou resposta 429.
- `summary.failed_jobs` alto no dispatch health.
- logs `dispatch.immediate_completed` ou `cron.dispatches.completed` com `failed > 0`.

Diagnostico:

1. Abrir jobs falhos em `/api/admin/operations/dispatch-health`.
2. Agrupar por `dispatch_id` e verificar `retry_count`.
3. Confirmar se a falha afeta email, push ou ambos pela auditoria de dispatch.

Mitigacao:

- Evitar disparos manuais em massa ate a janela de rate limit normalizar.
- Reprocessar pelo endpoint/botao de retry quando `retry_count < 3`.
- Se persistir, reduzir batch/concorrencia do cron antes de novo disparo grande.

## Migration pendente

Sintomas:

- `npm run build` passa, mas runtime falha com coluna/tabela ausente.
- Supabase retorna erro de schema em rotas admin, dispatch, analytics ou submit.
- `/api/health` acusa erro em `supabase` ou filas.

Diagnostico:

1. Comparar `survey-platform/supabase/migrations` com historico remoto.
2. Rodar `npx supabase migration list --linked`.
3. Verificar a migration especifica com query direta em `information_schema`.

Mitigacao:

- Aplicar migration pendente com Supabase CLI/MCP no projeto `qnpvlhfjknnvfiyxrhhl`.
- Se a migration ja foi aplicada manualmente, usar `migration repair` apenas apos confirmar objetos no banco.
- Rodar gates locais e smoke test dos endpoints afetados.

## Rollback

Quando usar:

- deploy introduziu 5xx em submit, admin ou cron.
- migration nova comprometeu fluxo principal e nao ha fix rapido seguro.

Procedimento:

1. Identificar o deploy anterior saudavel na Vercel.
2. Promover rollback do deploy.
3. Se houve migration destrutiva, avaliar rollback de dados separadamente; nao executar downgrade sem backup/confirmacao.
4. Verificar `/api/health`, fluxo respondente e dispatch health.
5. Registrar causa raiz e teste que teria capturado a falha.
