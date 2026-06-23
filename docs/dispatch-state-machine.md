# Dispatch State Machine

## Dispatch statuses

| Status | Meaning | Terminal |
|---|---|---|
| `draft` | Template/draft not ready to send | no |
| `pending` | Created for immediate send, not yet started | no |
| `scheduled` | Waiting for `scheduled_at` | no |
| `sending` | At least one job is being processed or waiting for the next personalized batch | no |
| `sent` | All counted jobs finished successfully | yes |
| `partial_failure` | At least one counted job succeeded and at least one failed | yes |
| `failed` | No counted job succeeded | yes |
| `cancelled` | Stopped by operator | yes |

## Job statuses

| Status | Meaning | Terminal |
|---|---|---|
| `pending` | Job exists but was not claimed for send | no |
| `sending` | Job is claimed/active or waiting for next personalized batch | no |
| `sent` | Job finished successfully | yes |
| `failed` | Job exhausted or failed the last attempt | yes |
| `skipped` | Job intentionally not sent | yes |

## Invariants

- A dispatch can close only when every job is terminal: `sent`, `failed`, or `skipped`.
- A dispatch with any job in `pending` or `sending` must remain `sending`.
- `completed_jobs` counts `sent` jobs.
- `failed_jobs` counts `failed` jobs.
- `skipped` is terminal but does not increment completed or failed counters.
- Personalized jobs can stay `sending` across multiple cron cycles while `processed_users < total_users`.
- Cron must atomically claim personalized `sending` jobs before processing a batch.

## Atomic Claim

The migration `20260623003237_add_dispatch_job_claims.sql` adds:

- `survey_dispatch_jobs.lock_token`
- `survey_dispatch_jobs.locked_at`
- `survey_dispatch_jobs.locked_until`
- `public.claim_sending_dispatch_jobs(p_limit, p_lock_seconds)`

The RPC selects eligible personalized jobs with `FOR UPDATE SKIP LOCKED`, sets a short lock window, and returns only the claimed jobs. If a cron execution crashes, the lock expires and a later cron can resume the job.
