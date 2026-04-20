-- =============================================================
-- 010_survey_sample_lists.sql
-- Tabela de segmentação amostral por (survey, community, email)
-- Suporta múltiplos emails por usuário (aluno, pai fin, pai acad)
-- =============================================================

CREATE TABLE survey_sample_lists (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  survey_id       UUID NOT NULL REFERENCES surveys(id) ON DELETE CASCADE,
  community_id    TEXT NOT NULL,
  email           TEXT NOT NULL,
  nome            TEXT,
  layers_user_id  TEXT,  -- preenchido no upload via Layers /v1/users
  created_at      TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE (survey_id, community_id, email)
);

CREATE INDEX idx_sample_survey_community ON survey_sample_lists(survey_id, community_id);
CREATE INDEX idx_sample_email ON survey_sample_lists(email);
CREATE INDEX idx_sample_layers_user_id ON survey_sample_lists(layers_user_id);

ALTER TABLE survey_sample_lists ENABLE ROW LEVEL SECURITY;

-- Admin pode ler e gerenciar
CREATE POLICY "sample_admin_all" ON survey_sample_lists
  FOR ALL USING (EXISTS (SELECT 1 FROM admin_profiles WHERE id = auth.uid()));

-- Trigger updated_at (reutiliza função criada em 001)
CREATE TRIGGER update_survey_sample_lists_updated_at
  BEFORE UPDATE ON survey_sample_lists
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
