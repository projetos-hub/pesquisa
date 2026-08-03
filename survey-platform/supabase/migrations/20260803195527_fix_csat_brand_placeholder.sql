-- Uses the community brand in CSAT; fallback is only for previews without community context.
UPDATE questions AS q
SET
  title = CASE q.key
    WHEN 'welcome' THEN U&'Queremos ouvir a sua opini\00e3o!'
    WHEN 'nps' THEN U&'Qual \00e9 a probabilidade de voc\00ea recomendar {{marca|Raiz Educa\00e7\00e3o}} a um amigo ou colega?'
    ELSE q.title
  END,
  description = CASE q.key
    WHEN 'welcome' THEN U&'Ol\00e1, {{nome|fam\00edlia}}!\000a\000aAcreditamos que a parceria entre col\00e9gio e fam\00edlia \00e9 essencial para a forma\00e7\00e3o educacional de nossos alunos. Por meio desta pesquisa, voc\00ea poder\00e1 avaliar aspectos pedag\00f3gicos, administrativos e de infraestrutura da institui\00e7\00e3o de ensino {{marca|Raiz Educa\00e7\00e3o}}.\000a\000aSuas respostas ser\00e3o fundamentais para aprimorarmos continuamente a qualidade do nosso trabalho e garantirmos um ambiente ainda mais acolhedor e enriquecedor para os estudantes.\000a\000aAgradecemos sua participa\00e7\00e3o e colabora\00e7\00e3o!\000a\000aAtenciosamente,\000aEquipe {{marca|Raiz Educa\00e7\00e3o}}.'
    ELSE q.description
  END
FROM surveys AS s
WHERE q.survey_id = s.id
  AND s.slug = 'csat'
  AND q.key IN ('welcome', 'nps');

-- Keep the referral link at installation level so the thank-you step can
-- resolve it directly from the respondent community.
WITH brand_links (marca, link_key) AS (
  VALUES
    ('Apogeu', 'apogeu'),
    ('Apogeu Global School', 'apogeu-global'),
    (U&'Col\00e9gio Americano', 'americano'),
    (U&'Col\00e9gio Qi', 'qi'),
    (U&'Col\00e9gio Unificado', 'unificado'),
    (U&'Col\00e9gio Uni\00e3o', 'uniao'),
    ('Cubo Global School', 'cubo'),
    ('Escola SAP', 'sap'),
    (U&'Escola S\00e1 Pereira', 'sa-pereira'),
    ('Global Tree', 'global-tree'),
    ('Global Tree Botafogo', 'global-tree'),
    ('Leonardo da Vinci', 'clv'),
    (U&'Matriz Educa\00e7\00e3o', 'matriz'),
    ('Sarah Dawsey', 'sarah-dawsey')
), csat AS (
  SELECT id, settings
  FROM surveys
  WHERE slug = 'csat'
), resolved_links AS (
  SELECT
    sc.id AS installation_id,
    csat.settings->'indicacao_links'->>brand_links.link_key AS indicacao_link
  FROM survey_communities AS sc
  JOIN csat ON csat.id = sc.survey_id
  JOIN communities AS c ON c.community_id = sc.community_id
  JOIN brand_links ON brand_links.marca = c.marca
)
UPDATE survey_communities AS sc
SET theme = COALESCE(sc.theme, '{}'::jsonb)
  || jsonb_build_object('indicacaoLink', resolved_links.indicacao_link)
FROM resolved_links
