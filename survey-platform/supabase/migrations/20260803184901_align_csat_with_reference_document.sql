-- Alinha a pesquisa CSAT ao documento "PESQUISA CSAT - ENQUETE".
-- Preserva respostas historicas ao materializar os indices na nova ordem antes
-- de alterar os textos e order_index das opcoes.

UPDATE questions AS q
SET
  title = 'Queremos ouvir a sua opini?o',
  description = $welcome$Ol?!

Acreditamos que a parceria entre col?gio e fam?lia ? essencial para a forma??o educacional de nossos alunos. Por meio desta pesquisa, voc? poder? avaliar aspectos pedag?gicos, administrativos e de infraestrutura do/a {{marca|col?gio/escola/creche}}.
Suas respostas ser?o fundamentais para aprimorarmos continuamente a qualidade do nosso trabalho e garantirmos um ambiente ainda mais acolhedor e enriquecedor para os estudantes.
Agradecemos sua participa??o e colabora??o!
Atenciosamente,
Equipe {{marca|col?gio/escola/creche}}$welcome$
FROM surveys AS s
WHERE q.survey_id = s.id
  AND s.slug = 'csat'
  AND q.key = 'welcome';

UPDATE questions AS q
SET
  title = 'Qual ? a probabilidade de voc? recomendar o Col?gio/escola/creche a um amigo ou colega?',
  description = 'Considere 10 como "Extremamente prov?vel" e 0 como "Nada prov?vel".',
  required = true,
  settings = (COALESCE(q.settings, '{}'::jsonb) - 'perguntaBilingue') || jsonb_build_object(
    'order', 'asc',
    'lowLabel', 'Nada prov?vel',
    'highLabel', 'Extremamente prov?vel'
  )
FROM surveys AS s
WHERE q.survey_id = s.id
  AND s.slug = 'csat'
  AND q.key = 'nps';

WITH old_order AS (
  SELECT 1
  FROM surveys AS s
  JOIN questions AS q ON q.survey_id = s.id AND q.key = 'pedagogico'
  JOIN question_options AS qo ON qo.question_id = q.id
  WHERE s.slug = 'csat'
    AND qo.value = 'p_q1'
    AND qo.order_index = 1
  LIMIT 1
)
UPDATE responses AS r
SET value = CASE r.question_key
  WHEN 'pedagogico' THEN r.value || jsonb_build_object(
    '0', COALESCE(r.value->'0', (SELECT item.value FROM jsonb_each(r.value) AS item WHERE item.key LIKE 'Qualidade do ensino%' LIMIT 1)),
    '1', COALESCE(r.value->'2', (SELECT item.value FROM jsonb_each(r.value) AS item WHERE item.key LIKE 'Acolhimento%' LIMIT 1)),
    '2', COALESCE(r.value->'1', (SELECT item.value FROM jsonb_each(r.value) AS item WHERE item.key LIKE 'Recursos%' LIMIT 1))
  )
  WHEN 'administrativo' THEN r.value || jsonb_build_object(
    '0', COALESCE(r.value->'1', (SELECT item.value FROM jsonb_each(r.value) AS item WHERE item.key LIKE 'Atendimento%' LIMIT 1)),
    '1', COALESCE(r.value->'2', (SELECT item.value FROM jsonb_each(r.value) AS item WHERE item.key LIKE 'Canais%' LIMIT 1)),
    '2', COALESCE(r.value->'0', (SELECT item.value FROM jsonb_each(r.value) AS item WHERE item.key LIKE 'Gest%' LIMIT 1))
  )
  WHEN 'infraestrutura' THEN r.value || jsonb_build_object(
    '0', COALESCE(r.value->'1', (SELECT item.value FROM jsonb_each(r.value) AS item WHERE item.key LIKE 'Higiene%' LIMIT 1)),
    '1', COALESCE(r.value->'2', (SELECT item.value FROM jsonb_each(r.value) AS item WHERE item.key LIKE 'Alimenta%' LIMIT 1)),
    '2', COALESCE(r.value->'0', (SELECT item.value FROM jsonb_each(r.value) AS item WHERE item.key LIKE 'Conforto%' LIMIT 1))
  )
  ELSE r.value
END
FROM response_sessions AS rs, old_order
WHERE r.session_id = rs.id
  AND rs.survey_id = (SELECT id FROM surveys WHERE slug = 'csat')
  AND r.question_key IN ('pedagogico', 'administrativo', 'infraestrutura')
  AND jsonb_typeof(r.value) = 'object';

