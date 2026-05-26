-- Migration 017: Adiciona sequence_steps a survey_dispatches
-- Permite salvar todos os passos de uma régua num único template

ALTER TABLE survey_dispatches
  ADD COLUMN IF NOT EXISTS sequence_steps JSONB NULL;

-- DOWN: ALTER TABLE survey_dispatches DROP COLUMN IF EXISTS sequence_steps;
