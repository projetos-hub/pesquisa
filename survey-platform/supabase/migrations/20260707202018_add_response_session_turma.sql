-- Store the Layers classroom/group alias separately from the grade/series label.
alter table public.response_sessions
  add column if not exists turma text;

create index if not exists idx_response_sessions_turma
  on public.response_sessions (survey_id, turma)
  where turma is not null;
