-- Migration 025: Corrige CHECK constraint de target_scope para incluir 'sample'
--
-- Problema: migration 008 criou survey_dispatches com
--   CHECK (target_scope IN ('all', 'communities', 'group'))
-- sem incluir 'sample'. Todo INSERT com target_scope='sample' viola a
-- constraint, retornando erro 500 para o admin sem mensagem clara.
--
-- Solução: recriar a constraint incluindo 'sample'.
--
-- DOWN: DROP + ADD com ('all', 'communities', 'group') para reverter.

ALTER TABLE survey_dispatches
  DROP CONSTRAINT IF EXISTS survey_dispatches_target_scope_check;

ALTER TABLE survey_dispatches
  ADD CONSTRAINT survey_dispatches_target_scope_check
  CHECK (target_scope IN ('all', 'communities', 'group', 'sample'));
