-- Migration: Índice parcial para sincronização com Google Sheets
-- Objetivo: Otimizar a query do cron que busca sessions não sincronizadas
-- Problema: O cron fazia full scan em response_sessions por synced_to_sheets=false
-- Solução: Índice parcial que só inclui rows não sincronizadas

CREATE INDEX idx_response_sessions_unsynced ON response_sessions(synced_to_sheets)
WHERE synced_to_sheets = false;
