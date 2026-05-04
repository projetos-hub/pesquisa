-- 014_communities_table.sql
-- Fonte única de verdade para identidade visual das comunidades.
-- Elimina dependência de herança frágil entre survey_communities.

CREATE TABLE IF NOT EXISTS communities (
  community_id    TEXT PRIMARY KEY,
  nome_escola     TEXT NOT NULL DEFAULT '',
  primary_color   TEXT NOT NULL DEFAULT '#667eea',
  secondary_color TEXT NOT NULL DEFAULT '#764ba2',
  logo            TEXT NOT NULL DEFAULT '',
  updated_at      TIMESTAMPTZ DEFAULT now()
);

-- Migrar dados: pegar o tema mais completo por comunidade
INSERT INTO communities (community_id, nome_escola, primary_color, secondary_color, logo)
SELECT DISTINCT ON (community_id)
  community_id,
  COALESCE(NULLIF(theme->>'nomeEscola', ''), community_id),
  COALESCE(NULLIF(theme->>'primaryColor', ''), '#667eea'),
  COALESCE(NULLIF(theme->>'secondaryColor', ''), '#764ba2'),
  COALESCE(theme->>'logo', '')
FROM survey_communities
WHERE theme IS NOT NULL AND theme != '{}'::jsonb
ORDER BY
  community_id,
  (theme->>'primaryColor' IS NOT NULL AND theme->>'primaryColor' != '#667eea') DESC,
  updated_at DESC NULLS LAST
ON CONFLICT (community_id) DO NOTHING;

-- Inserir comunidades sem tema configurado com defaults
INSERT INTO communities (community_id, nome_escola, primary_color, secondary_color, logo)
SELECT DISTINCT community_id, community_id, '#667eea', '#764ba2', ''
FROM survey_communities
WHERE community_id NOT IN (SELECT community_id FROM communities)
ON CONFLICT (community_id) DO NOTHING;

-- RLS
ALTER TABLE communities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated_read" ON communities
  FOR SELECT USING (auth.role() = 'authenticated');

-- Escrita via service role (bypass RLS automático nas server actions)
