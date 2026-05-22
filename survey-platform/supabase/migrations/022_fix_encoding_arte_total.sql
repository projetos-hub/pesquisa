-- =============================================================
-- 022_fix_encoding_arte_total.sql
-- Corrige encoding corrompido (UTF-8 lido como Latin-1) da survey
-- exposicao-arte-total-2026. Atualiza surveys + questions + options.
-- =============================================================

DO $$
DECLARE
  v_survey_id UUID;
  v_q1 UUID; v_q2 UUID; v_q3 UUID; v_q4 UUID; v_q5 UUID; v_q6 UUID;
BEGIN

-- ── 1. Survey ────────────────────────────────────────────────────────────────
UPDATE surveys SET
  title       = 'Pesquisa de Satisfação – Exposição Cultural "Arte Total"',
  description = 'Sua opinião é essencial para que possamos continuar aprimorando nossas propostas e construindo, juntos, experiências ainda mais encantadoras e significativas para nossas crianças.',
  updated_at  = NOW()
WHERE slug = 'exposicao-arte-total-2026'
RETURNING id INTO v_survey_id;

IF v_survey_id IS NULL THEN
  RAISE EXCEPTION 'Survey exposicao-arte-total-2026 nao encontrada';
END IF;

-- ── 2. Tela de boas-vindas ───────────────────────────────────────────────────
UPDATE questions SET
  description = 'Olá, família Global Tree! Que alegria ter vocês conosco na Exposição Cultural "Arte Total"! Esse foi um momento repleto de cores, expressões, criações e descobertas incríveis vivenciadas pelas crianças ao longo de suas investigações artísticas. Cada detalhe foi cuidadosamente planejado para refletir a sensibilidade, a criatividade e a intencionalidade presentes no nosso fazer pedagógico. Agora, gostaríamos muito de ouvir você! Sua opinião é essencial para que possamos continuar aprimorando nossas propostas e construindo, juntos, experiências ainda mais encantadoras e significativas para nossas crianças. Com carinho, Equipe Global Tree 🌳',
  updated_at  = NOW()
WHERE survey_id = v_survey_id AND key = 'welcome';

-- ── 3. Q1: Ambiente ──────────────────────────────────────────────────────────
UPDATE questions SET
  settings   = '{"pergunta": "Como você avalia o ambiente da Exposição \"Arte Total\"? (Considere organização, acolhimento e proposta visual do evento)"}',
  updated_at = NOW()
WHERE survey_id = v_survey_id AND key = 'ambiente_exposicao'
RETURNING id INTO v_q1;

-- ── 4. Q2: Expectativas ──────────────────────────────────────────────────────
UPDATE questions SET
  settings   = '{"pergunta": "A exposição atendeu às suas expectativas?"}',
  updated_at = NOW()
WHERE survey_id = v_survey_id AND key = 'expectativas'
RETURNING id INTO v_q2;

UPDATE question_options SET label = 'Superou minhas expectativas' WHERE question_id = v_q2 AND value = 'opt_0';
UPDATE question_options SET label = 'Atendeu completamente'       WHERE question_id = v_q2 AND value = 'opt_1';
UPDATE question_options SET label = 'Atendeu parcialmente'        WHERE question_id = v_q2 AND value = 'opt_2';
UPDATE question_options SET label = 'Não atendeu'                 WHERE question_id = v_q2 AND value = 'opt_3';

-- ── 5. Q3: Participação ──────────────────────────────────────────────────────
UPDATE questions SET
  settings   = '{"pergunta": "Como você avalia a participação e envolvimento das crianças nas atividades apresentadas?"}',
  updated_at = NOW()
WHERE survey_id = v_survey_id AND key = 'participacao_criancas'
RETURNING id INTO v_q3;

UPDATE question_options SET label = 'Boa' WHERE question_id = v_q3 AND value = 'opt_1';

-- ── 6. Q4: Comunicação ──────────────────────────────────────────────────────
UPDATE questions SET
  settings   = '{"pergunta": "A comunicação da escola em relação ao evento foi clara e suficiente?"}',
  updated_at = NOW()
WHERE survey_id = v_survey_id AND key = 'comunicacao'
RETURNING id INTO v_q4;

UPDATE question_options SET label = 'Não'         WHERE question_id = v_q4 AND value = 'opt_2';
UPDATE question_options SET label = 'Parcialmente' WHERE question_id = v_q4 AND value = 'opt_1';

-- ── 7. Q5: Ponto positivo ────────────────────────────────────────────────────
UPDATE questions SET
  settings   = '{"pergunta": "O que mais chamou sua atenção de forma positiva?", "placeholder": "Compartilhe aqui..."}',
  updated_at = NOW()
WHERE survey_id = v_survey_id AND key = 'ponto_positivo'
RETURNING id INTO v_q5;

-- ── 8. Q6: Sugestões ─────────────────────────────────────────────────────────
UPDATE questions SET
  settings   = '{"pergunta": "Há algo que você gostaria de sugerir para as próximas edições?", "placeholder": "Escreva sua sugestão aqui..."}',
  updated_at = NOW()
WHERE survey_id = v_survey_id AND key = 'sugestoes'
RETURNING id INTO v_q6;

RAISE NOTICE 'Encoding corrigido para survey %', v_survey_id;

END $$;
