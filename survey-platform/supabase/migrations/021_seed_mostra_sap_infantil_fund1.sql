-- =============================================================
-- 021_seed_mostra_sap_infantil_fund1.sql
-- Seed: Pesquisa de Satisfação – Mostra da Educação Infantil e do Ensino Fundamental I
-- Comunidade: SAP (community_id = 'sap')
-- Público-alvo: pais/responsáveis de Infantil e Fund I
--   → restrição por segmento feita via sample dispatch (não há split de community_id para SAP)
-- Período: 22/05/2026 08:00 → 25/05/2026 23:59 (horário de Brasília)
-- Idempotente via ON CONFLICT
-- =============================================================

DO $$
DECLARE
  v_survey_id  UUID;
  q1_id UUID; q2_id UUID; q3_id UUID; q4_id UUID; q5_id UUID; q6_id UUID;
BEGIN

-- ── 1. Survey ────────────────────────────────────────────────────────────────
INSERT INTO surveys (
  slug, title, description, survey_type, target_roles, status, access_control,
  open_date, close_date
)
VALUES (
  'mostra-sap-infantil-fund1-2026',
  'Pesquisa de Satisfação – Mostra da Educação Infantil e do Ensino Fundamental I',
  'Sua opinião é essencial para seguirmos aprimorando e construindo, juntos, experiências pedagógicas que inspirem, acolham e encantem nossas crianças.',
  'qualitativa',
  ARRAY['responsavel'],
  'ativa',
  'aberta',
  '2026-05-22 08:00:00' AT TIME ZONE 'America/Sao_Paulo',
  '2026-05-25 23:59:59' AT TIME ZONE 'America/Sao_Paulo'
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
  'Olá, família SAP! Receber vocês na Mostra da Educação Infantil e do Ensino Fundamental I foi um momento de grande alegria para toda a nossa comunidade escolar. Cada detalhe foi cuidadosamente pensado pelas crianças e pela equipe pedagógica, com afeto, intencionalidade e propósito. Agora, gostaríamos de ouvir você. Como foi essa vivência para sua família? Sua opinião é essencial para seguirmos aprimorando e construindo, juntos, experiências pedagógicas que inspirem, acolham e encantem nossas crianças. 💛',
  false
);

-- ── 4. Perguntas ─────────────────────────────────────────────────────────────

-- Q1: Ambiente da Mostra
INSERT INTO questions (survey_id, order_index, type, key, title, required, settings)
VALUES (
  v_survey_id, 1, 'radio', 'ambiente_mostra', 'Ambiente da Mostra', false,
  '{"pergunta": "Como você avalia o ambiente da Mostra (Considerando acolhimento, organização e clima do evento)?"}'
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
  '{"pergunta": "A Mostra atendeu às suas expectativas?"}'
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
  '{"pergunta": "Como você avalia a participação e apresentação das crianças?"}'
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
  '{"pergunta": "A comunicação da escola sobre o evento foi clara e suficiente?"}'
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

-- ── 5. Instala na comunidade SAP ──────────────────────────────────────────────
-- Restrição a Infantil + Fund I é feita via sample dispatch — não via community_id
-- (SAP tem um único community_id; split por segmento existe só no Sá Pereira)
INSERT INTO survey_communities (
  survey_id, community_id, status, open_date, close_date,
  theme, active
) VALUES (
  v_survey_id,
  'sap',
  'ativa',
  '2026-05-22 08:00:00' AT TIME ZONE 'America/Sao_Paulo',
  '2026-05-25 23:59:59' AT TIME ZONE 'America/Sao_Paulo',
  '{"primaryColor":"#f57c00","secondaryColor":"#ffb74d","logo":""}',
  true
)
ON CONFLICT (survey_id, community_id) DO UPDATE SET
  status     = EXCLUDED.status,
  open_date  = EXCLUDED.open_date,
  close_date = EXCLUDED.close_date,
  active     = EXCLUDED.active,
  updated_at = NOW();

END $$;
