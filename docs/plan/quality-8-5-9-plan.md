# Task Plan: Elevar Qualidade do App para 8.5-9+

## Goal

Elevar a qualidade geral do projeto de aproximadamente 5.8/10 para 8.5-9+ por meio de seguranca, testes confiaveis, reducao de complexidade, refatoracao de modulos criticos, observabilidade e hardening operacional.

## Scorecard Alvo

| Area | Atual | Alvo 8.5 | Alvo 9+ |
| --- | ---: | ---: | ---: |
| Build / TypeScript | 8.0 | 9.0 | 9.5 |
| Arquitetura geral | 6.5 | 8.5 | 9.0 |
| Complexidade ciclomática | 5.5 | 8.0 | 8.8 |
| SOLID / Manutenibilidade | 6.0 | 8.5 | 9.0 |
| Testes automaticos | 3.0 | 8.0 | 9.0 |
| Cobertura unitaria | 2.5 | 8.0 | 9.0 |
| Integracao / E2E | 5.0 | 8.0 | 8.8 |
| Seguranca | 5.5 | 8.8 | 9.3 |
| Supabase / Dados | 6.0 | 8.8 | 9.3 |
| Robustez operacional | 5.5 | 8.5 | 9.0 |
| UX / Estados de erro | 6.5 | 8.2 | 8.8 |
| Observabilidade | 5.5 | 8.0 | 8.8 |

## Quality Gates Globais

- `npm run typecheck` passa limpo.
- `npm run lint` passa limpo em ambiente limpo.
- `npm run test:unit` roda sem Supabase real, sem `.env.local`, sem rede e passa.
- `npm run test` passa com suite unitaria + integracao controlada.
- `npm run build` passa sem warning de root/lockfile.
- Playwright cobre fluxo respondente, admin essencial, sample gate e dispatch sem depender de estado manual.
- Nenhuma RPC sensivel usa `SECURITY DEFINER` sem checagem explicita de admin.
- Nenhuma rota admin pode ser embutida por origem arbitraria.
- Modulos criticos ficam abaixo de 300 linhas ou têm responsabilidades claramente extraidas e testadas.

## Phases

### Phase 0: Baseline e Ambiente Reprodutivel

- [x] 0.1 Registrar baseline atual de comandos (`typecheck`, `build`, `lint`, `test`, `test:e2e`) em `docs/qa-baseline.md` - **Estimativa:** P - **Done when:** arquivo registra comando, resultado, erro e data.
- [x] 0.2 Corrigir instalacao local quebrada do ESLint/dependencias - **Estimativa:** P - **Done when:** `npm run lint` executa analise real em clone limpo.
- [x] 0.3 Resolver warning de dois lockfiles/root do Next - **Estimativa:** P - **Done when:** `npm run build` nao exibe warning de workspace root.
- [x] 0.4 Criar scripts separados `test:unit`, `test:integration`, `test:ci` - **Estimativa:** M - **Done when:** testes unitarios rodam sem env externa e integracao exige env explicitamente.
- **Status:** completed

### Phase 1: P0 Seguranca Supabase e Admin

- [x] 1.1 Auditar RPCs `rpc_nps_breakdown` e `rpc_scale_averages` - **Estimativa:** M - **Done when:** risco de bypass RLS documentado e decisao tecnica registrada.
- [x] 1.2 Remover `SECURITY DEFINER` das RPCs ou adicionar checagem interna de admin - **Estimativa:** M - **Done when:** usuario autenticado nao-admin nao consegue executar relatorios de outra pesquisa.
- [x] 1.3 Revogar grants amplos e conceder apenas o necessario - **Estimativa:** P - **Done when:** `GRANT EXECUTE` nao permite acesso indevido via `authenticated` generico.
- [x] 1.4 Fechar `frame-ancestors *` em `/admin/*` - **Estimativa:** P - **Done when:** admin aceita iframe apenas de `'self'` ou origens explicitamente aprovadas.
- [x] 1.5 Substituir policy antiga com `auth.role()` - **Estimativa:** P - **Done when:** nenhuma migration/schema ativo usa `auth.role()` em policy nova ou atual.
- [x] 1.6 Rodar Supabase advisors ou checklist manual equivalente - **Estimativa:** M - **Done when:** achados P0/P1 corrigidos ou justificados.
- **Status:** completed
- **Depends on:** Phase 0 parcialmente, para validar gates.

