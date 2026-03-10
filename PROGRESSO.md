# Progresso — Plataforma de Pesquisas Layers Education

## Como retomar com o assistente

> "Estou desenvolvendo uma plataforma de pesquisas de satisfação para a Layers Education.
> O projeto fica em C:\Users\luisa.lopes\Desktop\EXP IA\survey-layers-app
> Repositório GitHub: https://github.com/projetos-hub/pesquisa.git
> Leia o arquivo PROGRESSO.md para entender onde paramos."

---

## Estado atual: Fase 2A concluída — leitura de pesquisa via Supabase

---

## Arquivos principais

| Arquivo | O que é |
|---|---|
| `pesquisa.html` | Mini app React legado — referência, não mexer |
| `google-apps-script.js` | Backend legado para Google Sheets — referência |
| `docs/migration-plan.md` | Plano completo de migração (fonte de verdade) |
| `docs/decisions.md` | Decisões arquiteturais registradas |
| `docs/architecture.md` | Diagrama e estrutura da plataforma |
| `survey-platform/` | Next.js — novo frontend + API (em construção) |

---

## O que já está pronto

### Legado (pesquisa.html + google-apps-script.js)
- Engine CSAT completa e funcional
- NPS, fluxo bilíngue condicional, 3 eixos de avaliação
- 13 escolas com links de indicação
- Telas de prazo (não aberta / encerrada)
- Integração LayersPortal.js
- Google Sheets via Apps Script

---

### Fase 0 — Setup de infraestrutura ✅ (commit c581fb2)

| Arquivo | Descrição |
|---|---|
| `survey-platform/` | Projeto Next.js 16 scaffoldado |
| `survey-platform/lib/supabase.ts` | Cliente browser |
| `survey-platform/lib/supabase-server.ts` | Cliente server-side com cookies |
| `survey-platform/lib/supabase-service.ts` | Service role para API routes |
| `survey-platform/supabase/migrations/001_initial_schema.sql` | 6 tabelas + índices + RLS |

**Dependências:** `next@16.1.6`, `react@19`, `@supabase/supabase-js`, `@supabase/ssr`, `tailwindcss@4`, `typescript@5`

---

### Fase 1 — Engine respondente migrada ✅ (commit fd3f70a)

**19 arquivos criados. TypeScript: zero erros. Build: limpo.**

#### Contratos e engine

| Arquivo | O que faz |
|---|---|
| `components/survey-engine/utils/types.ts` | Tipos: `StepDef`, `SurveyConfig`, `Answers`, `SurveyContext`, `NPSAnswer`, `Perfil` |
| `components/survey-engine/utils/buildActiveSteps.ts` | `buildActiveSteps()` + `stepId()` — lógica condicional migrada literal do `pesquisa.html` L.219–229 |
| `lib/surveys.ts` | `SURVEYS` (pesquisa CSAT completa) + `SCHOOL_LINKS` (13 escolas) — hardcoded para Fase 1 |

#### Componentes de step

| Arquivo | Migrado de |
|---|---|
| `components/survey-engine/steps/WelcomeStep.tsx` | `pesquisa.html` L.293–337 |
| `components/survey-engine/steps/StepNPS.tsx` | L.343–375 — NPS 0–10 + pergunta bilíngue opcional |
| `components/survey-engine/steps/StepEscala.tsx` | L.382–439 — lista simples e com seções |
| `components/survey-engine/steps/StepRadio.tsx` | L.445–469 |
| `components/survey-engine/steps/StepText.tsx` | L.475–504 |
| `components/survey-engine/steps/ThankYou.tsx` | L.530–620 — 4 variantes: aluno, promotor, neutro, detrator |
| `components/survey-engine/steps/AindaNaoAberta.tsx` | L.626–637 |
| `components/survey-engine/steps/Encerrada.tsx` | L.639–650 |
| `components/survey-engine/steps/ErroSurvey.tsx` | L.652–661 |

#### Primitivos UI

| Arquivo | Migrado de |
|---|---|
| `components/ui/OptionBtn.tsx` | L.255–262 |
| `components/ui/ScaleRow.tsx` | L.264–276 |
| `components/ui/ProgressBar.tsx` | L.278–287 |

#### Engine principal e rota

| Arquivo | O que faz |
|---|---|
| `components/survey-engine/SurveyRunner.tsx` | `App()` refatorado: carrega contexto via URL params, gerencia estado, navegação condicional, submit simulado (TODO Fase 2) |
| `app/(respondente)/survey.css` | CSS do `pesquisa.html` preservado integralmente — zero diferença visual |
| `app/(respondente)/layout.tsx` | Layout isolado: Inter font + gradient background. Sem nav/footer |
| `app/(respondente)/p/[surveySlug]/page.tsx` | Rota `/p/csat`, `/p/qualquer-slug` — Suspense + SurveyRunner |

#### Decisões de implementação registradas

