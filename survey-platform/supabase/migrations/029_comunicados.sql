-- Migration: 028_comunicados
-- Criado em: 2026-06-02
-- Tabela de comunicados para integração com a Layers Education

CREATE TABLE IF NOT EXISTS comunicados (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  survey_id    UUID REFERENCES surveys(id),
  community_id TEXT NOT NULL,
  title        TEXT NOT NULL,
  description  TEXT NOT NULL,
  category     TEXT DEFAULT 'Avisos',
  target_scope TEXT DEFAULT 'all'
    CHECK (target_scope IN ('all', 'groups', 'sample')),
  targets      JSONB NOT NULL DEFAULT '{"groups": ["all"]}',
  author_name  TEXT DEFAULT 'Raiz Educação',
  attachments  JSONB DEFAULT '[]',
  approved     BOOLEAN DEFAULT true,
  status       TEXT DEFAULT 'published'
    CHECK (status IN ('draft', 'published', 'archived')),
  created_at   TIMESTAMPTZ DEFAULT now(),
  updated_at   TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_comunicados_community_status
  ON comunicados(community_id, status);

CREATE INDEX IF NOT EXISTS idx_comunicados_updated_at
  ON comunicados(community_id, updated_at DESC)
  WHERE status = 'published';

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION update_comunicados_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER comunicados_updated_at
  BEFORE UPDATE ON comunicados
  FOR EACH ROW
  EXECUTE FUNCTION update_comunicados_updated_at();
