-- 011_phase8_dispatch_audit.sql
-- Phase 8: notification_audit_logs + sample scope
--
-- NOTA: A função pg_cron (trigger_dispatch_processor) e o agendamento
-- NÃO estão nesta migration porque requerem o CRON_SECRET que não pode
-- ficar em arquivos versionados. Rode o snippet em docs/snippets/011_pgcron.sql
-- manualmente no Supabase SQL Editor após aplicar esta migration.

-- ─── 1. Extend target_scope to include 'sample' ───────────────────────────────

ALTER TABLE survey_dispatches
  DROP CONSTRAINT IF EXISTS survey_dispatches_target_scope_check;

ALTER TABLE survey_dispatches
  ADD CONSTRAINT survey_dispatches_target_scope_check
    CHECK (target_scope IN ('all', 'communities', 'group', 'sample'));

-- ─── 2. notification_audit_logs ───────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS notification_audit_logs (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  dispatch_id UUID        NOT NULL REFERENCES survey_dispatches(id) ON DELETE CASCADE,
  job_id      UUID        REFERENCES survey_dispatch_jobs(id) ON DELETE SET NULL,
  email       TEXT        NOT NULL,
  nome        TEXT,
  status      TEXT        NOT NULL CHECK (status IN ('sent', 'failed')),
  error       TEXT,
  sent_at     TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_dispatch_id ON notification_audit_logs(dispatch_id);
CREATE INDEX IF NOT EXISTS idx_audit_email       ON notification_audit_logs(email);
CREATE INDEX IF NOT EXISTS idx_audit_status      ON notification_audit_logs(status);
CREATE INDEX IF NOT EXISTS idx_audit_created_at  ON notification_audit_logs(created_at DESC);

ALTER TABLE notification_audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_read_audit_logs"
  ON notification_audit_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM admin_profiles WHERE id = auth.uid()
    )
  );
