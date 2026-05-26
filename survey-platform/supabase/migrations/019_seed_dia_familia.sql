-- =============================================================
-- 019_seed_dia_familia.sql
-- Seed: Pesquisa de Satisfação – Dia da Família (Matriz, maio 2026)
-- Comunidades: todas as 10 unidades matriz-*
-- Período: 09/05/2026 08:00 → 12/05/2026 23:59 (horário de Brasília)
-- Idempotente via ON CONFLICT
-- =============================================================

DO $$
DECLARE
  v_survey_id  UUID;
  q1_id UUID; q2_id UUID; q3_id UUID; q4_id UUID; q5_id UUID;
  q6_id UUID; q7_id UUID;
  matriz_communities TEXT[] := ARRAY[
    'matriz-bangu',
    'matriz-campogrande',
    'matriz-caxias',
    'matriz-madureira',
    'matriz-novaiguacu',
    'matriz-rochamiranda',
    'matriz-retirodosartistas',
    'matriz-saojoaodemeriti',
    'matriz-taquara',
    'matriz-tijuca'
  ];
  comm TEXT;
BEGIN

-- ── 1. Survey ────────────────────────────────────────────────────────────────
INSERT INTO surveys (
  slug, title, description, survey_type, target_roles, status, access_control,
  open_date, close_date
)
VALUES (
  'dia-da-familia-2026',
  'Pesquisa de Satisfação – Dia da Família',
  'Sua opinião é essencial para aprimorarmos os próximos encontros.',
  'qualitativa',
  ARRAY['responsavel'],
  'ativa',
  'aberta',
  '2026-05-09 08:00:00' AT TIME ZONE 'America/Sao_Paulo',
  '2026-05-12 23:59:59' AT TIME ZONE 'America/Sao_Paulo'
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
  'Queridas famílias, o Dia da Família foi preparado com muito carinho para receber vocês em um momento especial de acolhimento, convivência e aproximação entre escola e família. A presença de vocês tornou esse dia ainda mais significativo. Sua resposta é essencial para seguirmos construindo experiências significativas junto com vocês!',
  false
);

-- ── 4. Perguntas ─────────────────────────────────────────────────────────────

-- Q1: Organização geral
INSERT INTO questions (survey_id, order_index, type, key, title, required, settings)
VALUES (
  v_survey_id, 1, 'radio', 'organizacao_geral', 'Organização do Evento', true,
  '{"pergunta": "Como você avalia a organização geral do Dia da Família? Considere acolhimento, estrutura, segurança e ambiente."}'
) RETURNING id INTO q1_id;

INSERT INTO question_options (question_id, order_index, label, value) VALUES
  (q1_id, 0, 'Excelente',  'opt_0'),
  (q1_id, 1, 'Boa',        'opt_1'),
  (q1_id, 2, 'Regular',    'opt_2'),
  (q1_id, 3, 'Ruim',       'opt_3');

-- Q2: Expectativas
INSERT INTO questions (survey_id, order_index, type, key, title, required, settings)
VALUES (
  v_survey_id, 2, 'radio', 'expectativas', 'Expectativas', true,
  '{"pergunta": "O encontro atendeu às suas expectativas?"}'
) RETURNING id INTO q2_id;

INSERT INTO question_options (question_id, order_index, label, value) VALUES
  (q2_id, 0, 'Superou minhas expectativas', 'opt_0'),
  (q2_id, 1, 'Atendeu plenamente',          'opt_1'),
  (q2_id, 2, 'Atendeu parcialmente',         'opt_2'),
  (q2_id, 3, 'Não atendeu',                 'opt_3');

-- Q3: Atividades e integração
INSERT INTO questions (survey_id, order_index, type, key, title, required, settings)
VALUES (
  v_survey_id, 3, 'radio', 'atividades_integracao', 'Atividades e Integração', true,
  '{"pergunta": "Como você avalia as atividades propostas e a integração entre famílias, alunos e equipe escolar durante o encontro?"}'
) RETURNING id INTO q3_id;

INSERT INTO question_options (question_id, order_index, label, value) VALUES
  (q3_id, 0, 'Excelente', 'opt_0'),
  (q3_id, 1, 'Boa',       'opt_1'),
  (q3_id, 2, 'Regular',   'opt_2'),
  (q3_id, 3, 'Ruim',      'opt_3');

-- Q4: Comunicação
INSERT INTO questions (survey_id, order_index, type, key, title, required, settings)
VALUES (
  v_survey_id, 4, 'radio', 'comunicacao', 'Comunicação', true,
  '{"pergunta": "A comunicação sobre o evento foi clara e suficiente?"}'
) RETURNING id INTO q4_id;

INSERT INTO question_options (question_id, order_index, label, value) VALUES
  (q4_id, 0, 'Sim',          'opt_0'),
  (q4_id, 1, 'Parcialmente', 'opt_1'),
  (q4_id, 2, 'Não',          'opt_2');

-- Q5: Valores e proposta educativa
INSERT INTO questions (survey_id, order_index, type, key, title, required, settings)
VALUES (
  v_survey_id, 5, 'radio', 'valores_proposta', 'Valores e Proposta Educativa', true,
  '{"pergunta": "O evento refletiu os valores e a proposta educativa do Matriz Educação?"}'
) RETURNING id INTO q5_id;

INSERT INTO question_options (question_id, order_index, label, value) VALUES
  (q5_id, 0, 'Sim, totalmente',          'opt_0'),
  (q5_id, 1, 'Em grande parte',           'opt_1'),
  (q5_id, 2, 'Parcialmente',              'opt_2'),
  (q5_id, 3, 'Não percebi essa relação',  'opt_3');

-- Q6: Momento marcante (aberta)
INSERT INTO questions (survey_id, order_index, type, key, title, required, settings)
VALUES (
  v_survey_id, 6, 'text', 'momento_marcante', 'Momento Marcante', false,
  '{"pergunta": "Qual foi o momento mais marcante para você e sua família?", "placeholder": "Compartilhe aqui..."}'
) RETURNING id INTO q6_id;

-- Q7: Sugestões (aberta)
INSERT INTO questions (survey_id, order_index, type, key, title, required, settings)
VALUES (
  v_survey_id, 7, 'text', 'sugestoes', 'Sugestões', false,
  '{"pergunta": "Deixe aqui suas sugestões para os próximos encontros:", "placeholder": "Escreva sua sugestão aqui..."}'
) RETURNING id INTO q7_id;

-- Tela de agradecimento
INSERT INTO questions (survey_id, order_index, type, key, title, required)
VALUES (v_survey_id, 8, 'thankyou', 'thankyou', 'Obrigado!', false);

-- ── 5. Instala em todas as unidades Matriz ────────────────────────────────────
FOREACH comm IN ARRAY matriz_communities LOOP
  INSERT INTO survey_communities (
    survey_id, community_id, status, open_date, close_date,
    theme, active
  ) VALUES (
    v_survey_id,
    comm,
    'ativa',
    '2026-05-09 08:00:00' AT TIME ZONE 'America/Sao_Paulo',
    '2026-05-12 23:59:59' AT TIME ZONE 'America/Sao_Paulo',
    '{"primaryColor":"#667eea","secondaryColor":"#764ba2","logo":""}',
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
