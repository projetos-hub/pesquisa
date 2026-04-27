-- 011_phase8_dispatch_audit.sql
-- Phase 8: notification_audit_logs + sample scope + pg_cron trigger

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

-- ─── 3. pg_cron trigger para /api/cron/process-dispatches ────────────────────
--
-- PRÉ-REQUISITO (rodar UMA VEZ no SQL Editor antes desta migration):
--   ALTER DATABASE postgres SET "app.cron_secret" = 'SEU_CRON_SECRET_AQUI';
--   SELECT pg_reload_conf();
--
-- pg_net e pg_cron já vêm habilitados em todo projeto Supabase.

CREATE OR REPLACE FUNCTION trigger_dispatch_processor()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  PERFORM net.http_post(
    url     := 'https://pesquisa-nu-sand.vercel.app/api/cron/process-dispatches',
    body    := '{}'::jsonb,
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.cron_secret'),
      'Content-Type',  'application/json'
    )
  );
END;
$$;

-- Agenda cron a cada 5 minutos (substitui Vercel Hobby que só roda 1x/dia)
SELECT cron.schedule(
  'dispatch-processor',
  '*/5 * * * *',
  'SELECT trigger_dispatch_processor()'
);
