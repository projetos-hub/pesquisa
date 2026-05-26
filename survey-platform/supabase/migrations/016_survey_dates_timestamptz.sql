-- Converte open_date e close_date de DATE para TIMESTAMPTZ
-- Datas existentes são preservadas como meia-noite (abertura) e fim do dia (encerramento) no horário de Brasília

ALTER TABLE surveys
  ALTER COLUMN open_date  TYPE TIMESTAMPTZ
    USING (open_date  + TIME '00:00:00') AT TIME ZONE 'America/Sao_Paulo',
  ALTER COLUMN close_date TYPE TIMESTAMPTZ
    USING (close_date + TIME '23:59:59') AT TIME ZONE 'America/Sao_Paulo';

ALTER TABLE survey_communities
  ALTER COLUMN open_date  TYPE TIMESTAMPTZ
    USING (open_date  + TIME '00:00:00') AT TIME ZONE 'America/Sao_Paulo',
  ALTER COLUMN close_date TYPE TIMESTAMPTZ
    USING (close_date + TIME '23:59:59') AT TIME ZONE 'America/Sao_Paulo';
