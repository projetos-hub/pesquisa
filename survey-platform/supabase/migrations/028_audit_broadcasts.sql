-- =============================================================
-- 028_audit_broadcasts.sql
-- Tabela de disparos para auditoria manual (canal: layers, whatsapp, email, outro)
-- e campo expected_responses em survey_communities
--
-- NOTA: Esta tabela é separada de survey_broadcasts (que registra disparos
-- automáticos via Layers API). audit_broadcasts registra MANUALMENTE quando
-- o admin enviou uma comunicação por qualquer canal.
--
-- DOWN:
--   DROP TABLE IF EXISTS audit_broadcasts;
--   ALTER TABLE survey_communities DROP COLUMN IF EXISTS expected_responses;
-- =============================================================

CREATE TABLE IF NOT EXISTS audit_broadcasts (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  survey_id     UUID NOT NULL REFERENCES surveys(id) ON DELETE CASCADE,
  fired_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  fired_by      UUID REFERENCES auth.users(id),
  channel       TEXT NOT NULL CHECK (channel IN ('layers', 'whatsapp', 'email', 'outro')),
  community_ids TEXT[] NOT NULL DEFAULT '{}',
  notes         TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_audit_broadcasts_survey_id ON audit_broadcasts(survey_id);
CREATE INDEX idx_audit_broadcasts_fired_at  ON audit_broadcasts(fired_at DESC);

ALTER TABLE audit_broadcasts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "audit_broadcasts_admin_read" ON audit_broadcasts
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM admin_profiles WHERE id = (SELECT auth.uid()))
  );

CREATE POLICY "audit_broadcasts_admin_write" ON audit_broadcasts
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM admin_profiles WHERE id = (SELECT auth.uid()))
  );

-- Coluna para total esperado de respondentes por instalação (escola × pesquisa)
-- Permite calcular taxa de resposta real: respondido / esperado × 100
-- NULL = escola não informou o total

ALTER TABLE survey_communities
  ADD COLUMN IF NOT EXISTS expected_responses INTEGER DEFAULT NULL;