### Phase 2: Testes Unitarios Puros para Regras Criticas

- [x] 2.1 Criar testes unitarios para `rowsToConfig` - **Estimativa:** M - **Done when:** cobre theme merge, installation, tipos de step, options e fallback.
- [x] 2.2 Criar testes unitarios para `applyConditionals` - **Estimativa:** P - **Done when:** cobre condicional conhecida e spec desconhecida com comportamento decidido.
- [x] 2.3 Criar testes unitarios para `buildActiveSteps` - **Estimativa:** M - **Done when:** cobre roles, welcome, thankyou, step condicional e voltar/avancar indiretamente.
- [x] 2.4 Extrair e testar mapeamento de respostas do submit - **Estimativa:** M - **Done when:** keys inexistentes, respostas vazias e respostas validas têm testes sem banco.
- [x] 2.5 Extrair e testar builders de payload de dispatch - **Estimativa:** M - **Done when:** push, email, placeholders, sample e group scopes cobertos.
- [x] 2.6 Testar `ThankYou` fallback de mensagem/link - **Estimativa:** P - **Done when:** casos promotor/neutro/detrator/aluno e link vazio cobertos.
- **Status:** completed
- **Depends on:** Phase 0.

### Phase 3: Hardening do Submit Respondente

- [x] 3.1 Definir modelo de identidade confiavel do respondente - **Estimativa:** M - **Done when:** decisao documentada sobre LayersPortal, Layers Hub, token assinado ou fallback anonimo.
- [x] 3.2 Validar `communityId`, `userId`, `accountId` e `email` server-side - **Estimativa:** G - **Done when:** submit nao confia apenas no body/URL para amostra ou usuario.
- [x] 3.3 Validar shape de `answers` com schema - **Estimativa:** M - **Done when:** payload invalido retorna 400/422 com erro especifico.
- [x] 3.4 Garantir idempotencia sem bloquear retry legitimo - **Estimativa:** M - **Done when:** testes cobrem duplicate, falha parcial e retry.
- [x] 3.5 Adicionar testes de integracao controlados para submit - **Estimativa:** M - **Done when:** casos feliz, duplicate, not_in_sample, invalid answers e compensation passam.
- **Status:** completed
- **Depends on:** Phase 2.

### Phase 4: Cron, Dispatch e Concorrencia

- [x] 4.1 Mapear estados de dispatch/job como maquina de estados - **Estimativa:** M - **Done when:** estados validos, transicoes e invariantes estao documentados.
- [x] 4.2 Implementar claim atomico de jobs - **Estimativa:** G - **Done when:** dois crons simultaneos nao processam o mesmo job.
- [x] 4.3 Isolar funcoes puras de selecao de jobs e fechamento de dispatch - **Estimativa:** M - **Done when:** regras testaveis sem Supabase/fetch.
- [x] 4.4 Testar retry/rate limit/falha parcial - **Estimativa:** M - **Done when:** suite cobre `sent`, `failed`, `partial_failure`, `sending` e zombie prevention.
- [x] 4.5 Padronizar audit log de notificacoes - **Estimativa:** M - **Done when:** cada tentativa de envio tem registro consistente com `dispatch_id`, `job_id`, status e erro.
- **Status:** completed
- **Depends on:** Phase 2.

### Phase 5: Refatoracao SOLID dos Hotspots

