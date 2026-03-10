-- =============================================================
-- 001_initial_schema.sql
-- Plataforma de Pesquisas — Schema inicial
-- =============================================================

-- surveys
CREATE TABLE surveys (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug          TEXT UNIQUE NOT NULL,
  title         TEXT NOT NULL,
  description   TEXT,
  survey_type   TEXT CHECK (survey_type IN ('quantitativa', 'qualitativa')) DEFAULT 'quantitativa',
  target_roles  TEXT[] DEFAULT ARRAY['responsavel', 'aluno'],
  status        TEXT CHECK (status IN ('rascunho', 'ativa', 'pausada', 'encerrada')) DEFAULT 'rascunho',
  open_date     DATE,
  close_date    DATE,
  settings      JSONB DEFAULT '{}',
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- questions
CREATE TABLE questions (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  survey_id      UUID REFERENCES surveys(id) ON DELETE CASCADE,
  order_index    INTEGER NOT NULL,
  type           TEXT CHECK (type IN ('welcome','nps','scale','scale_sections','radio','text','thankyou')),
  key            TEXT NOT NULL,
  title          TEXT NOT NULL,
  description    TEXT,
  required       BOOLEAN DEFAULT true,
  only_for_roles TEXT[],
  conditional_on JSONB,
  settings       JSONB DEFAULT '{}',
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

-- question_options
CREATE TABLE question_options (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id   UUID REFERENCES questions(id) ON DELETE CASCADE,
  order_index   INTEGER NOT NULL,
  label         TEXT NOT NULL,
  value         TEXT NOT NULL,
  section_key   TEXT,
  section_title TEXT
);

-- response_sessions
CREATE TABLE response_sessions (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  survey_id        UUID REFERENCES surveys(id),
  community_id     TEXT,
  user_id          TEXT,
  perfil           TEXT,
  nome_responsavel TEXT,
  nome_aluno       TEXT,
  serie            TEXT,
  school           TEXT,
  onda             TEXT,
  submitted_at     TIMESTAMPTZ DEFAULT NOW(),
  synced_to_sheets BOOLEAN DEFAULT false,
  synced_at        TIMESTAMPTZ,
  UNIQUE (survey_id, community_id, user_id)
);

-- responses
CREATE TABLE responses (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id   UUID REFERENCES response_sessions(id) ON DELETE CASCADE,
  question_id  UUID REFERENCES questions(id),
  question_key TEXT NOT NULL,
  value        JSONB NOT NULL,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- admin_profiles
CREATE TABLE admin_profiles (
  id         UUID PRIMARY KEY REFERENCES auth.users(id),
  email      TEXT UNIQUE NOT NULL,
  name       TEXT,
  role       TEXT DEFAULT 'editor' CHECK (role IN ('admin', 'editor')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================
-- Índices
-- =============================================================
CREATE INDEX idx_questions_survey_id ON questions(survey_id);
CREATE INDEX idx_question_options_question_id ON question_options(question_id);
CREATE INDEX idx_response_sessions_survey_id ON response_sessions(survey_id);
CREATE INDEX idx_responses_session_id ON responses(session_id);
CREATE INDEX idx_surveys_slug ON surveys(slug);
CREATE INDEX idx_surveys_status ON surveys(status);

-- =============================================================
-- Row Level Security
-- =============================================================
ALTER TABLE surveys ENABLE ROW LEVEL SECURITY;
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE question_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE response_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_profiles ENABLE ROW LEVEL SECURITY;

-- surveys: leitura pública de pesquisas ativas
CREATE POLICY "surveys_public_read" ON surveys
  FOR SELECT USING (status = 'ativa');

-- questions: leitura pública via pesquisa ativa
CREATE POLICY "questions_public_read" ON questions
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM surveys WHERE id = survey_id AND status = 'ativa')
  );

-- question_options: leitura pública via pesquisa ativa
CREATE POLICY "question_options_public_read" ON question_options
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM questions q
      JOIN surveys s ON q.survey_id = s.id
      WHERE q.id = question_id AND s.status = 'ativa'
    )
  );

-- response_sessions: insert público (submissão de respostas)
CREATE POLICY "response_sessions_public_insert" ON response_sessions
  FOR INSERT WITH CHECK (true);

-- responses: insert público
CREATE POLICY "responses_public_insert" ON responses
  FOR INSERT WITH CHECK (true);

-- admin_profiles: apenas o próprio usuário
CREATE POLICY "admin_profiles_own" ON admin_profiles
  FOR ALL USING (auth.uid() = id);

-- =============================================================
-- Trigger updated_at em surveys
-- =============================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_surveys_updated_at
  BEFORE UPDATE ON surveys
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
