-- =============================================================
-- 005_survey_communities.sql
-- Instalações de pesquisa por comunidade
-- Separa o template da pesquisa (surveys) da configuração
-- por escola: datas, status, identidade visual e overrides.
-- =============================================================

CREATE TABLE survey_communities (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  survey_id    UUID REFERENCES surveys(id) ON DELETE CASCADE,
  community_id TEXT NOT NULL,
  status       TEXT CHECK (status IN ('ativa','pausada','encerrada','nao_aberta')) DEFAULT 'nao_aberta',
  open_date    DATE,
  close_date   DATE,
  theme        JSONB DEFAULT '{}',
  settings     JSONB DEFAULT '{}',
  active       BOOLEAN DEFAULT true,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (survey_id, community_id)
);

CREATE INDEX idx_survey_communities_survey_id    ON survey_communities(survey_id);
CREATE INDEX idx_survey_communities_community_id ON survey_communities(community_id);
CREATE INDEX idx_survey_communities_status       ON survey_communities(status);

ALTER TABLE survey_communities ENABLE ROW LEVEL SECURITY;

-- Leitura pública das instalações ativas (necessário para a API de respondente)
CREATE POLICY "survey_communities_public_read" ON survey_communities
  FOR SELECT USING (active = true);

-- Trigger updated_at (reutiliza a função criada em 001)
CREATE TRIGGER update_survey_communities_updated_at
  BEFORE UPDATE ON survey_communities
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================================
-- Seed: instala o CSAT para todas as 40 comunidades autorizadas
-- Idempotente via ON CONFLICT DO NOTHING
-- =============================================================
DO $$
DECLARE
  v_survey_id  UUID;
  communities  TEXT[] := ARRAY[
    'americano',
    'yf24y2k7', 'fwnash24', 'apogeu-santoantonio-i', 'apogeu-santoantonio-ii', 'wmfkn49h',
    'ns8z5w8m', 'yxak8s0k', 'k4ys44r2',
    'leonardodavinci-alfa', 'leonardodavinci-beta', 'leonardodavinci-gama',
    'n6k47n81', 'w9593n19', 'rf3zk695', 'w95k0s77', 'globaltree-abm',
    'matriz-bangu', 'matriz-campogrande', 'matriz-caxias', 'matriz-madureira',
    'matriz-novaiguacu', 'matriz-rochamiranda', 'matriz-retirodosartistas',
    'matriz-saojoaodemeriti', 'matriz-taquara', 'matriz-tijuca',
    'qi-freguesia', 'qi-metropolitano', 'qi-recreio', 'qi-rio2', 'qi-tijuca', 'az51800x',
    'w213sfza', 'xa7y5zam',
    'sap',
    'sarahdawsey-juizdefora', 'y9490m37',
    'uniao',
    'unificado-zonasul'
  ];
  c TEXT;
BEGIN
  SELECT id INTO v_survey_id FROM surveys WHERE slug = 'csat';

  IF v_survey_id IS NULL THEN
    RAISE EXCEPTION 'Survey "csat" não encontrada — execute 002_seed_csat.sql primeiro.';
  END IF;

  FOREACH c IN ARRAY communities LOOP
    INSERT INTO survey_communities (survey_id, community_id, status, active)
    VALUES (v_survey_id, c, 'ativa', true)
    ON CONFLICT (survey_id, community_id) DO NOTHING;
  END LOOP;

  RAISE NOTICE 'survey_communities: % comunidades processadas para o CSAT.', array_length(communities, 1);
END $$;
