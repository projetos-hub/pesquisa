-- Corrige a semântica da escala de avaliação da pesquisa de atividades extracurriculares.

UPDATE questions q
SET description = 'Avalie de 1 a 5: 1 = Péssimo, 2 = Ruim, 3 = Regular, 4 = Bom, 5 = Ótimo.'
FROM surveys s
WHERE s.id = q.survey_id
  AND s.slug = 'mais-raiz-2026'
  AND q.key = 'avaliacao_aspectos_mais_raiz';
