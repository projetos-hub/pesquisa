-- =============================================================
-- 003_admin_rls_and_constraints.sql
-- RLS de leitura para admin + constraint de unicidade em questions
-- =============================================================

-- ── 1. Constraint de unicidade: question.key por survey ───────────────────────
--
-- Garante que o mapeamento question_key → question_id no submit seja unívoco.
-- Sem isso, seeds duplicados silenciam respostas da primeira question com a key.
ALTER TABLE questions
  ADD CONSTRAINT questions_survey_id_key_unique UNIQUE (survey_id, key);


-- ── 2. Políticas RLS de leitura para admin ────────────────────────────────────
--
-- Permite que usuários autenticados com registro em admin_profiles
-- leiam response_sessions e responses.
-- Os endpoints admin usarão createServerSupabaseClient() (anon key + cookie),
-- e o auth.uid() será verificado pela RLS automaticamente.

CREATE POLICY "response_sessions_admin_read" ON response_sessions
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM admin_profiles WHERE id = auth.uid())
  );

CREATE POLICY "responses_admin_read" ON responses
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM admin_profiles WHERE id = auth.uid())
  );

-- Admins também precisam ler surveys e questions para cruzar dados
CREATE POLICY "surveys_admin_read" ON surveys
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM admin_profiles WHERE id = auth.uid())
  );

CREATE POLICY "questions_admin_read" ON questions
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM admin_profiles WHERE id = auth.uid())
  );

CREATE POLICY "question_options_admin_read" ON question_options
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM admin_profiles WHERE id = auth.uid())
  );