- [x] 5.1 Refatorar `DispatchForm.tsx` em hook + componentes + payload builder - **Estimativa:** G - **Done when:** arquivo principal fica focado em composicao visual e handlers testados separadamente. **Resultado:** tipos/payloads em `dispatch-form-utils.ts`, submit em `dispatch-submit-handler.ts`, secoes em componentes dedicados; `DispatchForm.tsx` saiu dos hotspots >300 linhas.
- [x] 5.2 Refatorar `lib/layers-notifications.ts` por responsabilidades - **Estimativa:** G - **Done when:** separa API client, payload builder, job processor, sample processor e audit logger. **Resultado:** payload builders/tipos/audit logger extraidos para `lib/layers-notification-payloads.ts`, cliente HTTP para `lib/layers-notification-client.ts`, listagem de usuarios para `lib/layers-notification-users.ts` e processors para `lib/layers-notification-jobs.ts`; `lib/layers-notifications.ts` saiu da lista de hotspots.
- [x] 5.3 Refatorar `app/admin/surveys/actions.ts` por dominio - **Estimativa:** G - **Done when:** survey CRUD, question CRUD, duplicate e delete ficam em modulos menores. **Resultado:** helpers, survey meta, question actions e copy/delete extraidos; `actions.ts` virou fachada de server actions e saiu dos hotspots >300 linhas.
- [x] 5.4 Reduzir `SurveyRunner.tsx` com state machine/hook de fluxo - **Estimativa:** G - **Done when:** carregamento de contexto, carregamento de config, navegacao e submit ficam separados. **Resultado:** bootstrap de contexto/config/theme extraido para `useSurveyBootstrap()` e telas de estado para `SurveyRunnerStates.tsx`; `SurveyRunner.tsx` saiu dos hotspots >300 linhas.
- [x] 5.5 Estabelecer limite de complexidade por arquivo/função - **Estimativa:** P - **Done when:** lint ou script reporta hotspots acima do limite.
- **Status:** completed
- **Depends on:** Phase 2, para refatorar com cobertura.

### Phase 6: Transacoes e Consistencia de Dados

- [x] 6.1 Revisar operacoes multi-step sem transacao - **Estimativa:** M - **Done when:** lista cobre duplicate, delete, save options, submit compensation e dispatch creation. **Resultado:** auditoria registrada em `docs/phase-6-consistency-audit.md`.
- [x] 6.2 Mover fluxos criticos para RPC transacional ou compensacao robusta - **Estimativa:** G - **Done when:** falha intermediaria nao deixa dados orfaos ou estado inconsistente. **Resultado:** `admin_duplicate_survey_template`, `admin_delete_survey_cascade` e `admin_replace_question_options` aplicadas; submit e dispatch mantem compensacao robusta.
- [x] 6.3 Validar constraints e indices principais - **Estimativa:** M - **Done when:** unique keys, FKs, checks e indices cobrem invariantes reais. **Resultado:** invariantes revisados e documentados; pendencia residual restrita as policies publicas historicas do submit.
- [x] 6.4 Aplicar/verificar migration pendente `028_audit_broadcasts.sql` - **Estimativa:** P - **Done when:** tabela `audit_broadcasts` e coluna `expected_responses` existem no banco alvo. **Resultado:** migration aplicada e verificada no Supabase remoto.
- **Status:** completed
- **Depends on:** Phase 1.

### Phase 7: E2E Confiavel e Cobertura de Fluxos

- [x] 7.1 Criar seed E2E deterministico - **Estimativa:** M - **Done when:** Playwright cria/limpa seus dados sem depender de estado manual. **Resultado:** `tests/e2e/helpers/e2e-data.ts` centraliza seed/cleanup; specs principais usam slugs isolados.
- [x] 7.2 Cobrir fluxo respondente completo - **Estimativa:** M - **Done when:** NPS, condicional bilingue, submit e thankyou passam em E2E. **Resultado:** `respondente.spec.ts` cobre welcome, NPS, pergunta bilingue, escala, submit real, ThankYou, idempotencia e payload invalido.
- [x] 7.3 Cobrir sample gate - **Estimativa:** M - **Done when:** email dentro/fora da amostra tem comportamento validado. **Resultado:** `sample-gate.spec.ts` cobre GET/POST e UI bloqueada.
- [x] 7.4 Cobrir admin essencial - **Estimativa:** M - **Done when:** login, criar/editar survey, instalar comunidade e editar tema passam. **Resultado:** `admin-essential.spec.ts` cobre login, criacao/edicao por UI, instalacao e tema.
- [x] 7.5 Cobrir dispatch sem envio real externo - **Estimativa:** G - **Done when:** API Layers e Supabase externo sao mockados ou ambiente staging isolado e seguro. **Resultado:** dispatch E2E usa criacao agendada e audit seedado; cron real fica gated por `RUN_CRON_E2E=true`.
- **Status:** completed
- **Depends on:** Phase 0, Phase 3, Phase 4.

