-- Personaliza o texto inicial da pesquisa +RAIZ para comunidades Colégio Qi.
-- Mantem outros overrides existentes em survey_communities.settings.

WITH qi_installations AS (
  SELECT sc.id
  FROM survey_communities sc
  JOIN surveys s ON s.id = sc.survey_id
  JOIN communities c ON c.community_id = sc.community_id
  WHERE s.slug = 'mais-raiz-2026'
    AND c.marca = 'Colégio Qi'
)
UPDATE survey_communities sc
SET
  settings =
    COALESCE(sc.settings, '{}'::jsonb)
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
            'title',
            $$O Mais Qi quer ouvir a sua opinião!$$,
            'description',
            $$O Mais Qi oferece atividades extracurriculares que enriquecem a jornada dos estudantes com experiências de aprendizagem, desenvolvimento e convivência.

Sua opinião é muito importante para nós. Responda à pesquisa e compartilhe suas sugestões.

Agradecemos pela sua participação.

Equipe Qi$$
          )
        )
      )
    ),
  updated_at = NOW()
WHERE sc.id IN (SELECT id FROM qi_installations);
