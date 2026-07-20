-- Completa o mapeamento de programa/equipe para marcas instaladas na Mais Raiz 2026
-- que nao estavam na lista inicial. Seguro para reexecutar.

WITH target_survey AS (
  SELECT id
  FROM surveys
  WHERE slug = 'mais-raiz-2026'
), community_programs AS (
  SELECT *
  FROM (
    VALUES
      ('leonardodavinci-alfa', 'Mais Leonardo Da Vinci', 'Leonardo Da Vinci'),
      ('leonardodavinci-beta', 'Mais Leonardo Da Vinci', 'Leonardo Da Vinci'),
      ('leonardodavinci-gama', 'Mais Leonardo Da Vinci', 'Leonardo Da Vinci'),
      ('sarahdawsey-juizdefora', 'Mais Sarah Dawsey', 'Sarah Dawsey'),
      ('y9490m37', 'Mais Sarah Dawsey', 'Sarah Dawsey'),
      ('raizeducacao', 'Mais Raiz', 'Raiz')
  ) AS v(community_id, programa_mais, equipe_marca)
)
UPDATE survey_communities sc
SET
  theme = jsonb_set(
    jsonb_set(
      COALESCE(sc.theme, '{}'::jsonb),
      '{programaMais}',
      to_jsonb(cp.programa_mais),
      true
    ),
    '{equipeMarca}',
    to_jsonb(cp.equipe_marca),
    true
  ),
  settings = COALESCE(sc.settings, '{}'::jsonb)
    || jsonb_build_object(
      'contentOverrides',
      COALESCE(sc.settings->'contentOverrides', '{}'::jsonb)
      || jsonb_build_object(
        'questions',
        COALESCE(sc.settings#>'{contentOverrides,questions}', '{}'::jsonb)
        || jsonb_build_object(
          'welcome',
          COALESCE(sc.settings#>'{contentOverrides,questions,welcome}', '{}'::jsonb)
          || jsonb_build_object(
            'title', 'O {{programaMais}} quer ouvir a sua opinião!',
            'description', $$O {{programaMais}} oferece atividades extracurriculares que enriquecem a jornada dos estudantes com experiências de aprendizagem, desenvolvimento e convivência.

Sua opinião é muito importante para nós. Responda à pesquisa e compartilhe suas sugestões.

Agradecemos pela sua participação.

Equipe {{equipeMarca}}$$
          )
        )
      )
    ),
  updated_at = NOW()
FROM target_survey ts, community_programs cp
WHERE sc.survey_id = ts.id
  AND sc.community_id = cp.community_id
  AND sc.active = true;