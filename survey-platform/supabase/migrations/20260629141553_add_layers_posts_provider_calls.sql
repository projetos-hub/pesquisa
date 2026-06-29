create table if not exists public.layers_posts_provider_calls (
  id uuid primary key default gen_random_uuid(),
  community_id text,
  after_value text,
  limit_value integer,
  source_shape text,
  action text,
  version text,
  user_agent text,
  client_hint text,
  returned_count integer,
  created_at timestamptz not null default now()
);

create index if not exists idx_layers_posts_provider_calls_created_at
  on public.layers_posts_provider_calls(created_at desc);

create index if not exists idx_layers_posts_provider_calls_community_created_at
  on public.layers_posts_provider_calls(community_id, created_at desc);

alter table public.layers_posts_provider_calls enable row level security;
