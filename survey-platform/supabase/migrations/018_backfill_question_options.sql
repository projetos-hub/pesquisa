-- Popula question_options para perguntas scale/radio/checkbox que não têm opções,
-- a partir de questions.settings->>'accept' (labels separados por \n).
-- Necessário para perguntas criadas antes do fix de createQuestion que passou a
-- auto-popular question_options na criação.
DO $$
DECLARE
  q      RECORD;
  labels TEXT[];
  label  TEXT;
  idx    INT;
BEGIN
  FOR q IN
    SELECT id, settings, type
    FROM questions
    WHERE type IN ('scale', 'radio', 'checkbox')
      AND id NOT IN (SELECT DISTINCT question_id FROM question_options)
      AND settings->>'accept' IS NOT NULL
      AND settings->>'accept' != ''
  LOOP
    labels := string_to_array(q.settings->>'accept', E'\n');
    idx := 0;
    FOREACH label IN ARRAY labels LOOP
      label := trim(label);
      IF length(label) > 0 THEN
        INSERT INTO question_options (question_id, order_index, label, value)
        VALUES (q.id, idx, label, 'opt_' || idx)
        ON CONFLICT DO NOTHING;
        idx := idx + 1;
      END IF;
    END LOOP;
  END LOOP;
END $$;