UPDATE questions AS q
SET
  order_index = CASE q.key
    WHEN 'welcome' THEN 1
    WHEN 'nps' THEN 2
    WHEN 'pedagogico' THEN 4
    WHEN 'administrativo' THEN 5
    WHEN 'infraestrutura' THEN 6
    WHEN 'thankyou' THEN 8
    ELSE q.order_index
  END,
  description = CASE
    WHEN q.key IN ('pedagogico', 'administrativo', 'infraestrutura')
      THEN 'Avalie considerando 6 como "Muito Satisfeito" e 1 como "Muito Insatisfeito".'
    ELSE q.description
  END,
  required = CASE
    WHEN q.key IN ('nps', 'pedagogico', 'administrativo', 'infraestrutura') THEN true
    ELSE q.required
  END
FROM surveys AS s
WHERE q.survey_id = s.id
  AND s.slug = 'csat';

INSERT INTO questions (survey_id, order_index, type, key, title, description, required, settings)
SELECT
  s.id, 3, 'text', 'motivo_avaliacao',
  'Qual o motivo da sua avalia??o?', NULL, true,
  jsonb_build_object(
    'pergunta', 'Qual o motivo da sua avalia??o?',
    'placeholder', 'Conte-nos o motivo da sua avalia??o...'
  )
FROM surveys AS s
WHERE s.slug = 'csat'
ON CONFLICT (survey_id, key) DO UPDATE SET
  order_index = EXCLUDED.order_index,
  type = EXCLUDED.type,
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  required = EXCLUDED.required,
  settings = EXCLUDED.settings;

INSERT INTO questions (survey_id, order_index, type, key, title, description, required, settings)
SELECT
  s.id, 7, 'text', 'sugestoes_comentarios',
  'Estamos interessados em ouvir suas ideias! Por favor, compartilhe suas sugest?es ou coment?rios:', NULL, false,
  jsonb_build_object(
    'pergunta', 'Estamos interessados em ouvir suas ideias! Por favor, compartilhe suas sugest?es ou coment?rios:',
    'placeholder', 'Compartilhe suas sugest?es ou coment?rios...'
  )
FROM surveys AS s
WHERE s.slug = 'csat'
ON CONFLICT (survey_id, key) DO UPDATE SET
  order_index = EXCLUDED.order_index,
  type = EXCLUDED.type,
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  required = EXCLUDED.required,
  settings = EXCLUDED.settings;

UPDATE question_options AS qo
SET
  order_index = CASE qo.value
    WHEN 'p_q0' THEN 0 WHEN 'p_q2' THEN 1 WHEN 'p_q1' THEN 2
    WHEN 'a_q1' THEN 0 WHEN 'a_q2' THEN 1 WHEN 'a_q0' THEN 2
    WHEN 'i_q1' THEN 0 WHEN 'i_q2' THEN 1 WHEN 'i_q0' THEN 2
    ELSE qo.order_index
  END,
  label = CASE qo.value
    WHEN 'p_q0' THEN 'Qualidade do ensino (professores, metodologias e est?mulo ao aprendizado)'
    WHEN 'p_q2' THEN 'Acolhimento e desenvolvimento emocional (aten??o ao aluno e apoio ?s fam?lias)'
    WHEN 'p_q1' THEN 'Recursos pedag?gicos e suporte no integral/ateli? (plataformas, materiais e integral)'
    WHEN 'a_q1' THEN 'Atendimento ao p?blico (secretaria e financeiro)'
    WHEN 'a_q2' THEN 'Canais de comunica??o (informa??es no app escolar, e-mail e redes sociais)'
    WHEN 'a_q0' THEN 'Gest?o e organiza??o escolar'
    WHEN 'i_q1' THEN 'Higiene e conserva??o (limpeza geral e banheiros)'
    WHEN 'i_q2' THEN 'Alimenta??o e servi?os de apoio (cantina, refei??o, variedades, organiza??o)'
    WHEN 'i_q0' THEN 'Conforto e seguran?a dos espa?os (salas, conviv?ncia e recep??o)'
    ELSE qo.label
  END
FROM questions AS q
JOIN surveys AS s ON s.id = q.survey_id
WHERE qo.question_id = q.id
  AND s.slug = 'csat'
  AND q.key IN ('pedagogico', 'administrativo', 'infraestrutura');

