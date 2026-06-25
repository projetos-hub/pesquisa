-- Backfills Marca + Unidade for known Layers communities.
UPDATE communities AS c
SET
  marca = v.marca,
  unidade = v.unidade,
  nome_escola = concat_ws(
    ' ',
    nullif(v.marca, ''),
    nullif(CASE WHEN v.unidade = 'Geral' THEN '' ELSE v.unidade END, '')
  )
FROM (
  VALUES
    ('americano', 'Colégio Americano', 'Geral'),
    ('apogeu-santoantonio-i', 'Apogeu', 'Santo Antônio I'),
    ('apogeu-santoantonio-ii', 'Apogeu', 'Santo Antônio II'),
    ('az51800x', 'Colégio Qi', 'Valqueire'),
    ('fwnash24', 'Apogeu Global School', 'Ferreira Guimarães'),
    ('globaltree-abm', 'Global Tree', 'Bosque Marapendi'),
    ('k4ys44r2', 'Cubo Global School', 'Barra Golf'),
    ('leonardodavinci-alfa', 'Leonardo da Vinci', 'Alfa'),
    ('leonardodavinci-beta', 'Leonardo da Vinci', 'Beta'),
    ('leonardodavinci-gama', 'Leonardo da Vinci', 'Gama'),
    ('matriz-bangu', 'Matriz Educação', 'Bangu'),
    ('matriz-campogrande', 'Matriz Educação', 'Campo Grande'),
    ('matriz-caxias', 'Matriz Educação', 'Caxias'),
    ('matriz-madureira', 'Matriz Educação', 'Madureira'),
    ('matriz-novaiguacu', 'Matriz Educação', 'Nova Iguaçu'),
    ('matriz-retirodosartistas', 'Matriz Educação', 'Retiro dos Artistas'),
    ('matriz-rochamiranda', 'Matriz Educação', 'Rocha Miranda'),
    ('matriz-saojoaodemeriti', 'Matriz Educação', 'São João de Meriti'),
    ('matriz-taquara', 'Matriz Educação', 'Taquara'),
    ('matriz-tijuca', 'Matriz Educação', 'Tijuca'),
    ('n6k47n81', 'Global Tree', 'Botafogo'),
    ('ns8z5w8m', 'Cubo Global School', 'Botafogo'),
    ('qi-freguesia', 'Colégio Qi', 'Freguesia'),
    ('qi-metropolitano', 'Colégio Qi', 'Metropolitano'),
    ('qi-recreio', 'Colégio Qi', 'Recreio'),
    ('qi-rio2', 'Colégio Qi', 'Rio 2'),
    ('qi-tijuca', 'Colégio Qi', 'Tijuca'),
    ('raizeducacao', 'Raiz Educação', 'E2E Tema'),
    ('rf3zk695', 'Global Tree', 'Península'),
    ('sap', 'Escola SAP', 'Geral'),
    ('sarahdawsey-juizdefora', 'Sarah Dawsey', 'Juiz de Fora'),
    ('uniao', 'Colégio União', 'Geral'),
    ('unificado', 'Colégio Unificado', 'Geral'),
    ('unificado-zonasul', 'Colégio Unificado', 'Zona Sul'),
    ('w213sfza', 'Escola Sá Pereira', 'Infantil e 1º ano'),
    ('w9593n19', 'Global Tree', 'Barra Golf'),
    ('w95k0s77', 'Global Tree', 'Rio 2'),
    ('wmfkn49h', 'Apogeu', 'Zona Norte'),
    ('xa7y5zam', 'Escola Sá Pereira', 'Fundamental e Médio'),
    ('y9490m37', 'Sarah Dawsey', 'Tijuca'),
    ('yf24y2k7', 'Apogeu Global School', 'Cidade Alta'),
    ('yxak8s0k', 'Cubo Global School', 'Bosque Marapendi')
) AS v(community_id, marca, unidade)
WHERE c.community_id = v.community_id;
