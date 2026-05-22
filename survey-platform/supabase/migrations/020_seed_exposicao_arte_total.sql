-- =============================================================
-- 020_seed_exposicao_arte_total.sql
-- Seed: Pesquisa de Satisfação – Exposição Cultural "Arte Total"
-- Comunidades: todas as unidades Global Tree (coligada 9 + 17)
-- Período: 27/05/2026 08:00 → 30/05/2026 23:59 (horário de Brasília)
-- Idempotente via ON CONFLICT
-- =============================================================

DO $$
DECLARE
  v_survey_id  UUID;
  q1_id UUID; q2_id UUID; q3_id UUID; q4_id UUID; q5_id UUID; q6_id UUID;
  globaltree_communities TEXT[] := ARRAY[
    'globaltree-abm',   -- Global Tree Bosque Marapendi
    'n6k47n81',         -- Global Tree Botafogo
    'rf3zk695',         -- Global Tree Península
    'w9593n19',         -- Global Tree Barra Golf
    'w95k0s77',         -- Global Tree (unidade a confirmar)
    'creche-globaltree',-- Creche Escola Global Tree - Rio 2
    'w370xa35'          -- Global Tree Rio 2
  ];
  comm TEXT;
BEGIN

-- ── 1. Survey ────────────────────────────────────────────────────────────────
INSERT INTO surveys (
  slug, title, description, survey_type, target_roles, status, access_control,
  open_date, close_date
)
VALUES (
  'exposicao-arte-total-2026',
  'Pesquisa de Satisfação – Exposição Cultural "Arte Total"',
  'Sua opinião é essencial para que possamos continuar aprimorando nossas propostas e construindo, juntos, experiências ainda mais encantadoras e significativas para nossas crianças.',
  'qualitativa',
  ARRAY['responsavel'],
  'ativa',
  'aberta',
  '2026-05-27 08:00:00' AT TIME ZONE 'America/Sao_Paulo',
  '2026-05-30 23:59:59' AT TIME ZONE 'America/Sao_Paulo'
)
ON CONFLICT (slug) DO UPDATE SET
  title          = EXCLUDED.title,
  description    = EXCLUDED.description,
  status         = EXCLUDED.status,
  access_control = EXCLUDED.access_control,
  open_date      = EXCLUDED.open_date,
  close_date     = EXCLUDED.close_date,
  updated_at     = NOW()
RETURNING id INTO v_survey_id;

-- ── 2. Limpa perguntas existentes (garante idempotência) ─────────────────────
DELETE FROM questions WHERE survey_id = v_survey_id;

-- ── 3. Tela de boas-vindas ───────────────────────────────────────────────────
INSERT INTO questions (survey_id, order_index, type, key, title, description, required)
VALUES (
  v_survey_id, 0, 'welcome', 'welcome', 'Bem-vindo',
  'Olá, família Global Tree! Que alegria ter vocês conosco na Exposição Cultural "Arte Total"! Esse foi um momento repleto de cores, expressões, criações e descobertas incríveis vivenciadas pelas crianças ao longo de suas investigações artísticas. Cada detalhe foi cuidadosamente planejado para refletir a sensibilidade, a criatividade e a intencionalidade presentes no nosso fazer pedagógico. Agora, gostaríamos muito de ouvir você! Sua opinião é essencial para que possamos continuar aprimorando nossas propostas e construindo, juntos, experiências ainda mais encantadoras e significativas para nossas crianças. Com carinho, Equipe Global Tree 🌳',
  false
);

-- ── 4. Perguntas ─────────────────────────────────────────────────────────────

-- Q1: Ambiente da exposição
INSERT INTO questions (survey_id, order_index, type, key, title, required, settings)
VALUES (
  v_survey_id, 1, 'radio', 'ambiente_exposicao', 'Ambiente da Exposição', false,
  '{"pergunta": "Como você avalia o ambiente da Exposição \"Arte Total\"? (Considere organização, acolhimento e proposta visual do evento)"}'
) RETURNING id INTO q1_id;

INSERT INTO question_options (question_id, order_index, label, value) VALUES
  (q1_id, 0, 'Excelente', 'opt_0'),
  (q1_id, 1, 'Bom',       'opt_1'),
  (q1_id, 2, 'Regular',   'opt_2'),
  (q1_id, 3, 'Ruim',      'opt_3');

