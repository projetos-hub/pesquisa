-- Configura textos por marca e template de disparo para a pesquisa Mais Raiz 2026.
-- Seguro para reexecutar: atualiza o template existente pelo nome ou cria um rascunho novo.

WITH target_survey AS (
  SELECT id
  FROM surveys
  WHERE slug = 'mais-raiz-2026'
), community_programs AS (
  SELECT
    sc.id AS survey_community_id,
    CASE
      WHEN concat_ws(' ', c.community_id, c.marca, c.nome_escola) ILIKE '%Cubo%' THEN 'Cubo After School'
      WHEN concat_ws(' ', c.community_id, c.marca, c.nome_escola) ILIKE '%Sá Pereira%'
        OR concat_ws(' ', c.community_id, c.marca, c.nome_escola) ILIKE '%Sa Pereira%' THEN 'Mais Sá Pereira'
      WHEN concat_ws(' ', c.community_id, c.marca, c.nome_escola) ILIKE '%SAP%' THEN 'Mais SAP'
      WHEN concat_ws(' ', c.community_id, c.marca, c.nome_escola) ILIKE '%Qi%' THEN 'Mais Qi'
      WHEN concat_ws(' ', c.community_id, c.marca, c.nome_escola) ILIKE '%Matriz%' THEN 'Mais Matriz'
      WHEN concat_ws(' ', c.community_id, c.marca, c.nome_escola) ILIKE '%Americano%' THEN 'Mais Americano'
      WHEN concat_ws(' ', c.community_id, c.marca, c.nome_escola) ILIKE '%União%'
        OR concat_ws(' ', c.community_id, c.marca, c.nome_escola) ILIKE '%Uniao%' THEN 'Mais União'
      WHEN concat_ws(' ', c.community_id, c.marca, c.nome_escola) ILIKE '%Unificado%' THEN 'Mais Unificado'
      WHEN concat_ws(' ', c.community_id, c.marca, c.nome_escola) ILIKE '%Global Tree%' THEN 'Mais Global Tree'
      WHEN concat_ws(' ', c.community_id, c.marca, c.nome_escola) ILIKE '%Apogeu%' THEN 'Mais Apogeu'
      ELSE NULL
    END AS programa_mais,
    CASE
      WHEN concat_ws(' ', c.community_id, c.marca, c.nome_escola) ILIKE '%Cubo%' THEN 'Cubo'
      WHEN concat_ws(' ', c.community_id, c.marca, c.nome_escola) ILIKE '%Sá Pereira%'
        OR concat_ws(' ', c.community_id, c.marca, c.nome_escola) ILIKE '%Sa Pereira%' THEN 'Sá Pereira'
      WHEN concat_ws(' ', c.community_id, c.marca, c.nome_escola) ILIKE '%SAP%' THEN 'SAP'
      WHEN concat_ws(' ', c.community_id, c.marca, c.nome_escola) ILIKE '%Qi%' THEN 'Qi'
      WHEN concat_ws(' ', c.community_id, c.marca, c.nome_escola) ILIKE '%Matriz%' THEN 'Matriz'
      WHEN concat_ws(' ', c.community_id, c.marca, c.nome_escola) ILIKE '%Americano%' THEN 'Americano'
      WHEN concat_ws(' ', c.community_id, c.marca, c.nome_escola) ILIKE '%União%'
        OR concat_ws(' ', c.community_id, c.marca, c.nome_escola) ILIKE '%Uniao%' THEN 'União'
      WHEN concat_ws(' ', c.community_id, c.marca, c.nome_escola) ILIKE '%Unificado%' THEN 'Unificado'
      WHEN concat_ws(' ', c.community_id, c.marca, c.nome_escola) ILIKE '%Global Tree%' THEN 'Global Tree'
      WHEN concat_ws(' ', c.community_id, c.marca, c.nome_escola) ILIKE '%Apogeu%' THEN 'Apogeu'
      ELSE NULL
    END AS equipe_marca
  FROM survey_communities sc
  JOIN target_survey ts ON ts.id = sc.survey_id
  JOIN communities c ON c.community_id = sc.community_id
  WHERE sc.active = true
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
FROM community_programs cp
WHERE sc.id = cp.survey_community_id
  AND cp.programa_mais IS NOT NULL
  AND cp.equipe_marca IS NOT NULL;

WITH target_survey AS (
  SELECT id
  FROM surveys
  WHERE slug = 'mais-raiz-2026'
), payload AS (
  SELECT
    id AS survey_id,
    'Mais Raiz 2026 - convite inicial'::text AS template_name,
    'O {{programaMais}} quer ouvir a sua opinião!'::text AS title,
    $$O {{programaMais}} oferece atividades extracurriculares que enriquecem a jornada dos estudantes com experiências de aprendizagem, desenvolvimento e convivência.

Sua opinião é muito importante para nós. Responda à pesquisa e compartilhe suas sugestões.

Agradecemos pela sua participação.

Equipe {{equipeMarca}}$$::text AS body
  FROM target_survey
), updated AS (
  UPDATE survey_dispatches d
  SET
    title = p.title,
    body = p.body,
    push_title = NULL,
    push_body = NULL,
    email_title = NULL,
    email_body = NULL,
    email_action_label = 'Responder pesquisa',
    email_background_url = NULL,
    channels = ARRAY['pushNotification', 'email'],
    target_scope = 'all',
    target_community_ids = NULL,
    target_group_alias = NULL,
    target_roles = ARRAY['guardian'],
    personalized = true,
    scheduled_at = NULL,
    status = 'draft',
    total_jobs = 0,
    completed_jobs = 0,
    failed_jobs = 0,
    is_template = true,
    template_name = p.template_name,
    sequence_steps = NULL,
    completed_at = NULL
  FROM payload p
  WHERE d.survey_id = p.survey_id
    AND d.is_template = true
    AND d.template_name = p.template_name
  RETURNING d.id
)
INSERT INTO survey_dispatches (
  survey_id,
  title,
  body,
  push_title,
  push_body,
  email_title,
  email_body,
  email_action_label,
  email_background_url,
  channels,
  target_scope,
  target_community_ids,
  target_group_alias,
  target_roles,
  personalized,
  scheduled_at,
  status,
  total_jobs,
  completed_jobs,
  failed_jobs,
  is_template,
  template_name,
  sequence_steps
)
SELECT
  survey_id,
  title,
  body,
  NULL,
  NULL,
  NULL,
  NULL,
  'Responder pesquisa',
  NULL,
  ARRAY['pushNotification', 'email'],
  'all',
  NULL,
  NULL,
  ARRAY['guardian'],
  true,
  NULL,
  'draft',
  0,
  0,
  0,
  true,
  template_name,
  NULL
FROM payload
WHERE NOT EXISTS (SELECT 1 FROM updated);