-- Indexes parciais para o cron de agendamento automático
-- Não altera colunas nem cria novas — apenas índices sobre campos existentes.

CREATE INDEX IF NOT EXISTS idx_surveys_open_date_pending
  ON surveys (open_date)
  WHERE open_date IS NOT NULL AND status IN ('rascunho', 'pausada');

CREATE INDEX IF NOT EXISTS idx_surveys_close_date_active
  ON surveys (close_date)
  WHERE close_date IS NOT NULL AND status = 'ativa';

CREATE INDEX IF NOT EXISTS idx_survey_communities_open_date_pending
  ON survey_communities (open_date)
  WHERE open_date IS NOT NULL AND status IN ('nao_aberta', 'pausada');

CREATE INDEX IF NOT EXISTS idx_survey_communities_close_date_active
  ON survey_communities (close_date)
  WHERE close_date IS NOT NULL AND status = 'ativa';
