-- 024_survey_broadcasts.sql
-- Registra cada disparo de pesquisa para rastreabilidade completa
-- DOWN: DROP TABLE IF EXISTS survey_broadcasts;

CREATE TABLE survey_broadcasts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  survey_id       UUID REFERENCES surveys(id) ON DELETE CASCADE,
  community_ids   TEXT[]    NOT NULL DEFAULT '{}',
  target_roles    TEXT[]    NOT NULL DEFAULT ARRAY['responsavel'],
  channel         TEXT      NOT NULL DEFAULT 'push_email'
                  CHECK (channel IN ('push', 'email', 'push_email')),
  scheduled_at    TIMESTAMPTZ,
  dispatched_at   TIMESTAMPTZ,
  dispatched_by   TEXT,
  status          TEXT      NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending', 'sent', 'failed', 'scheduled')),
  layers_response JSONB     DEFAULT '{}',
  recipient_count INTEGER,
  error_message   TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_survey_broadcasts_survey_id ON survey_broadcasts(survey_id);
CREATE INDEX idx_survey_broadcasts_status    ON survey_broadcasts(status);
CREATE INDEX idx_survey_broadcasts_created   ON survey_broadcasts(created_at DESC);

ALTER TABLE survey_broadcasts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "broadcasts_admin_read" ON survey_broadcasts
  FOR SELECT USING (EXISTS (SELECT 1 FROM admin_profiles WHERE id = auth.uid()));

CREATE POLICY "broadcasts_admin_write" ON survey_broadcasts
  FOR ALL USING (EXISTS (SELECT 1 FROM admin_profiles WHERE id = auth.uid()));
