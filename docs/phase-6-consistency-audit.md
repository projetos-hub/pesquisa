# Phase 6 - Transacoes e Consistencia de Dados

Data: 2026-06-23

## Escopo revisado

| Fluxo | Risco antes | Tratamento atual |
| --- | --- | --- |
| Duplicar pesquisa | Criava survey, depois perguntas e opcoes em varios requests. Falha intermediaria podia deixar template parcial. | `admin_duplicate_survey_template()` faz a copia inteira em uma unica transacao no Postgres. |
| Deletar pesquisa | Deletava filhos em loops no app. Falha intermediaria podia deixar dados parcialmente removidos. | `admin_delete_survey_cascade()` remove respostas/sessoes e depois a survey, deixando FKs `ON DELETE CASCADE` cuidarem dos filhos restantes. |
| Salvar opcoes de pergunta | Apagava opcoes e depois inseria novas. Falha no insert podia deixar a pergunta sem opcoes. | `admin_replace_question_options()` faz delete + insert na mesma transacao. |
| Submit respondente | Cria sessao e depois respostas. | Mantida compensacao: se respostas falham ou answers nao batem com perguntas, a sessao criada e removida para permitir retry legitimo. |
| Criacao de dispatch | Cria dispatch e depois jobs. | Mantida compensacao: se jobs falham, o dispatch recem-criado e removido. |

## Migration adicionada

- `survey-platform/supabase/migrations/20260623120000_admin_transactional_consistency.sql`

Funcoes:
- `admin_replace_question_options(uuid, text[])`
- `admin_delete_survey_cascade(uuid)`
- `admin_duplicate_survey_template(uuid)`

Grants:
- Execucao revogada de `PUBLIC`, `anon` e `authenticated`.
- Execucao concedida apenas a `service_role`.

## Constraints e indices revisados

Invariantes ja cobertos:
- `surveys.slug` unico.
- `questions (survey_id, key)` unico.
- `survey_communities (survey_id, community_id)` unico.
- `response_sessions (survey_id, community_id, user_id)` unico para idempotencia.
- `survey_sample_lists (survey_id, community_id, email)` unico.
- FKs com cascade para `questions`, `question_options`, `survey_communities`, `survey_sample_lists`, `survey_sample_groups`, `survey_dispatches`, `survey_dispatch_jobs` e `notification_audit_logs`.
- Indices de auditoria/relatorio em `response_sessions`, `responses`, `survey_dispatches`, `survey_dispatch_jobs` e `audit_broadcasts`.

Ponto ainda aceito por desenho atual:
- `response_sessions_public_insert` e `responses_public_insert` continuam permissivas porque o endpoint publico de submit ainda depende dessas policies historicas. O hardening server-side da Phase 3 reduz o risco, mas a eliminacao definitiva deve mover submit para RPC/service-only ou restringir policies com token/claim verificavel.

## Verificacao remota

Aplicadas no Supabase remoto (`qnpvlhfjknnvfiyxrhhl`):
- `028_audit_broadcasts.sql`
- `20260622203022_harden_report_rpc_grants.sql`
- `20260622210319_harden_comunicados_and_cron_rpc.sql`
- `20260623003237_add_dispatch_job_claims.sql`
- `20260623120000_admin_transactional_consistency.sql`

Historico da CLI reparado com:

```bash
npx supabase migration repair --linked --status applied 028 20260622203022 20260622210319 20260623003237 20260623120000
```

Objetos verificados no remoto:
- `audit_broadcasts`: existe.
- `survey_communities.expected_responses`: existe.
- `survey_dispatch_jobs.lock_token`: existe.
- `admin_replace_question_options`: existe.
- `admin_delete_survey_cascade`: existe.
- `admin_duplicate_survey_template`: existe.

Advisor Supabase apos aplicacao:
- Restantes: policies publicas de insert em `response_sessions` e `responses`; leaked password protection desativado.
- Resolvidos/nao retornaram mais: grants publicos das RPCs de relatorio, `trigger_dispatch_processor`, RLS de `comunicados`.