### Phase 8: Observabilidade e Operacao

- [x] 8.1 Padronizar logs estruturados nas APIs criticas - **Estimativa:** M - **Done when:** logs incluem rota, correlation id, surveyId/dispatchId quando aplicavel, sem PII sensivel. **Resultado:** `lib/observability.ts` centraliza logs JSON, correlation id e redacao de PII; submit, dispatch, cron, retry e health checks foram instrumentados.
- [x] 8.2 Criar health checks operacionais - **Estimativa:** M - **Done when:** endpoints/queries validam Supabase, cron, filas e env vars obrigatorias. **Resultado:** `GET /api/health` valida env vars, Supabase, fila de dispatch e fila de Sheets.
- [x] 8.3 Criar painel ou query de dispatches zumbis/falhas - **Estimativa:** M - **Done when:** operacao identifica `sending` parado, jobs sem progresso e falhas recorrentes. **Resultado:** `GET /api/admin/operations/dispatch-health` lista dispatches zumbis, jobs sem progresso, jobs falhos e agendamentos vencidos; queries equivalentes documentadas.
- [x] 8.4 Documentar runbooks de incidentes - **Estimativa:** M - **Done when:** existe procedimento para submit quebrado, cron parado, Layers 429, migration pendente e rollback. **Resultado:** `docs/operations/runbooks.md` e `docs/operations/observability.md`.
- **Status:** completed
- **Depends on:** Phase 4.

### Phase 9: UX, Acessibilidade e Erros

- [x] 9.1 Revisar estados de erro do respondente - **Estimativa:** M - **Done when:** 403, 404, rede, duplicate e survey pausada mostram mensagens adequadas. **Resultado:** erro de submit usa alerta acessivel com mensagem clara; estados de survey inexistente, acesso negado, pausada, nao aberta e encerrada seguem cobertos por E2E/fluxos existentes.
- [x] 9.2 Revisar loading e retry do submit - **Estimativa:** M - **Done when:** usuario consegue tentar novamente sem duplicar nem perder respostas. **Resultado:** `SubmitErrorAlert` permite retry; E2E cobre falha temporaria no primeiro submit e sucesso na segunda tentativa sem perder respostas.
- [x] 9.3 Revisar acessibilidade basica - **Estimativa:** M - **Done when:** labels, foco, teclado, contraste e estados disabled passam checklist. **Resultado:** foco visivel, `role="alert"`, `aria-pressed`, `aria-label`, `type="button"`, suporte a teclado no upload e `prefers-reduced-motion`.
- [x] 9.4 Rodar E2E visual/screenshot nos principais viewports - **Estimativa:** M - **Done when:** respondente e admin essencial nao têm quebra visual evidente. **Resultado:** specs visuais cobrem respondente mobile/desktop e admin desktop/tablet com screenshots anexados e checagem de overflow horizontal.
- **Status:** completed
- **Depends on:** Phase 7.

### Phase 10: CI/CD e Release Gate

- [x] 10.1 Criar pipeline CI com typecheck, lint, unit, build - **Estimativa:** M - **Done when:** PR nao passa se algum gate falhar. **Resultado:** workflow `.github/workflows/quality.yml` roda typecheck, lint, coverage/unit e build em PR/push.
- [x] 10.2 Separar jobs de integracao/E2E com env staging - **Estimativa:** M - **Done when:** E2E roda em staging controlado ou manual-gated. **Resultado:** jobs `integration` e `e2e` sao `workflow_dispatch` gated por inputs e usam secrets/vars de ambiente.
- [x] 10.3 Adicionar coverage report e threshold progressivo - **Estimativa:** M - **Done when:** cobertura minima inicial definida e aumentando por sprint. **Resultado:** `npm run test:coverage` usa V8, gera `coverage/`, publica artefato no CI e bloqueia queda abaixo do baseline atual.
- [x] 10.4 Criar checklist pre-deploy - **Estimativa:** P - **Done when:** release exige migrations aplicadas, env validado, smoke test e rollback plan. **Resultado:** `docs/pre-deploy-checklist.md`.
- **Status:** completed
- **Depends on:** Phase 0, Phase 2, Phase 7.

