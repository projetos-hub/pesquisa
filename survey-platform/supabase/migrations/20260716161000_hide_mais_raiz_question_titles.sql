-- Oculta titulos de bloco nas perguntas da pesquisa Mais, mantendo apenas o texto da pergunta no formulario publico.

UPDATE questions q
SET settings = COALESCE(q.settings, '{}'::jsonb) || jsonb_build_object('hideTitle', true)
FROM surveys s
WHERE s.id = q.survey_id
  AND s.slug = 'mais-raiz-2026'
  AND q.type IN ('radio', 'checkbox', 'text');