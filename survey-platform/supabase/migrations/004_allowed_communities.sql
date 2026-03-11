UPDATE surveys
SET settings = jsonb_set(
  COALESCE(settings, '{}'),
  '{allowed_communities}',
  jsonb_build_array(
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
  )
)
WHERE slug = 'csat';
