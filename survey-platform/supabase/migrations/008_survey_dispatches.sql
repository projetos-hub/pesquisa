-- Migration 008: Sistema de disparo de notificações
-- Cria survey_dispatches (registro de cada disparo) e
-- survey_dispatch_jobs (execução por comunidade)

-- ─── survey_dispatches ────────────────────────────────────────────────────────

CREATE TABLE survey_dispatches (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  survey_id            UUID REFERENCES surveys(id) ON DELETE CASCADE,

  -- Conteúdo principal (fallback para ambos os canais)
  title                TEXT NOT NULL,
  body                 TEXT NOT NULL,

  -- Overrides por canal (usa title/body se NULL)
  push_title           TEXT,
  push_body            TEXT,
  email_title          TEXT,
  email_body           TEXT,
  email_action_label   TEXT NOT NULL DEFAULT 'Responder Pesquisa',
  email_background_url TEXT,

  -- Canais habilitados: 'pushNotification' | 'email'
  channels             TEXT[] NOT NULL DEFAULT ARRAY['pushNotification', 'email'],

  -- Segmentação
  target_scope         TEXT NOT NULL
                       CHECK (target_scope IN ('all', 'communities', 'group')),
  target_community_ids TEXT[],   -- NULL = todas as instaladas; usado com scope 'communities'
  target_group_alias   TEXT,     -- alias da turma, usado com scope 'group'
  target_roles         TEXT[] NOT NULL DEFAULT ARRAY['guardian'],

  -- Agendamento (NULL = imediato)
  scheduled_at         TIMESTAMPTZ,

  -- Status do disparo geral
  status               TEXT NOT NULL DEFAULT 'pending'
                       CHECK (status IN (
                         'draft', 'pending', 'scheduled', 'sending',
                         'sent', 'partial_failure', 'failed', 'cancelled'
                       )),
  total_jobs           INT NOT NULL DEFAULT 0,
  completed_jobs       INT NOT NULL DEFAULT 0,
  failed_jobs          INT NOT NULL DEFAULT 0,

  -- Template reutilizável
  is_template          BOOLEAN NOT NULL DEFAULT false,
  template_name        TEXT,

  -- Auditoria
  created_by           UUID REFERENCES admin_profiles(id),
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  started_at           TIMESTAMPTZ,
  completed_at         TIMESTAMPTZ
);

-- ─── survey_dispatch_jobs ─────────────────────────────────────────────────────

CREATE TABLE survey_dispatch_jobs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dispatch_id     UUID NOT NULL REFERENCES survey_dispatches(id) ON DELETE CASCADE,
  community_id    TEXT NOT NULL,

  status          TEXT NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending', 'sending', 'sent', 'failed', 'skipped')),

  layers_payload  JSONB,   -- payload exato enviado à Layers
  layers_response JSONB,   -- resposta bruta da Layers API
  error           TEXT,    -- mensagem de erro se status = 'failed'

  retry_count     INT NOT NULL DEFAULT 0,
  sent_at         TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Índices ──────────────────────────────────────────────────────────────────

CREATE INDEX idx_survey_dispatches_survey_id   ON survey_dispatches (survey_id);
CREATE INDEX idx_survey_dispatches_status      ON survey_dispatches (status);
CREATE INDEX idx_survey_dispatches_scheduled   ON survey_dispatches (scheduled_at)
  WHERE scheduled_at IS NOT NULL AND status = 'scheduled';
CREATE INDEX idx_survey_dispatches_template    ON survey_dispatches (is_template)
  WHERE is_template = true;

CREATE INDEX idx_dispatch_jobs_dispatch_id     ON survey_dispatch_jobs (dispatch_id);
CREATE INDEX idx_dispatch_jobs_status          ON survey_dispatch_jobs (status);

-- ─── RLS ──────────────────────────────────────────────────────────────────────

ALTER TABLE survey_dispatches  ENABLE ROW LEVEL SECURITY;
ALTER TABLE survey_dispatch_jobs ENABLE ROW LEVEL SECURITY;

-- Admins autenticados podem ler seus disparos
CREATE POLICY "admin_read_dispatches"
  ON survey_dispatches FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM admin_profiles
      WHERE admin_profiles.id = auth.uid()
    )
  );

CREATE POLICY "admin_read_dispatch_jobs"
  ON survey_dispatch_jobs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM survey_dispatches d
      JOIN admin_profiles ap ON ap.id = auth.uid()
      WHERE d.id = survey_dispatch_jobs.dispatch_id
    )
  );

-- service_role bypassa RLS automaticamente (usado nas API routes)
