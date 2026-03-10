-- =============================================================
-- 002_seed_csat.sql
-- Seed da pesquisa CSAT 2026
-- Idempotente: pode ser rodado mais de uma vez sem duplicar dados.
-- =============================================================

DO $$
DECLARE
  v_survey_id      UUID;
  q_welcome_id     UUID;
  q_nps_id         UUID;
  q_bilingue_id    UUID;
  q_pedagogico_id  UUID;
  q_admin_id       UUID;
  q_infra_id       UUID;
  q_thankyou_id    UUID;
BEGIN

-- ── 1. Survey ────────────────────────────────────────────────────────────────
INSERT INTO surveys (slug, title, survey_type, target_roles, status)
VALUES (
  'csat',
  'Pesquisa de Satisfação 2026',
  'quantitativa',
  ARRAY['responsavel', 'aluno'],
  'ativa'
)
ON CONFLICT (slug) DO UPDATE SET
  title        = EXCLUDED.title,
  survey_type  = EXCLUDED.survey_type,
  target_roles = EXCLUDED.target_roles,
  status       = EXCLUDED.status,
  updated_at   = NOW()
RETURNING id INTO v_survey_id;

-- ── 2. Remove questions existentes (garante idempotência) ────────────────────
DELETE FROM questions WHERE survey_id = v_survey_id;

-- ── 3. Questions ─────────────────────────────────────────────────────────────

INSERT INTO questions (survey_id, order_index, type, key, title, required)
VALUES (v_survey_id, 0, 'welcome', 'welcome', 'Bem-vindo', false)
RETURNING id INTO q_welcome_id;

INSERT INTO questions (survey_id, order_index, type, key, title, required, settings)
VALUES (
  v_survey_id, 1, 'nps', 'nps', 'NPS', true,
  '{"perguntaBilingue": true}'
)
RETURNING id INTO q_nps_id;

-- Bilíngue: scale com seções, condicional = só aparece se NPS.participa_bilingue = "Sim"
INSERT INTO questions (
  survey_id, order_index, type, key, title, description, required, conditional_on
)
VALUES (
  v_survey_id, 2, 'scale_sections', 'bilingue',
  'Programa Bilíngue',
  'Avalie os aspectos do programa bilíngue da {tipo}.',
  true,
  '{"type":"answer_field_equals","answerKey":"nps","field":"participa_bilingue","value":"Sim"}'
)
RETURNING id INTO q_bilingue_id;

INSERT INTO questions (survey_id, order_index, type, key, title, description, required)
VALUES (
  v_survey_id, 3, 'scale', 'pedagogico',
  'Eixo Pedagógico',
  'Avalie de 1 a 5 os seguintes aspectos:',
  true
)
RETURNING id INTO q_pedagogico_id;

INSERT INTO questions (survey_id, order_index, type, key, title, description, required)
VALUES (
  v_survey_id, 4, 'scale', 'administrativo',
  'Eixo Administrativo',
  'Avalie de 1 a 5 os seguintes aspectos:',
  true
)
RETURNING id INTO q_admin_id;

INSERT INTO questions (survey_id, order_index, type, key, title, description, required)
VALUES (
  v_survey_id, 5, 'scale', 'infraestrutura',
  'Eixo Infraestrutura',
  'Avalie de 1 a 5 os seguintes aspectos:',
  true
)
RETURNING id INTO q_infra_id;

INSERT INTO questions (survey_id, order_index, type, key, title, required)
VALUES (v_survey_id, 6, 'thankyou', 'thankyou', 'Obrigado', false)
RETURNING id INTO q_thankyou_id;

-- ── 4. Options ───────────────────────────────────────────────────────────────

-- Bilíngue — Seção 1: Inglês Todo Dia
INSERT INTO question_options (question_id, order_index, label, value, section_key, section_title) VALUES
  (q_bilingue_id, 0, 'Qualidade geral do programa e materiais didáticos',                                 'itd_q0', 'ingles_todo_dia', 'Inglês Todo Dia'),
  (q_bilingue_id, 1, 'Integração do inglês com outras áreas do conhecimento (CLIL)',                      'itd_q1', 'ingles_todo_dia', 'Inglês Todo Dia'),
  (q_bilingue_id, 2, 'Desenvolvimento das habilidades e interesse pelo aprendizado do inglês',            'itd_q2', 'ingles_todo_dia', 'Inglês Todo Dia');

-- Bilíngue — Seção 2: Turno Integral Bilíngue
INSERT INTO question_options (question_id, order_index, label, value, section_key, section_title) VALUES
  (q_bilingue_id, 3, 'Qualidade geral do projeto e atividades complementares',                            'ti_q0', 'turno_integral', 'Turno Integral Bilíngue'),
  (q_bilingue_id, 4, 'Quantidade e diversidade das aulas e horas dedicadas ao inglês',                    'ti_q1', 'turno_integral', 'Turno Integral Bilíngue'),
  (q_bilingue_id, 5, 'Uso dos espaços da {tipo} para imersão no inglês',                                  'ti_q2', 'turno_integral', 'Turno Integral Bilíngue');

-- Pedagógico
INSERT INTO question_options (question_id, order_index, label, value) VALUES
  (q_pedagogico_id, 0, 'Qualidade do ensino (professores, metodologias e estímulo ao aprendizado)',       'p_q0'),
  (q_pedagogico_id, 1, 'Recursos pedagógicos e suporte no integral/ateliê (plataformas, materiais e serviços)', 'p_q1'),
  (q_pedagogico_id, 2, 'Acolhimento e desenvolvimento emocional (atenção ao aluno e apoio às famílias)',  'p_q2');

-- Administrativo
INSERT INTO question_options (question_id, order_index, label, value) VALUES
  (q_admin_id, 0, 'Gestão e organização da {tipo} (direção, coordenação e rotina de entrada e saída)',    'a_q0'),
  (q_admin_id, 1, 'Atendimento ao público (secretaria e financeiro)',                                      'a_q1'),
  (q_admin_id, 2, 'Canais digitais de comunicação (informações no app da {tipo}, e-mail e redes sociais/sites)', 'a_q2');

-- Infraestrutura
INSERT INTO question_options (question_id, order_index, label, value) VALUES
  (q_infra_id, 0, 'Conforto e segurança dos espaços (salas, convivência e recepção)',                     'i_q0'),
  (q_infra_id, 1, 'Higiene e conservação (limpeza geral e banheiros)',                                    'i_q1'),
  (q_infra_id, 2, 'Alimentação e serviços de apoio (cantina, variedade e organização do refeitório)',     'i_q2');

END $$;