-- Q2: Expectativas
INSERT INTO questions (survey_id, order_index, type, key, title, required, settings)
VALUES (
  v_survey_id, 2, 'radio', 'expectativas', 'Expectativas', false,
  '{"pergunta": "A exposição atendeu às suas expectativas?"}'
) RETURNING id INTO q2_id;

INSERT INTO question_options (question_id, order_index, label, value) VALUES
  (q2_id, 0, 'Superou minhas expectativas', 'opt_0'),
  (q2_id, 1, 'Atendeu completamente',        'opt_1'),
  (q2_id, 2, 'Atendeu parcialmente',          'opt_2'),
  (q2_id, 3, 'Não atendeu',                  'opt_3');

-- Q3: Participação das crianças (obrigatória)
INSERT INTO questions (survey_id, order_index, type, key, title, required, settings)
VALUES (
  v_survey_id, 3, 'radio', 'participacao_criancas', 'Participação das Crianças', true,
  '{"pergunta": "Como você avalia a participação e envolvimento das crianças nas atividades apresentadas?"}'
) RETURNING id INTO q3_id;

INSERT INTO question_options (question_id, order_index, label, value) VALUES
  (q3_id, 0, 'Excelente', 'opt_0'),
  (q3_id, 1, 'Boa',       'opt_1'),
  (q3_id, 2, 'Regular',   'opt_2'),
  (q3_id, 3, 'Ruim',      'opt_3');

-- Q4: Comunicação (obrigatória)
INSERT INTO questions (survey_id, order_index, type, key, title, required, settings)
VALUES (
  v_survey_id, 4, 'radio', 'comunicacao', 'Comunicação', true,
  '{"pergunta": "A comunicação da escola em relação ao evento foi clara e suficiente?"}'
) RETURNING id INTO q4_id;

INSERT INTO question_options (question_id, order_index, label, value) VALUES
  (q4_id, 0, 'Sim',          'opt_0'),
  (q4_id, 1, 'Parcialmente', 'opt_1'),
  (q4_id, 2, 'Não',          'opt_2');

-- Q5: Ponto positivo (aberta, obrigatória)
INSERT INTO questions (survey_id, order_index, type, key, title, required, settings)
VALUES (
  v_survey_id, 5, 'text', 'ponto_positivo', 'Ponto Positivo', true,
  '{"pergunta": "O que mais chamou sua atenção de forma positiva?", "placeholder": "Compartilhe aqui..."}'
) RETURNING id INTO q5_id;

-- Q6: Sugestões (aberta, opcional)
INSERT INTO questions (survey_id, order_index, type, key, title, required, settings)
VALUES (
  v_survey_id, 6, 'text', 'sugestoes', 'Sugestões', false,
  '{"pergunta": "Há algo que você gostaria de sugerir para as próximas edições?", "placeholder": "Escreva sua sugestão aqui..."}'
) RETURNING id INTO q6_id;

-- Tela de agradecimento
INSERT INTO questions (survey_id, order_index, type, key, title, required)
VALUES (v_survey_id, 7, 'thankyou', 'thankyou', 'Obrigado!', false);

-- ── 5. Instala em todas as unidades Global Tree ───────────────────────────────
FOREACH comm IN ARRAY globaltree_communities LOOP
  INSERT INTO survey_communities (
    survey_id, community_id, status, open_date, close_date,
    theme, active
  ) VALUES (
    v_survey_id,
    comm,
    'ativa',
    '2026-05-27 08:00:00' AT TIME ZONE 'America/Sao_Paulo',
    '2026-05-30 23:59:59' AT TIME ZONE 'America/Sao_Paulo',
    '{"primaryColor":"#2e7d32","secondaryColor":"#66bb6a","logo":""}',
    true
  )
  ON CONFLICT (survey_id, community_id) DO UPDATE SET
    status     = EXCLUDED.status,
    open_date  = EXCLUDED.open_date,
    close_date = EXCLUDED.close_date,
    active     = EXCLUDED.active,
    updated_at = NOW();
END LOOP;

END $$;
