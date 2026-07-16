-- Configura explicitamente a regua das perguntas de escala existentes.
-- A engine nao assume mais escala padrao compartilhada.

WITH scale_config AS (
  SELECT
    q.id,
    CASE
      WHEN s.slug IN ('amostral-2-2026', 'amostral1-2026', 'csat') THEN jsonb_build_object(
        'scaleValues', jsonb_build_array(6, 5, 4, 3, 2, 1),
        'scaleHighLabel', '6 - Muito Satisfeito',
        'scaleLowLabel', '1 - Muito Insatisfeito'
      )
      WHEN s.slug IN ('mais-raiz-2026', 'feedback-app-pesquisa') THEN jsonb_build_object(
        'scaleValues', jsonb_build_array(5, 4, 3, 2, 1),
        'scaleHighLabel', U&'5 - \00D3timo',
        'scaleLowLabel', U&'1 - P\00E9ssimo'
      )
      ELSE '{}'::jsonb
    END AS settings_patch
  FROM questions q
  JOIN surveys s ON s.id = q.survey_id
  WHERE q.type IN ('scale', 'scale_sections')
)
UPDATE questions q
SET settings = COALESCE(q.settings, '{}'::jsonb) || sc.settings_patch
FROM scale_config sc
WHERE sc.id = q.id
  AND sc.settings_patch <> '{}'::jsonb;

UPDATE questions q
SET description = U&'Avalie de 1 a 5: 1 = P\00E9ssimo, 2 = Ruim, 3 = Regular, 4 = Bom, 5 = \00D3timo.'
FROM surveys s
WHERE s.id = q.survey_id
  AND s.slug = 'mais-raiz-2026'
  AND q.key = 'avaliacao_aspectos_mais_raiz';