- `buildActiveSteps` copiado sem alteração de lógica — paridade garantida
- Navegação por `key` string, não por índice — preserva comportamento do bilíngue condicional
- `isLastData = currentIdx === activeSteps.length - 2` — fórmula idêntica ao original
- Submit simulado na Fase 1 (console.log + setTimeout) — substituído na Fase 2
- Contexto carregado via `useSearchParams()` — sem LayersPortal por ora

---

### Documentação ✅ (commits 5b9db6c, 892862a)
- `docs/decisions.md` — decisões arquiteturais com alternativas descartadas
- `docs/architecture.md` — diagrama, modelo de dados, fluxo de submissão, rotas planejadas

---

## Checklist de validação da Fase 1

```bash
cd survey-platform
npm run dev
# Abre em http://localhost:3000
```

Testar as 10 URLs abaixo no browser:

| # | URL | Esperado |
|---|---|---|
| 1 | `/p/csat?role=responsavel&nome=Ana&studentName=Pedro&grade=3F&school=qi` → NPS com bilíngue=Sim | Step bilíngue aparece |
| 2 | mesma URL → NPS com bilíngue=Não | Step bilíngue é pulado |
| 3 | Após cenário 1, no Pedagógico → Voltar | Volta para Bilíngue |
| 4 | Após cenário 2, no Pedagógico → Voltar | Volta para NPS |
| 5 | `/p/csat?role=responsavel&studentName=Pedro&school=qi` → NPS=9 ou 10 | ThankYou 🎉 + link indicação |
| 6 | mesma URL → NPS=0 a 6 | ThankYou 💬 sem link |
| 7 | `/p/csat?role=aluno&nome=Pedro&grade=3F` | ThankYou aluno sem link |
| 8 | `/p/csat?status=nao_aberta&openDate=2026-06-01` | Tela 🗓️ com data formatada |
| 9 | `/p/csat?status=encerrada&closeDate=2026-03-01` | Tela 🔒 com data formatada |
| 10 | `/p/pesquisa-invalida` | Tela ⚠️ "Pesquisa não encontrada" |

---

## Pendência manual — para ativar a Fase 2A no banco

1. Rodar `supabase/migrations/001_initial_schema.sql` no SQL Editor do Supabase (se ainda não rodou)
2. Rodar `supabase/migrations/002_seed_csat.sql` no SQL Editor do Supabase

Após esses dois passos, `/p/csat` busca a configuração do banco em vez do hardcode.

---

### Fase 2A — Leitura de pesquisa via Supabase ✅ (commit a074fb1)

| Arquivo | O que faz |
|---|---|
| `components/survey-engine/utils/types.ts` | `ConditionalDef` + `conditional_on?` em `BaseStep` |
| `lib/survey-config.ts` | `rowsToConfig()` (DB → config) + `applyConditionals()` (reconstrói funções no cliente) |
| `app/api/surveys/[slug]/route.ts` | GET — busca survey ativa, questions e options; retorna JSON |
| `supabase/migrations/002_seed_csat.sql` | Seed idempotente da CSAT (survey + 7 questions + options) |
| `components/survey-engine/SurveyRunner.tsx` | Fetch `/api/surveys/[slug]` + applyConditionals; spinner enquanto carrega |
| `lib/surveys.ts` | `SURVEYS` removido; `SCHOOL_LINKS` mantido |

**Decisões de implementação:**
- `condicional` (função JS) não é serializável em JSON → trafega como `conditional_on` (JSONB spec)
- `applyConditionals()` reconstrói as funções no cliente antes de armazenar no estado
- API usa `createServiceClient()` (service role) → sem problemas de RLS durante desenvolvimento
- Seed é idempotente: `ON CONFLICT (slug) DO UPDATE` + `DELETE FROM questions WHERE survey_id`

---

## Próximo passo: Fase 2B — Submit real para o Supabase

**O que será criado:**
- `app/api/surveys/[slug]/submit/route.ts` — POST: grava `response_session` + `responses`

**Mudança no código existente:**
- `SurveyRunner.tsx`: substituir submit simulado por `POST /api/surveys/[slug]/submit`

**Critério de done:** submissão real salva no Supabase; duplicatas rejeitadas com `{ duplicate: true }`.

---

## Roadmap completo

| Fase | Descrição | Status |
|---|---|---|
| 0 | Setup Next.js + Supabase clients + schema | ✅ Concluída (commit c581fb2) |
| 1 | Engine migrada (frontend respondente) | ✅ Concluída (commit fd3f70a) |
| 2A | Leitura de pesquisa via Supabase | ✅ Concluída (commit a074fb1) |
| 2B | Submit real para Supabase | 🔜 Próxima |
| 3 | Área admin | ⏳ Pendente |
| 4 | Google Sheets espelho | ⏳ Pendente |
| 5 | Polimento e remoção de hardcodes | ⏳ Pendente |
