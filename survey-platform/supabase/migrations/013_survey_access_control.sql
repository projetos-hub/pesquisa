-- 013_survey_access_control.sql
-- Adiciona controle de acesso explícito para pesquisas

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'surveys' AND column_name = 'access_control') THEN
        ALTER TABLE surveys ADD COLUMN access_control TEXT CHECK (access_control IN ('aberta', 'amostra')) DEFAULT 'aberta';
    END IF;
END $$;

-- Migração de dados: pesquisas que já possuem entradas na amostra devem ser marcadas como 'amostra'
UPDATE surveys 
SET access_control = 'amostra'
WHERE id IN (SELECT DISTINCT survey_id FROM survey_sample_lists);
