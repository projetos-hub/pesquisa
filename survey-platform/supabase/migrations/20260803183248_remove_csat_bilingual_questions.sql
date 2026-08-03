-- Remove a pergunta de participacao no programa bilingue do NPS e a etapa
-- condicional de avaliacao bilingue da pesquisa CSAT.
-- Respostas historicas permanecem preservadas para auditoria.

UPDATE questions AS q
SET settings = COALESCE(q.settings, '{}'::jsonb) - 'perguntaBilingue'
FROM surveys AS s
WHERE q.survey_id = s.id
  AND s.slug = 'csat'
  AND q.key = 'nps';

UPDATE responses AS r
SET question_id = NULL
WHERE r.question_id IN (
  SELECT q.id
  FROM questions AS q
  JOIN surveys AS s ON s.id = q.survey_id
  WHERE s.slug = 'csat'
    AND q.key = 'bilingue'
);

WITH deleted_question AS (
  DELETE FROM questions AS q
  USING surveys AS s
  WHERE q.survey_id = s.id
    AND s.slug = 'csat'
    AND q.key = 'bilingue'
  RETURNING q.survey_id, q.order_index
)
UPDATE questions AS q
SET order_index = q.order_index - 1
FROM deleted_question AS deleted
WHERE q.survey_id = deleted.survey_id
  AND q.order_index > deleted.order_index;
