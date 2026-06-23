# QA Action Plan — Sistema de Pesquisas

> Gerado em: 2026-06-11
> Contexto: após revisão do fluxo de perguntas/thankyou (branch `feat/thankyou-message-editable`)
> Score atual: Qualidade 8/10 | Segurança 8/10 | Manutenibilidade 8/10

---

## Sprint 0 — Antes do merge (bloqueante)

| # | Arquivo | Problema | Status |
|---|---|---|---|
| S0-1 | `communities/actions.ts` | `saveCommunityTheme`: UPDATE silencioso se a row em `survey_communities` não existir — `.single()` retorna null sem erro, UPDATE afeta 0 linhas sem feedback | ⬜ Pendente |

```typescript
// Fix: verificar PGRST116 (no rows found) e tratar separadamente
const { data: current, error: selectError } = await supabase
  .from('survey_communities').select('theme')
  .eq('survey_id', surveyId).eq('community_id', communityId).single()

if (selectError && selectError.code !== 'PGRST116') {
  return { error: 'Erro ao ler tema atual' }
}
const merged = { ...(current?.theme ?? {}), ...themeData }
```

---

## Sprint 1 — Submit endpoint (P0 — dados reais de alunos)

**Prioridade:** CRÍTICA. Única rota que persiste respostas. Falha = dados perdidos sem recuperação.

| # | Arquivo | O que revisar | Status |
|---|---|---|---|
| S1-1 | `app/api/surveys/[slug]/submit/route.ts` | Race condition no upsert; compensação de falha parcial; o que ocorre se `insert responses` falha depois do upsert de session | ⬜ Pendente |
| S1-2 | `lib/survey-config.ts` → `applyConditionals` | Spec desconhecida retorna `() => true` — step invisível pode ser exibido quando não deveria | ⬜ Pendente |
| S1-3 | `components/survey-engine/utils/buildActiveSteps.ts` | Lógica de steps ativos — um erro aqui pula perguntas ou as repete; sem teste | ⬜ Pendente |

---

## Sprint 2 — Dispatch/Cron (P0 — disparo em massa)

**Prioridade:** CRÍTICA. Já teve bug de `target_scope` em produção (PR #35). `DispatchForm.tsx` tem 46KB sem revisão.

| # | Arquivo | O que revisar | Status |
|---|---|---|---|
| S2-1 | `app/api/cron/process-dispatches/route.ts` | Loop N queries sequenciais; timeout Vercel Hobby (10s); dispatches "travados" | ⬜ Pendente |
| S2-2 | `app/admin/surveys/[id]/dispatch/DispatchForm.tsx` | 46KB — maior arquivo do projeto; CC provavelmente > 15; validações UI vs servidor | ⬜ Pendente |
| S2-3 | `app/api/admin/surveys/[id]/dispatch/route.ts` | Auth, validação de `target_scope`, idempotência de criação | ⬜ Pendente |

---

## Sprint 3 — Testes unitários (P1 — net safety)

**Prioridade:** ALTA. 15 testes existentes — todos skipped ou falham sem `.env.local`. Funções críticas sem cobertura.

| # | Função | Arquivo | Tipo | Status |
|---|---|---|---|---|
| S3-1 | `rowsToConfig` + `STEP_BUILDERS` | `lib/survey-config.ts` | Unit puro (zero deps) | ⬜ Pendente |
| S3-2 | `useQuestionForm` | `useQuestionForm.ts` | Unit com `renderHook` | ⬜ Pendente |
| S3-3 | `ThankYou` link fallback (`\|\|` vs `??`) | `steps/ThankYou.tsx` | Unit com render | ⬜ Pendente |
| S3-4 | `applyConditionals` spec desconhecida | `lib/survey-config.ts` | Unit puro | ⬜ Pendente |
| S3-5 | `saveCommunityTheme` merge | `communities/actions.ts` | Integration (precisa Supabase) | ⬜ Pendente |

---

## Sprint 4 — Sample + Analytics (P2 — funcionalidade)

**Prioridade:** MÉDIA. Menor risco de dado perdido, maior risco de acesso indevido.

| # | Arquivo | O que revisar | Status |
|---|---|---|---|
| S4-1 | `app/admin/surveys/[id]/sample/SampleUpload.tsx` | Upload Excel sem validação de tamanho/formato no servidor | ⬜ Pendente |
| S4-2 | `app/admin/surveys/[id]/sample/SampleGroups.tsx` | Controle de acesso; paginação ausente para listas grandes | ⬜ Pendente |
| S4-3 | `app/admin/analytics/` (10 arquivos) | Queries sem paginação podem travar com survey grande; CC das funções de agregação | ⬜ Pendente |
| S4-4 | `app/admin/reports/ReportsClient.tsx` | Lógica de agregação no cliente vs servidor; 13KB sem revisão | ⬜ Pendente |

---

## Fora de escopo (não revisar agora)

- `app/admin/login/` — magic link, sem mutations críticas
- `app/admin/export/` — leitura, baixo risco
- CSS / UI puro
- `node_modules/`

---

## Legenda de status

- ⬜ Pendente
- 🔄 Em progresso
- ✅ Concluído
- ❌ Bloqueado

---

## Histórico de revisões já aplicadas

### 2026-06-11 — Fluxo perguntas/thankyou (branch `feat/thankyou-message-editable`)

**Commits:** `24d9ce0`, `55b4473`, `1f621e0`

| Fix | Arquivo | Descrição |
|---|---|---|
| CRÍTICO | `communities/actions.ts` | READ-MERGE-WRITE no theme; requireAuth consistente; validação URL logo |
| CRÍTICO | `lib/survey-config.ts` | Strategy map STEP_BUILDERS; merge centralizado; CC 14→4 |
| MÉDIO | `actions.ts` | `deleteQuestion` + `toggleThankYouStep` invalidam cache |
| MÉDIO | `SurveyRunner.tsx` | `useMemo` para theme; STEP_RENDERERS; useEffect usa memo |
| MÉDIO | `ThankYou.tsx` | `\|\|` em vez de `??` para `indicacaoLink` vazio |
| MÉDIO | `route.ts` | Sanitização de `communityId` como cache key |
| MÉDIO | `CommunitiesThemeEditor.tsx` | `toDatetimeLocal()` para datas em Brasília |
| REFACTOR | `QuestionEditor.tsx` | 14 useState → `useQuestionForm` hook; Set para lookups |
| REFACTOR | `SurveyRunner.tsx` | CC renderCurrentStep 11→3 via lookup table |
| REFACTOR | `survey-config.ts` | CC rowsToConfig 14→4 via strategy map |

**Score pós-revisão:** Qualidade 8/10 | Segurança 8/10 | Manutenibilidade 8/10
