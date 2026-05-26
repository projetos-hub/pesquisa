-- Migration 009: Personalização e régua de disparos
-- Adiciona campos para envio personalizado por usuário e agrupamento de sequências

ALTER TABLE survey_dispatches
  ADD COLUMN personalized    BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN sequence_id     UUID,        -- UUID que agrupa disparos de uma régua
  ADD COLUMN sequence_step   INT;         -- posição na régua (0, 1, 2...)

ALTER TABLE survey_dispatch_jobs
  ADD COLUMN total_users     INT,         -- total de usuários para envio personalizado
  ADD COLUMN processed_users INT NOT NULL DEFAULT 0,
  ADD COLUMN failed_users    INT NOT NULL DEFAULT 0;

-- Índice para buscar todos os dispatches de uma régua
CREATE INDEX idx_dispatches_sequence_id
  ON survey_dispatches (sequence_id)
  WHERE sequence_id IS NOT NULL;
