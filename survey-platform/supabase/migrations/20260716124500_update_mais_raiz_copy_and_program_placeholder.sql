-- Atualiza textos da pesquisa de atividades extracurriculares e prepara o nome do programa Mais por comunidade.

WITH target_survey AS (
  SELECT id
  FROM surveys
  WHERE slug = 'mais-raiz-2026'
)
UPDATE surveys s
SET
  title = 'Pesquisa de satisfação – Atividades extracurriculares',
  description = 'Pesquisa identificada sobre atividades extracurriculares.',
  settings = jsonb_set(
    COALESCE(s.settings, '{}'::jsonb),
    '{theme}',
    COALESCE(s.settings->'theme', '{}'::jsonb)
    || jsonb_build_object(
      'programaMais', 'Mais Raiz',
      'thankyouMessage', 'Obrigado(a) pela sua resposta! Ela contribui diretamente para a melhoria das atividades extracurriculares.'
    ),
    true
  ),
  updated_at = NOW()
WHERE s.id IN (SELECT id FROM target_survey);

WITH target_survey AS (
  SELECT id
  FROM surveys
  WHERE slug = 'mais-raiz-2026'
)
UPDATE questions q
SET
  title = replace(q.title, '+RAIZ', '{{programaMais}}'),
  description = CASE
    WHEN q.description IS NULL THEN NULL
    ELSE replace(q.description, '+RAIZ', '{{programaMais}}')
  END,
  settings = replace(COALESCE(q.settings, '{}'::jsonb)::text, '+RAIZ', '{{programaMais}}')::jsonb
WHERE q.survey_id IN (SELECT id FROM target_survey);

WITH target_survey AS (
  SELECT id
  FROM surveys
  WHERE slug = 'mais-raiz-2026'
), target_questions AS (
  SELECT id
  FROM questions
  WHERE survey_id IN (SELECT id FROM target_survey)
)
UPDATE question_options qo
SET
  label = replace(qo.label, '+RAIZ', '{{programaMais}}'),
  value = replace(qo.value, '+RAIZ', '{{programaMais}}')
WHERE qo.question_id IN (SELECT id FROM target_questions);

WITH target_survey AS (
  SELECT id
  FROM surveys
  WHERE slug = 'mais-raiz-2026'
)
UPDATE questions q
SET
  title = 'Participação no {{programaMais}}',
  settings = q.settings || jsonb_build_object(
    'pergunta', 'O(a) aluno(a) participa atualmente de atividades extracurriculares do {{programaMais}}?'
  )
WHERE q.survey_id IN (SELECT id FROM target_survey)
  AND q.key = 'participacao_mais_raiz';

WITH target_survey AS (
  SELECT id
  FROM surveys
  WHERE slug = 'mais-raiz-2026'
)
UPDATE questions q
SET
  title = 'Por qual motivo você atribuiu essa nota?',
  settings = q.settings || jsonb_build_object(
    'pergunta', 'Por qual motivo você atribuiu essa nota?'
  )
WHERE q.survey_id IN (SELECT id FROM target_survey)
  AND q.key = 'motivo_nps_mais_raiz';

WITH target_survey AS (
  SELECT id
  FROM surveys
  WHERE slug = 'mais-raiz-2026'
)
UPDATE questions q
SET
  title = 'Avalie os aspectos',
  description = 'Avalie cada aspecto de 1 a 5, sendo 1 = Muito insatisfeito e 5 = Muito satisfeito.'
WHERE q.survey_id IN (SELECT id FROM target_survey)
  AND q.key = 'avaliacao_aspectos_mais_raiz';

WITH target_survey AS (
  SELECT id
  FROM surveys
  WHERE slug = 'mais-raiz-2026'
)
UPDATE questions q
SET
  description = 'Queremos ouvir sua percepção sobre as atividades extracurriculares do {{programaMais}}. A pesquisa é identificada para que possamos analisar as respostas por comunidade e segmento.'
WHERE q.survey_id IN (SELECT id FROM target_survey)
  AND q.key = 'welcome';

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
  theme = COALESCE(sc.theme, '{}'::jsonb) || jsonb_build_object('programaMais', 'Mais Qi'),
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
            'title', 'O {{programaMais}} quer ouvir a sua opinião!',
            'description', $$O {{programaMais}} oferece atividades extracurriculares que enriquecem a jornada dos estudantes com experiências de aprendizagem, desenvolvimento e convivência.

Sua opinião é muito importante para nós. Responda à pesquisa e compartilhe suas sugestões.

Agradecemos pela sua participação.

Equipe Qi$$
          )
        )
      )
    ),
  updated_at = NOW()
WHERE sc.id IN (SELECT id FROM qi_installations);