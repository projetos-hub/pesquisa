-- 024_audit_indexes.sql
-- Indices para queries de auditoria (dashboard)
-- DOWN: DROP INDEX IF EXISTS idx_response_sessions_submitted_at, idx_response_sessions_school_survey, idx_response_sessions_onda;

CREATE INDEX IF NOT EXISTS idx_response_sessions_submitted_at
  ON response_sessions(submitted_at DESC);

CREATE INDEX IF NOT EXISTS idx_response_sessions_school_survey
  ON response_sessions(survey_id, school);

CREATE INDEX IF NOT EXISTS idx_response_sessions_onda
  ON response_sessions(survey_id, onda);

-- Adiciona responded_at como alias de submitted_at para queries de auditoria temporal
ALTER TABLE response_sessions
  ADD COLUMN IF NOT EXISTS responded_at TIMESTAMPTZ GENERATED ALWAYS AS (submitted_at) STORED;

COMMENT ON COLUMN response_sessions.responded_at IS 'Alias de submitted_at para queries de auditoria temporal';
