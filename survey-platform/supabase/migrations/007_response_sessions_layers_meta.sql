-- =============================================================
-- 007_response_sessions_layers_meta.sql
-- Adiciona campos de perfil Layers à response_sessions:
--   email       — e-mail do respondente (Layers Hub API)
--   layers_meta — demais campos do perfil (roles, lastSeenAt,
--                 groupsIds, membersId, address, fields)
-- =============================================================

ALTER TABLE response_sessions
  ADD COLUMN IF NOT EXISTS email       TEXT,
  ADD COLUMN IF NOT EXISTS layers_meta JSONB DEFAULT '{}';

-- Index para buscas por email
CREATE INDEX IF NOT EXISTS idx_response_sessions_email
  ON response_sessions(email);

-- DOWN:
-- ALTER TABLE response_sessions DROP COLUMN IF EXISTS email;
-- ALTER TABLE response_sessions DROP COLUMN IF EXISTS layers_meta;
-- DROP INDEX IF EXISTS idx_response_sessions_email;
