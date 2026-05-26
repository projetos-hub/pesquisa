# Ownership Matrix -- Mini-App Pesquisa Layers

**O Diretor preenche esta tabela durante o onboarding.**

---

## Regra

Cada arquivo ou pasta tem exatamente um dono.
Modificacoes em arquivos de outro agente requerem: [AUTORIZADO: Diretor]

---

## Matriz (preencher durante onboarding)

| Arquivo / Pasta | Dono | Observacao |
|-----------------|------|------------|
| tasks/ | Gerente | Sistema de coordenacao |
| tasks/mensagens/geral.md | Todos | Canal compartilhado |
| tasks/STATUS.md | Gerente | Quadro de estado |
| survey-platform/components/survey-engine/ | AGENTE-1 | Steps, SurveyRunner, buildActiveSteps |
| survey-platform/components/ui/ | AGENTE-1 | OptionBtn, ProgressBar, ScaleRow |
| survey-platform/app/(respondente)/ | AGENTE-1 | Portal, layout, CSS |
| survey-platform/app/admin/ | AGENTE-2 | Painel admin, dispatch, export |
| survey-platform/app/api/ | AGENTE-3 | Todas as rotas API |
| survey-platform/lib/supabase-*.ts | AGENTE-3 | Clients browser/server/service |
| survey-platform/lib/survey-config.ts | AGENTE-3 | rowsToConfig, applyConditionals |
| survey-platform/lib/sheets.ts | AGENTE-3 | Sync Google Sheets |
| survey-platform/supabase/migrations/ | AGENTE-3 | Migrations, RLS, constraints |

---

## Arquivos protegidos (exigem autorizacao do Diretor)

- Arquivos de configuracao de build (package.json, go.mod, etc.)
- Arquivos de infraestrutura (docker-compose, CI/CD)
- Arquivos de autenticacao e seguranca

