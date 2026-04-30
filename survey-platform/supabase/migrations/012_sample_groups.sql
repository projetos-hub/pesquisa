-- =============================================================
-- 012_sample_groups.sql
-- Grupos de segmentação dentro da amostra
-- Permite criar grupos nomeados e atribuir entradas manualmente
-- =============================================================

-- 1. Adicionar perfil à amostra (salvo durante resolução via Layers)
ALTER TABLE survey_sample_lists ADD COLUMN IF NOT EXISTS perfil TEXT;
CREATE INDEX IF NOT EXISTS idx_sample_perfil ON survey_sample_lists(survey_id, perfil);

-- 2. Tabela de grupos
CREATE TABLE survey_sample_groups (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  survey_id   UUID NOT NULL REFERENCES surveys(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  color       TEXT NOT NULL DEFAULT '#6366f1',
  created_at  TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE (survey_id, name)
);

CREATE INDEX idx_sample_groups_survey ON survey_sample_groups(survey_id);

ALTER TABLE survey_sample_groups ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sample_groups_admin" ON survey_sample_groups
  FOR ALL USING (EXISTS (SELECT 1 FROM admin_profiles WHERE id = auth.uid()));

-- 3. Membros do grupo (many-to-many)
CREATE TABLE survey_sample_group_members (
  group_id   UUID NOT NULL REFERENCES survey_sample_groups(id)  ON DELETE CASCADE,
  sample_id  UUID NOT NULL REFERENCES survey_sample_lists(id)   ON DELETE CASCADE,
  added_at   TIMESTAMPTZ DEFAULT NOW(),

  PRIMARY KEY (group_id, sample_id)
);

CREATE INDEX idx_group_members_group  ON survey_sample_group_members(group_id);
CREATE INDEX idx_group_members_sample ON survey_sample_group_members(sample_id);

ALTER TABLE survey_sample_group_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "group_members_admin" ON survey_sample_group_members
  FOR ALL USING (EXISTS (SELECT 1 FROM admin_profiles WHERE id = auth.uid()));
