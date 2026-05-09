-- 015_communities_indicacao_link.sql
-- Adiciona indicacao_link como coluna global em communities.
-- Link de indicação é da escola, não da pesquisa.

ALTER TABLE communities ADD COLUMN IF NOT EXISTS indicacao_link TEXT NOT NULL DEFAULT '';

-- Fix RLS: communities tem dados públicos (logo, cores, links).
-- Survey API usa publishable key (anon) — precisa ler sem autenticação.
DROP POLICY IF EXISTS "authenticated_read" ON communities;
CREATE POLICY "public_read" ON communities FOR SELECT USING (true);

-- Seed: URLs de indicação por escola
UPDATE communities SET indicacao_link = 'https://cubo.global/quem-confia-indica'
  WHERE community_id IN ('w370xa35','ns8z5w8m','yxak8s0k','k4ys44r2');

UPDATE communities SET indicacao_link = 'https://apogeu.com.br/quem-confia-indica/'
  WHERE community_id IN ('apogeu-santoantonio-i','apogeu-santoantonio-ii');

UPDATE communities SET indicacao_link = 'https://apogeu.global/quem-confia-indica/'
  WHERE community_id IN ('yf24y2k7','fwnash24');

UPDATE communities SET indicacao_link = 'https://crechebomtempo.com.br/quem-confia-indica/'
  WHERE community_id = 'n6k47n81';

UPDATE communities SET indicacao_link = 'https://colegioleonardodavinci.com.br/quem-confia-indica/'
  WHERE community_id IN ('leonardodavinci-alfa','leonardodavinci-beta','leonardodavinci-gama');

UPDATE communities SET indicacao_link = 'https://crecheglobaltree.com.br/quem-confia-indica/'
  WHERE community_id = 'globaltree-abm';

UPDATE communities SET indicacao_link = 'https://matrizeducacao.com.br/quem-confia-indica/'
  WHERE community_id LIKE 'matriz-%';

UPDATE communities SET indicacao_link = 'https://colegioqi.com.br/quem-confia-indica/'
  WHERE community_id LIKE 'qi-%';

UPDATE communities SET indicacao_link = 'https://escolasapereira.com.br/quem-confia-indica/'
  WHERE community_id IN ('w213sfza','xa7y5zam');

UPDATE communities SET indicacao_link = 'https://escolasap.com.br/quem-confia-indica/'
  WHERE community_id = 'sap';

UPDATE communities SET indicacao_link = 'https://sdjf.com.br/quem-confia-indica/'
  WHERE community_id = 'sarahdawsey-juizdefora';

UPDATE communities SET indicacao_link = 'https://unificado.com.br/quem-confia-indica/'
  WHERE community_id = 'unificado-zonasul';

UPDATE communities SET indicacao_link = 'https://americanobilingue.com.br/quem-confia-indica/'
  WHERE community_id = 'americano';

UPDATE communities SET indicacao_link = 'https://colegiouniao.com.br/quem-confia-indica/'
  WHERE community_id = 'uniao';
