-- Adds detailed school identity fields while keeping nome_escola compatible.
ALTER TABLE communities
  ADD COLUMN IF NOT EXISTS marca TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS unidade TEXT NOT NULL DEFAULT '';

-- Backfill conservative defaults: keep existing display name as unidade until
-- admins split each school into Marca + Unidade in the identity screen.
UPDATE communities
SET unidade = nome_escola
WHERE unidade = ''
  AND nome_escola <> '';