## Milestones

### Milestone A: Sair de 5.8 para 7.0

- Phase 0 completa.
- Phase 1 completa.
- Testes unitarios puros existem para `survey-config` e `buildActiveSteps`.
- Build sem warning de lockfile.

### Milestone B: Sair de 7.0 para 8.0

- Phase 2 completa.
- Submit endurecido com validacao server-side.
- Cron/dispatch com testes de regra e primeiro locking implementado.
- `test:unit` e `lint` passam em CI.

### Milestone C: Chegar em 8.5

- Phase 3 e Phase 4 completas.
- Hotspots principais com responsabilidades extraidas.
- E2E deterministico cobre fluxos essenciais.
- Observabilidade operacional minima pronta.

### Milestone D: Chegar em 9+

- Refatoracoes da Phase 5 completas.
- Transacoes/consistencia revisadas nos fluxos de banco.
- Coverage threshold ativo e CI bloqueante.
- Runbooks, smoke tests e rollback documentados.

## Decisions Made

| Decision | Rationale |
| --- | --- |
| Corrigir seguranca antes de refatorar | Vulnerabilidades P0 impedem nota alta mesmo com codigo limpo. |
| Separar unitarios de integracao | A suite atual depende de Supabase real e nao protege refatoracao local. |
| Refatorar apenas depois de testes puros | Reduz risco de regressao em regras ja sensiveis. |
| Priorizar submit e dispatch | Sao os fluxos com maior impacto: coleta de respostas e comunicacao em massa. |
| Usar scorecard por area | Evita perseguir uma nota geral subjetiva sem evidencias verificaveis. |
| Modelo de identidade do submit | Survey aberta aceita fallback anonimo; survey amostral exige `communityId` + `userId/accountId` Layers e valida email/perfil via Layers Hub no servidor. |

## Risks

| Risk | Impact | Mitigation |
| --- | --- | --- |
| Refatorar sem cobertura quebra regras de negocio | Alto | Phase 2 antes da Phase 5. |
| Testes E2E dependem de estado real | Alto | Seed deterministico e limpeza automatica. |
| RPCs atuais dependem de bypass RLS para funcionar | Medio/Alto | Migrar para checagem explicita de admin antes de remover privilegios. |
| Cron pode duplicar envios durante mudanca | Alto | Implementar locking em staging e validar com teste de concorrencia. |
| Migrations pendentes em producao | Medio/Alto | Checklist pre-deploy e verificacao direta no banco. |

## Definition of Done for 8.5+

- Nota geral reavaliada >= 8.5.
- Nenhum P0 aberto.
- No maximo P1 aceito com justificativa e prazo.
- `typecheck`, `lint`, `test:unit`, `test`, `build` passam.
- E2E essencial passa em ambiente controlado.
- Submit, conditionals, dispatch e report functions têm testes.
- Admin nao e embutivel por origem arbitraria.
- RPCs sensiveis nao expõem PII para usuario autenticado nao-admin.
- Hotspots principais têm complexidade reduzida ou funcoes puras extraidas e cobertas.

## Definition of Done for 9+

- Coverage efetivo nas regras criticas >= 85%.
- Nenhum modulo critico acima de 300 linhas sem justificativa arquitetural.
- Cron/dispatch com locking atomico e teste de concorrencia.
- Operacoes multi-step criticas transacionais ou compensadas.
- Observabilidade suficiente para diagnosticar falhas sem inspecao manual do banco.
- CI bloqueia regressao de lint, typecheck, testes e build.
- Runbook de producao cobre incidentes principais.
