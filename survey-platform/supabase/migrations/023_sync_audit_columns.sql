-- 023_sync_audit_columns.sql
-- Adiciona rastreabilidade ao processo de sync com Google Sheets
-- DOWN: ALTER TABLE response_sessions DROP COLUMN IF EXISTS sync_attempts, sync_error, sync_last_attempted_at;

ALTER TABLE response_sessions
  ADD COLUMN IF NOT EXISTS sync_attempts         INTEGER   DEFAULT 0,
  ADD COLUMN IF NOT EXISTS sync_error            TEXT,
  ADD COLUMN IF NOT EXISTS sync_last_attempted_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_response_sessions_sync
  ON response_sessions(synced_to_sheets, sync_attempts)
  WHERE synced_to_sheets = false;

COMMENT ON COLUMN response_sessions.sync_attempts IS 'Número de tentativas de sync com Google Sheets';
COMMENT ON COLUMN response_sessions.sync_error IS 'Último erro de sync (null = sem erro)';
COMMENT ON COLUMN response_sessions.sync_last_attempted_at IS 'Timestamp da última tentativa de sync';
