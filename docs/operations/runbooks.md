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

## Disparo amostral incompleto ou parado

Sintomas:

- historico mostra comunidades paradas em `30/xxx`, `60/xxx` ou outro lote por muito tempo;
- dispatch fica `sending` mesmo sem falhas;
- total enviado e menor que o total de `survey_sample_lists` resolvido;
- audit log mostra sucesso, mas nem todas as comunidades da amostra aparecem em `survey_dispatch_jobs`.

Diagnostico:

1. Identificar o dispatch recente em `survey_dispatches`.
2. Comparar amostra resolvida com jobs do dispatch:

```sql
select
  count(*) filter (where layers_user_id is not null and layers_user_id <> 'NOT_FOUND') as resolved_valid,
  count(*) filter (where layers_user_id = 'NOT_FOUND') as not_found,
  count(*) as total_rows
from survey_sample_lists
where survey_id = '<survey_id>';
```

```sql
select
  count(*) as jobs,
  sum(processed_users) as sent_users,
  sum(failed_users) as failed_users,
  sum(total_users) as total_users
from survey_dispatch_jobs
where dispatch_id = '<dispatch_id>';
```

3. Verificar se ha backlog antigo antes do dispatch atual:

```sql
select d.id, d.created_at, d.status, count(j.*) as sending_jobs
from survey_dispatches d
join survey_dispatch_jobs j on j.dispatch_id = d.id
where d.status = 'sending'
  and d.personalized = true
  and j.status = 'sending'
group by d.id, d.created_at, d.status
order by d.created_at asc;
```

4. Verificar se as comunidades da amostra foram todas materializadas em jobs:

```sql
with sample_counts as (
  select community_id,
         count(*) filter (where layers_user_id is not null and layers_user_id <> 'NOT_FOUND') as resolved_valid
  from survey_sample_lists
  where survey_id = '<survey_id>'
  group by community_id
)
select sc.community_id, sc.resolved_valid, j.id as job_id
from sample_counts sc
left join survey_dispatch_jobs j
  on j.community_id = sc.community_id
 and j.dispatch_id = '<dispatch_id>'
where sc.resolved_valid > 0
order by sc.community_id;
```

Mitigacao:

- Se o dispatch tem payload invalido, cancelar o dispatch e preservar audit log.
- Se ha backlog antigo/zumbi, cancelar apenas dispatches antigos claramente obsoletos antes de retomar o envio novo.
- Se faltaram comunidades por paginacao/escopo, criar dispatch complementar restrito as comunidades faltantes.
- Se jobs estao quase completos mas nao fecham, conferir se `total_users` incluiu `NOT_FOUND`; corrigir total para contar apenas `layers_user_id <> 'NOT_FOUND'`.
- Apos mitigacao, acionar o cron manualmente somente com `CRON_SECRET` valido e acompanhar `notification_audit_logs`.

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

## Adaptacoes de texto por comunidade

Quando usar:

- mesma pesquisa precisa ter linguagem diferente por marca, unidade ou comunidade;
- campanha de intencao de rematricula precisa adaptar saudacao, pergunta ou agradecimento;
- a comparabilidade de respostas deve ser preservada em uma unica `survey_id`.

Procedimento:

1. Abrir a pesquisa em `/admin/surveys/[id]`.
2. Confirmar que as comunidades estao instaladas no card `Comunidades`.
3. Entrar em `Adaptações por comunidade` ou acessar `/admin/surveys/[id]/textos`.
4. Selecionar a comunidade.
5. Selecionar a etapa/pergunta.
6. Preencher apenas os campos que precisam sobrescrever o texto padrao.
7. Usar variaveis quando necessario: `{{nomeAluno}}`, `{{nomeEscola}}`, `{{marca}}`, `{{unidade}}`, `{{serie}}`.
8. Conferir o preview lateral.
9. Clicar em `Salvar adaptação`.
10. Abrir o link de teste da comunidade e validar a experiencia real do respondente.

Criterios de pronto antes de disparar:

- comunidades sem adaptacao aparecem como `Texto padrão`;
- comunidades adaptadas mostram a quantidade esperada de textos personalizados;
- pelo menos um link real por marca/unidade critica foi testado;
- o texto padrao da pesquisa continua adequado para comunidades sem personalizacao;
- a amostra e o disparo foram validados separadamente quando aplicavel.

Rollback operacional:

- Para remover a adaptacao de uma etapa, abrir a etapa e clicar em `Usar texto padrão`, depois `Salvar adaptação`.
- Para remover todas as adaptacoes de uma comunidade via SQL, limpar `settings.contentOverrides` em `survey_communities` somente apos confirmar `survey_id` e `community_id`:

```sql
update survey_communities
set settings = settings - 'contentOverrides'
where survey_id = '<survey_id>'
  and community_id = '<community_id>';
```

Diagnostico:

- Se a tela admin mostra adaptacao mas o respondente nao, acionar novamente `Salvar adaptação` para revalidar cache.
- Conferir se o link de teste tem `communityId` correto.
- Conferir em `survey_communities.settings` se `contentOverrides.questions` usa a `question.key` correta.
- Rodar `/api/surveys/[slug]?communityId=[community_id]` e verificar se os textos efetivos aparecem no JSON.
