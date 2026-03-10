# Progresso — Plataforma de Pesquisas Layers Education

## Como retomar com o assistente

> "Estou desenvolvendo uma plataforma de pesquisas de satisfação para a Layers Education.
> O projeto fica em C:\Users\luisa.lopes\Desktop\EXP IA\survey-layers-app
> Repositório GitHub: https://github.com/projetos-hub/pesquisa.git
> Leia o arquivo PROGRESSO.md para entender onde paramos."

---

## Estado atual: Fase 0 concluída — Fase 1 iniciando

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

### Documentação ✅ (commit 5b9db6c)
- `docs/decisions.md` — decisões arquiteturais com alternativas descartadas
- `docs/architecture.md` — diagrama, modelo de dados, fluxo de submissão, rotas planejadas
- `PROGRESSO.md` — atualizado com estado completo da Fase 0

### Fase 0 — Setup de infraestrutura ✅ (commit c581fb2)

**Arquivos criados:**

| Arquivo | Descrição |
|---|---|
| `survey-platform/` | Projeto Next.js 16 scaffoldado |
| `survey-platform/app/layout.tsx` | Root layout (App Router) |
| `survey-platform/app/page.tsx` | Home page placeholder |
| `survey-platform/app/globals.css` | Tailwind v4 base styles |
| `survey-platform/lib/supabase.ts` | Cliente browser (`createBrowserClient`) |
| `survey-platform/lib/supabase-server.ts` | Cliente server-side com cookies |
| `survey-platform/lib/supabase-service.ts` | Service role para API routes |
| `survey-platform/supabase/migrations/001_initial_schema.sql` | Schema completo: 6 tabelas + índices + RLS |
| `survey-platform/next.config.ts` | Config Next.js (turbopack) |
| `survey-platform/tsconfig.json` | TypeScript strict |
| `survey-platform/package.json` | Dependências |

**Dependências instaladas:**

| Pacote | Versão | Uso |
|---|---|---|
| `next` | 16.1.6 | Framework principal |
| `react` / `react-dom` | 19.2.3 | UI |
| `@supabase/supabase-js` | ^2.99.0 | Cliente Supabase |
| `@supabase/ssr` | ^0.9.0 | SSR com cookies |
| `tailwindcss` | ^4 | Estilização |
| `typescript` | ^5 | Type safety |

**Schema SQL criado (`001_initial_schema.sql`):**
- `surveys` — pesquisas (slug, status, datas, settings JSONB)
- `questions` — perguntas com tipo, ordem e condicionais
- `question_options` — opções de radio/scale_sections
- `response_sessions` — sessão única por (survey, community, user)
- `responses` — respostas por pergunta (JSONB)
- `admin_profiles` — usuários admin (via Supabase Auth)
- RLS habilitado em todas as tabelas
- Trigger `updated_at` em `surveys`

---

## Checklist de validação da Fase 0

Execute antes de avançar para a Fase 1:

```bash
cd survey-platform

# 1. Confirmar dependências
npm list --depth=0
# next, react, @supabase/supabase-js, @supabase/ssr devem aparecer

# 2. Dev server
npm run dev
# → http://localhost:3000 deve abrir (home placeholder do Next.js)

# 3. Build de produção
npm run build
# → "✓ Compiled successfully"

# 4. TypeScript sem erros
npx tsc --noEmit
# → zero erros

# 5. Estrutura dos arquivos lib/
ls lib/
# → supabase.ts  supabase-server.ts  supabase-service.ts
```

---

## Pendência manual (antes de avançar para Fase 2)

Criar projeto no Supabase e preencher `survey-platform/.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJh...
SUPABASE_SERVICE_ROLE_KEY=eyJh...
```

Rodar `001_initial_schema.sql` no SQL Editor do Supabase.

---

## Próximo passo: Fase 1 — Engine migrada

**Objetivo:** frontend respondente funciona identicamente ao `pesquisa.html` atual, porém em Next.js com TypeScript.

**O que será criado (em ordem):**

1. `components/survey-engine/utils/types.ts` — contratos TypeScript (`StepType`, `Step`, `Answers`, `SurveyConfig`, `SurveyStatus`)
2. `components/survey-engine/utils/buildActiveSteps.ts` — lógica condicional (migrada do `pesquisa.html`)
3. `components/survey-engine/steps/` — um componente por tipo de step
4. `components/survey-engine/SurveyRunner.tsx` — engine principal com estado e navegação
5. `components/ui/` — primitivos (`ProgressBar`, `ScaleRow`, `OptionBtn`)
6. `app/(respondente)/p/[surveySlug]/page.tsx` — rota respondente
7. CSS do legado preservado (mesmo visual)
8. `SURVEYS` hardcoded temporariamente (substituído na Fase 2)

**Primeiro arquivo a criar:** `types.ts` — define o contrato de dados antes de qualquer componente.

**Critério de done:** 10 cenários de teste do `migration-plan.md` passando.

**Nota:** a Fase 1 não depende de Supabase. Pode ser executada antes de configurar o `.env.local`.

---

## Roadmap completo

| Fase | Descrição | Status |
|---|---|---|
| 0 | Setup Next.js + Supabase clients + schema | ✅ Concluída |
| 1 | Engine migrada (frontend respondente) | 🔜 Próxima |
| 2 | Backend real (Supabase API routes) | ⏳ Pendente |
| 3 | Área admin | ⏳ Pendente |
| 4 | Google Sheets espelho | ⏳ Pendente |
| 5 | Polimento e remoção de hardcodes | ⏳ Pendente |