-- Regrava os textos com escapes Unicode para manter a migration independente
-- da pagina de codigo do terminal Windows.
UPDATE questions AS q
SET
  title = CASE q.key
    WHEN 'welcome' THEN U&'Queremos ouvir a sua opini\00e3o'
    WHEN 'nps' THEN U&'Qual \00e9 a probabilidade de voc\00ea recomendar o Col\00e9gio/escola/creche a um amigo ou colega?'
    WHEN 'motivo_avaliacao' THEN U&'Qual o motivo da sua avalia\00e7\00e3o?'
    WHEN 'sugestoes_comentarios' THEN U&'Estamos interessados em ouvir suas ideias! Por favor, compartilhe suas sugest\00f5es ou coment\00e1rios:'
    ELSE q.title
  END,
  description = CASE q.key
    WHEN 'welcome' THEN U&'Ol\00e1!\000a\000aAcreditamos que a parceria entre col\00e9gio e fam\00edlia \00e9 essencial para a forma\00e7\00e3o educacional de nossos alunos. Por meio desta pesquisa, voc\00ea poder\00e1 avaliar aspectos pedag\00f3gicos, administrativos e de infraestrutura do/a {{marca|col\00e9gio/escola/creche}}.\000aSuas respostas ser\00e3o fundamentais para aprimorarmos continuamente a qualidade do nosso trabalho e garantirmos um ambiente ainda mais acolhedor e enriquecedor para os estudantes.\000aAgradecemos sua participa\00e7\00e3o e colabora\00e7\00e3o!\000aAtenciosamente,\000aEquipe {{marca|col\00e9gio/escola/creche}}'
    WHEN 'nps' THEN U&'Considere 10 como "Extremamente prov\00e1vel" e 0 como "Nada prov\00e1vel".'
    ELSE q.description
  END,
  settings = CASE q.key
    WHEN 'nps' THEN jsonb_build_object('order', 'asc', 'lowLabel', U&'Nada prov\00e1vel', 'highLabel', U&'Extremamente prov\00e1vel')
    WHEN 'motivo_avaliacao' THEN jsonb_build_object('pergunta', U&'Qual o motivo da sua avalia\00e7\00e3o?', 'placeholder', U&'Conte-nos o motivo da sua avalia\00e7\00e3o...')
    WHEN 'sugestoes_comentarios' THEN jsonb_build_object('pergunta', U&'Estamos interessados em ouvir suas ideias! Por favor, compartilhe suas sugest\00f5es ou coment\00e1rios:', 'placeholder', U&'Compartilhe suas sugest\00f5es ou coment\00e1rios...')
    ELSE q.settings
  END
FROM surveys AS s
WHERE q.survey_id = s.id
  AND s.slug = 'csat';

UPDATE question_options AS qo
SET label = CASE qo.value
  WHEN 'p_q0' THEN U&'Qualidade do ensino (professores, metodologias e est\00edmulo ao aprendizado)'
  WHEN 'p_q2' THEN U&'Acolhimento e desenvolvimento emocional (aten\00e7\00e3o ao aluno e apoio \00e0s fam\00edlias)'
  WHEN 'p_q1' THEN U&'Recursos pedag\00f3gicos e suporte no integral/ateli\00ea (plataformas, materiais e integral)'
  WHEN 'a_q1' THEN U&'Atendimento ao p\00fablico (secretaria e financeiro)'
  WHEN 'a_q2' THEN U&'Canais de comunica\00e7\00e3o (informa\00e7\00f5es no app escolar, e-mail e redes sociais)'
  WHEN 'a_q0' THEN U&'Gest\00e3o e organiza\00e7\00e3o escolar'
  WHEN 'i_q1' THEN U&'Higiene e conserva\00e7\00e3o (limpeza geral e banheiros)'
  WHEN 'i_q2' THEN U&'Alimenta\00e7\00e3o e servi\00e7os de apoio (cantina, refei\00e7\00e3o, variedades, organiza\00e7\00e3o)'
  WHEN 'i_q0' THEN U&'Conforto e seguran\00e7a dos espa\00e7os (salas, conviv\00eancia e recep\00e7\00e3o)'
  ELSE qo.label
END
FROM questions AS q
JOIN surveys AS s ON s.id = q.survey_id
WHERE qo.question_id = q.id
  AND s.slug = 'csat'
  AND q.key IN ('pedagogico', 'administrativo', 'infraestrutura');
