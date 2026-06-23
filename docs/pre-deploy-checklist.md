# Checklist Pre-Deploy

Use este checklist antes de promover qualquer release para producao.

## 1. Codigo

- [ ] `npm run typecheck`
- [ ] `npm run lint`
- [ ] `npm run test:unit`
- [ ] `npm run test:coverage`
- [ ] `npm run build`
- [ ] `npm run test:e2e` em staging/controlado quando a mudanca tocar respondente, admin, dispatch, cron ou auth

## 2. Banco e migrations

- [ ] `npx supabase migration list --linked` sem migration local pendente inesperada
- [ ] Migrations novas revisadas quanto a RLS, grants e `SECURITY DEFINER`
- [ ] Alteracoes destrutivas possuem backup/rollback documentado
- [ ] Supabase advisors revisados para achados P0/P1

## 3. Variaveis e dependencias externas

- [ ] `GET /api/health` retorna `ok=true` no ambiente alvo
- [ ] `CRON_SECRET` configurado na Vercel e no agendamento
- [ ] `LAYERS_API_TOKEN` valido
- [ ] Secrets de Supabase configurados
- [ ] Se houve alteracao em Sheets, validar `SHEETS_WEBHOOK_URL` e `SHEETS_WEBHOOK_SECRET`

## 4. Smoke test operacional

- [ ] Abrir uma pesquisa respondente ativa
- [ ] Enviar uma resposta teste e confirmar ThankYou
- [ ] Confirmar idempotencia de segundo submit
- [ ] Abrir `/admin/surveys`
- [ ] Validar export XLSX de uma pesquisa
- [ ] Validar `/api/admin/operations/dispatch-health` sem zumbis inesperados

## 5. Rollback

- [ ] Deploy anterior saudavel identificado na Vercel
- [ ] Migrations nao reversiveis documentadas
- [ ] Dono de decisao definido para rollback
- [ ] Janela de monitoramento pos-deploy definida

## Riscos conhecidos

- `npm audit` reportou vulnerabilidades transitivas. Nao executar `npm audit fix --force` automaticamente antes de avaliar impacto em Next/React/Playwright.
- E2E real de cron permanece gated por `RUN_CRON_E2E=true` para evitar processar filas reais sem intencao explicita.
