# Observabilidade Operacional

## Logs estruturados

As rotas criticas emitem logs JSON com estes campos base:

- `level`: `info`, `warn` ou `error`
- `event`: nome estavel do evento
- `route`: rota logica
- `correlationId`: valor de `x-correlation-id`, `x-request-id` ou UUID gerado
- `surveyId`, `dispatchId`, `jobId`: quando aplicavel
- `timestamp`: ISO-8601

Campos sensiveis como email, nome, userId, accountId e `layers_user_id` sao mascarados pelo helper `lib/observability.ts`.

Rotas instrumentadas nesta fase:

- `POST /api/surveys/[slug]/submit`
- `POST /api/admin/surveys/[id]/dispatch`
- `GET /api/admin/surveys/[id]/dispatch`
- `GET /api/cron/process-dispatches`
- `POST /api/admin/dispatch/[dispatchId]/retry`
- `GET /api/health`
- `GET /api/admin/operations/dispatch-health`

## Health check

Endpoint:

```http
GET /api/health
```

Resposta esperada:

```json
{
  "ok": true,
  "status": "ok",
  "checks": {
    "environment": { "ok": true, "status": "ok" },
    "supabase": { "ok": true, "status": "ok" },
    "dispatch_queue": { "ok": true, "status": "ok", "count": 0 },
    "sheets_queue": { "ok": true, "status": "ok", "count": 0 }
  }
}
```

O endpoint retorna `503` quando uma dependencia critica falha ou quando variaveis obrigatorias estao ausentes. Variaveis opcionais ausentes retornam `warn`, mas nao derrubam o readiness.

## Dispatch health

Endpoint admin:

```http
GET /api/admin/operations/dispatch-health
```

Ele identifica:

- dispatches `sending` ha mais de 60 minutos
- jobs `sending` ha mais de 30 minutos sem lock ativo
- jobs `failed` recentes
- dispatches `scheduled` vencidos que o cron ainda nao processou

Campos principais:

- `summary.zombie_dispatches`
- `summary.stale_sending_jobs`
- `summary.failed_jobs`
- `summary.due_scheduled_dispatches`

Sinal amarelo operacional: qualquer um desses contadores acima de zero.

## Queries SQL equivalentes

Dispatches zumbis:

```sql
select id, survey_id, status, total_jobs, completed_jobs, failed_jobs, created_at
from survey_dispatches
where status = 'sending'
  and created_at < now() - interval '60 minutes'
order by created_at asc;
```

Jobs sem progresso:

```sql
select id, dispatch_id, community_id, status, retry_count, locked_until, created_at
from survey_dispatch_jobs
where status = 'sending'
  and created_at < now() - interval '30 minutes'
  and (locked_until is null or locked_until < now())
order by created_at asc;
```

Agendamentos vencidos:

```sql
select id, survey_id, scheduled_at, total_jobs, completed_jobs, failed_jobs
from survey_dispatches
where status = 'scheduled'
  and scheduled_at <= now()
order by scheduled_at asc;
```
