-- External Operations API tokens for pesquisa-miniapp-layers.
-- Tokens are hashed at rest and can only be accessed by the server service role.

create table if not exists public.ops_api_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  owner_email text not null,
  name text not null default 'Codex Skill',
  token_prefix text not null,
  token_hash text not null unique check (length(token_hash) = 64),
  scopes text[] not null default array['*']::text[],
  enabled boolean not null default true,
  expires_at timestamptz,
  last_used_at timestamptz,
  created_at timestamptz not null default now(),
  revoked_at timestamptz
);

create index if not exists idx_ops_api_tokens_user
  on public.ops_api_tokens(user_id, created_at desc);

create index if not exists idx_ops_api_tokens_active_prefix
  on public.ops_api_tokens(token_prefix)
  where enabled = true;

alter table public.ops_api_tokens enable row level security;
revoke all on table public.ops_api_tokens from anon, authenticated;
grant all on table public.ops_api_tokens to service_role;

create table if not exists public.ops_api_audit_logs (
  id uuid primary key default gen_random_uuid(),
  token_id uuid references public.ops_api_tokens(id) on delete set null,
  actor_email text,
  request_id text not null,
  operation text not null,
  risk text not null default 'read',
  method text not null,
  path text not null,
  target text,
  status_code integer not null,
  success boolean not null,
  duration_ms integer,
  idempotency_key text,
  request_summary jsonb not null default '{}'::jsonb,
  response_summary jsonb not null default '{}'::jsonb,
  error text,
  created_at timestamptz not null default now()
);

create index if not exists idx_ops_api_audit_logs_created
  on public.ops_api_audit_logs(created_at desc);

create index if not exists idx_ops_api_audit_logs_token
  on public.ops_api_audit_logs(token_id, created_at desc);

create unique index if not exists idx_ops_api_audit_success_idempotency
  on public.ops_api_audit_logs(token_id, idempotency_key)
  where success = true and idempotency_key is not null;

alter table public.ops_api_audit_logs enable row level security;
revoke all on table public.ops_api_audit_logs from anon, authenticated;
grant all on table public.ops_api_audit_logs to service_role;
