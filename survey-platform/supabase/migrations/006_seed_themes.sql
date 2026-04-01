-- =============================================================
-- 006_seed_themes.sql
-- Seed inicial de nomeEscola + cores padrão da plataforma
-- para todos os registros de survey_communities.
--
-- Intenção: corrigir o WelcomeStep que exibia o tipo da pesquisa
-- em vez do nome da escola (theme vazio → nomeEscola undefined).
--
-- Cores: padrão da plataforma (#667eea / #764ba2) para todas as
-- escolas. Atualizar individualmente quando levantar as marcas:
--
--   UPDATE survey_communities
--   SET theme = jsonb_set(jsonb_set(theme,
--     '{primaryColor}', '"#hex1"'),
--     '{secondaryColor}', '"#hex2"'
--   )
--   WHERE community_id = 'escola-id';
--
-- Logo: adicionar depois do upload no Supabase Storage:
--
--   UPDATE survey_communities
--   SET theme = jsonb_set(theme,
--     '{logo}',
--     '"https://{ref}.supabase.co/storage/v1/object/public/school-assets/logos/{id}.svg"'
--   )
--   WHERE community_id = 'escola-id';
--
-- DOWN: para reverter, setar theme = '{}' em todas as linhas.
-- =============================================================

-- Escolas com nome legível derivado do community_id
UPDATE survey_communities SET theme = '{"nomeEscola":"Americano","primaryColor":"#667eea","secondaryColor":"#764ba2","logo":""}' WHERE community_id = 'americano';
UPDATE survey_communities SET theme = '{"nomeEscola":"Apogeu Santo Antônio I","primaryColor":"#667eea","secondaryColor":"#764ba2","logo":""}' WHERE community_id = 'apogeu-santoantonio-i';
UPDATE survey_communities SET theme = '{"nomeEscola":"Apogeu Santo Antônio II","primaryColor":"#667eea","secondaryColor":"#764ba2","logo":""}' WHERE community_id = 'apogeu-santoantonio-ii';
UPDATE survey_communities SET theme = '{"nomeEscola":"Leonardo da Vinci Alfa","primaryColor":"#667eea","secondaryColor":"#764ba2","logo":""}' WHERE community_id = 'leonardodavinci-alfa';
UPDATE survey_communities SET theme = '{"nomeEscola":"Leonardo da Vinci Beta","primaryColor":"#667eea","secondaryColor":"#764ba2","logo":""}' WHERE community_id = 'leonardodavinci-beta';
UPDATE survey_communities SET theme = '{"nomeEscola":"Leonardo da Vinci Gama","primaryColor":"#667eea","secondaryColor":"#764ba2","logo":""}' WHERE community_id = 'leonardodavinci-gama';
UPDATE survey_communities SET theme = '{"nomeEscola":"Global Tree ABM","primaryColor":"#667eea","secondaryColor":"#764ba2","logo":""}' WHERE community_id = 'globaltree-abm';
UPDATE survey_communities SET theme = '{"nomeEscola":"Matriz Bangu","primaryColor":"#667eea","secondaryColor":"#764ba2","logo":""}' WHERE community_id = 'matriz-bangu';
UPDATE survey_communities SET theme = '{"nomeEscola":"Matriz Campo Grande","primaryColor":"#667eea","secondaryColor":"#764ba2","logo":""}' WHERE community_id = 'matriz-campogrande';
UPDATE survey_communities SET theme = '{"nomeEscola":"Matriz Caxias","primaryColor":"#667eea","secondaryColor":"#764ba2","logo":""}' WHERE community_id = 'matriz-caxias';
UPDATE survey_communities SET theme = '{"nomeEscola":"Matriz Madureira","primaryColor":"#667eea","secondaryColor":"#764ba2","logo":""}' WHERE community_id = 'matriz-madureira';
UPDATE survey_communities SET theme = '{"nomeEscola":"Matriz Nova Iguaçu","primaryColor":"#667eea","secondaryColor":"#764ba2","logo":""}' WHERE community_id = 'matriz-novaiguacu';
UPDATE survey_communities SET theme = '{"nomeEscola":"Matriz Rocha Miranda","primaryColor":"#667eea","secondaryColor":"#764ba2","logo":""}' WHERE community_id = 'matriz-rochamiranda';
UPDATE survey_communities SET theme = '{"nomeEscola":"Matriz Retiro dos Artistas","primaryColor":"#667eea","secondaryColor":"#764ba2","logo":""}' WHERE community_id = 'matriz-retirodosartistas';
UPDATE survey_communities SET theme = '{"nomeEscola":"Matriz São João de Meriti","primaryColor":"#667eea","secondaryColor":"#764ba2","logo":""}' WHERE community_id = 'matriz-saojoaodemeriti';
UPDATE survey_communities SET theme = '{"nomeEscola":"Matriz Taquara","primaryColor":"#667eea","secondaryColor":"#764ba2","logo":""}' WHERE community_id = 'matriz-taquara';
UPDATE survey_communities SET theme = '{"nomeEscola":"Matriz Tijuca","primaryColor":"#667eea","secondaryColor":"#764ba2","logo":""}' WHERE community_id = 'matriz-tijuca';
UPDATE survey_communities SET theme = '{"nomeEscola":"QI Freguesia","primaryColor":"#667eea","secondaryColor":"#764ba2","logo":""}' WHERE community_id = 'qi-freguesia';
UPDATE survey_communities SET theme = '{"nomeEscola":"QI Metropolitano","primaryColor":"#667eea","secondaryColor":"#764ba2","logo":""}' WHERE community_id = 'qi-metropolitano';
UPDATE survey_communities SET theme = '{"nomeEscola":"QI Recreio","primaryColor":"#667eea","secondaryColor":"#764ba2","logo":""}' WHERE community_id = 'qi-recreio';
UPDATE survey_communities SET theme = '{"nomeEscola":"QI Rio2","primaryColor":"#667eea","secondaryColor":"#764ba2","logo":""}' WHERE community_id = 'qi-rio2';
UPDATE survey_communities SET theme = '{"nomeEscola":"QI Tijuca","primaryColor":"#667eea","secondaryColor":"#764ba2","logo":""}' WHERE community_id = 'qi-tijuca';
UPDATE survey_communities SET theme = '{"nomeEscola":"SAP","primaryColor":"#667eea","secondaryColor":"#764ba2","logo":""}' WHERE community_id = 'sap';
UPDATE survey_communities SET theme = '{"nomeEscola":"Sarah Dawsey Juiz de Fora","primaryColor":"#667eea","secondaryColor":"#764ba2","logo":""}' WHERE community_id = 'sarahdawsey-juizdefora';
UPDATE survey_communities SET theme = '{"nomeEscola":"União","primaryColor":"#667eea","secondaryColor":"#764ba2","logo":""}' WHERE community_id = 'uniao';
UPDATE survey_communities SET theme = '{"nomeEscola":"Unificado Zona Sul","primaryColor":"#667eea","secondaryColor":"#764ba2","logo":""}' WHERE community_id = 'unificado-zonasul';

-- IDs opacos (hash) — usar community_id como placeholder até confirmar o nome real
-- Atualizar nomeEscola quando souber o nome de cada uma:
--   UPDATE survey_communities SET theme = jsonb_set(theme, '{nomeEscola}', '"Nome Real"') WHERE community_id = 'yf24y2k7';
UPDATE survey_communities SET theme = '{"nomeEscola":"yf24y2k7","primaryColor":"#667eea","secondaryColor":"#764ba2","logo":""}' WHERE community_id = 'yf24y2k7';
UPDATE survey_communities SET theme = '{"nomeEscola":"fwnash24","primaryColor":"#667eea","secondaryColor":"#764ba2","logo":""}' WHERE community_id = 'fwnash24';
UPDATE survey_communities SET theme = '{"nomeEscola":"wmfkn49h","primaryColor":"#667eea","secondaryColor":"#764ba2","logo":""}' WHERE community_id = 'wmfkn49h';
UPDATE survey_communities SET theme = '{"nomeEscola":"ns8z5w8m","primaryColor":"#667eea","secondaryColor":"#764ba2","logo":""}' WHERE community_id = 'ns8z5w8m';
UPDATE survey_communities SET theme = '{"nomeEscola":"yxak8s0k","primaryColor":"#667eea","secondaryColor":"#764ba2","logo":""}' WHERE community_id = 'yxak8s0k';
UPDATE survey_communities SET theme = '{"nomeEscola":"k4ys44r2","primaryColor":"#667eea","secondaryColor":"#764ba2","logo":""}' WHERE community_id = 'k4ys44r2';
UPDATE survey_communities SET theme = '{"nomeEscola":"n6k47n81","primaryColor":"#667eea","secondaryColor":"#764ba2","logo":""}' WHERE community_id = 'n6k47n81';
UPDATE survey_communities SET theme = '{"nomeEscola":"w9593n19","primaryColor":"#667eea","secondaryColor":"#764ba2","logo":""}' WHERE community_id = 'w9593n19';
UPDATE survey_communities SET theme = '{"nomeEscola":"rf3zk695","primaryColor":"#667eea","secondaryColor":"#764ba2","logo":""}' WHERE community_id = 'rf3zk695';
UPDATE survey_communities SET theme = '{"nomeEscola":"w95k0s77","primaryColor":"#667eea","secondaryColor":"#764ba2","logo":""}' WHERE community_id = 'w95k0s77';
UPDATE survey_communities SET theme = '{"nomeEscola":"az51800x","primaryColor":"#667eea","secondaryColor":"#764ba2","logo":""}' WHERE community_id = 'az51800x';
UPDATE survey_communities SET theme = '{"nomeEscola":"w213sfza","primaryColor":"#667eea","secondaryColor":"#764ba2","logo":""}' WHERE community_id = 'w213sfza';
UPDATE survey_communities SET theme = '{"nomeEscola":"xa7y5zam","primaryColor":"#667eea","secondaryColor":"#764ba2","logo":""}' WHERE community_id = 'xa7y5zam';
UPDATE survey_communities SET theme = '{"nomeEscola":"y9490m37","primaryColor":"#667eea","secondaryColor":"#764ba2","logo":""}' WHERE community_id = 'y9490m37';
