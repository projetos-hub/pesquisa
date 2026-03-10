# Plano de Migração — Plataforma de Pesquisas

## Objetivo

Transformar o mini app de pesquisa atual (`pesquisa.html` + `google-apps-script.js`) em uma **plataforma multi-pesquisa** com:

- Frontend respondente hospedado na Vercel (Next.js)
- Área admin para criar, editar e publicar pesquisas sem tocar no código
- Supabase como banco de dados principal (fonte de verdade)
- Google Sheets como espelho operacional (mantém fluxo atual de análise)
- Suporte a pesquisas quantitativas e qualitativas direcionadas por público (responsável / aluno)

**O que não muda para o usuário final:** visual, fluxo de resposta, integração com LayersPortal, links de indicação por escola.

---

## Arquitetura Alvo

```
[ Usuário respondente ]
        │  GET /p/[surveySlug]?communityId=...&role=...
        ▼
[ Next.js — App respondente ]
  /app/(respondente)/p/[surveySlug]/page.tsx
  └─ SurveyRunner (engine migrada de pesquisa.html)
        │  GET /api/surveys/[slug]
        │  POST /api/surveys/[slug]/submit
        ▼
[ Next.js — API Routes ]
  /app/api/surveys/[slug]/route.ts         ← retorna config da pesquisa
  /app/api/surveys/[slug]/submit/route.ts  ← grava resposta
        │
        ├──► Supabase (fonte de verdade)
        └──► Google Sheets via Apps Script (espelho, falha silenciosa)

[ Admin ]
        │  GET /admin
        ▼
[ Next.js — App Admin ]
  /app/admin/...
  └─ Auth via Supabase (magic link, sem senha)
  └─ CRUD surveys, questions, options
```

### Stack

| Camada | Tecnologia |
|---|---|
| Frontend respondente + Admin | Next.js 14 (App Router) |
| Backend / API | Next.js API Routes |
| Banco principal | Supabase (PostgreSQL) |
| Autenticação admin | Supabase Auth (magic link) |
| Espelho operacional | Google Sheets via Apps Script |
| Deploy | Vercel |

### Localização no repositório

```
pesquisa.git/
├── pesquisa.html           ← legado, não mexe
├── google-apps-script.js   ← referência do espelho
├── PROGRESSO.md
├── docs/
│   └── migration-plan.md   ← este arquivo
└── survey-platform/        ← Next.js (a criar)
    ├── app/
    ├── components/
    ├── lib/
    └── supabase/
```

---

## Roadmap de Implementação

### Fase 0 — Setup da infraestrutura
**Objetivo:** projeto Next.js rodando na Vercel conectado ao Supabase.

Pré-requisito: **Node.js LTS instalado** (`winget install OpenJS.NodeJS.LTS`).

Entregas:
- `survey-platform/` scaffoldado com `create-next-app` (TypeScript + Tailwind + App Router)
- `lib/supabase.ts` — cliente Supabase (server + client)
- `supabase/migrations/001_initial_schema.sql` — schema completo
- `.env.local` com variáveis Supabase
- Deploy inicial na Vercel retornando página vazia

---

### Fase 1 — Engine migrada com SURVEYS temporário
**Objetivo:** frontend respondente funciona identicamente ao `pesquisa.html` atual.

Entregas:
- `components/survey-engine/utils/buildActiveSteps.ts` — migrado de `pesquisa.html` L.219–229
- `components/survey-engine/utils/types.ts` — tipos TypeScript: `SurveyConfig`, `Step`, `Answers`
- `components/survey-engine/SurveyRunner.tsx` — engine principal (App() refatorado)
- `components/survey-engine/steps/`:
  - `WelcomeStep.tsx`
  - `StepNPS.tsx`
  - `StepEscala.tsx`
  - `StepRadio.tsx`
  - `StepText.tsx`
  - `ThankYou.tsx`
  - `AindaNaoAberta.tsx`
  - `Encerrada.tsx`
  - `ErroSurvey.tsx`
- `components/ui/ProgressBar.tsx`, `ScaleRow.tsx`, `OptionBtn.tsx`
- `app/(respondente)/p/[surveySlug]/page.tsx`
- CSS do `pesquisa.html` preservado (mesmo visual)
- `SURVEYS` hardcoded temporariamente nesta fase

Cenários de teste obrigatórios:
1. Responsável, bilíngue = Sim → step bilíngue aparece
2. Responsável, bilíngue = Não → step bilíngue é pulado
3. Voltar no step pedagógico após bilíngue = Sim → volta para bilíngue
4. Voltar no step pedagógico após bilíngue = Não → volta para NPS
5. ThankYou responsável promotor (com link de indicação)
6. ThankYou responsável detrator (sem link)
7. ThankYou aluno (sem link)
8. Tela "pesquisa não aberta"
9. Tela "pesquisa encerrada"
10. `surveyId` inválido → tela de erro

---

### Fase 2 — Backend real (Supabase)
**Objetivo:** submissão vai para Supabase; config da pesquisa vem do banco.

Entregas:
- `app/api/surveys/[slug]/route.ts` — GET config da pesquisa
- `app/api/surveys/[slug]/submit/route.ts` — POST resposta
- `lib/survey-config.ts` — transforma rows do banco → `SurveyConfig`
- `supabase/migrations/002_seed_csat.sql` — popula CSAT via SQL (sem redigitar)
- `SURVEYS` hardcoded removido; engine lê via API
- Idempotência: `(survey_id, community_id, user_id)` unique → sem duplicatas
- `synced_to_sheets = false` quando Sheets falha (reprocessamento futuro)

---

### Fase 3 — Área admin
**Objetivo:** criar e editar pesquisas sem tocar no código.

Entregas:
- `app/admin/layout.tsx` — guard de autenticação Supabase
- `app/admin/page.tsx` — dashboard (lista de pesquisas, status, total de respostas)
- `app/admin/surveys/page.tsx` — lista de pesquisas
- `app/admin/surveys/new/page.tsx` — criar pesquisa
- `app/admin/surveys/[id]/page.tsx` — editar metadados
- `app/admin/surveys/[id]/questions/page.tsx` — gerenciar perguntas
- `components/admin/SurveyForm.tsx` — formulário de criação/edição
- `components/admin/QuestionList.tsx` — lista ordenável (drag & drop com `@dnd-kit/core`)
- `components/admin/QuestionEditor.tsx` — drawer lateral por tipo de pergunta
- `shadcn/ui` para componentes admin (tabela, drawer, dialog, toast)
- Auth: magic link por e-mail, sem senha

---

### Fase 4 — Google Sheets espelho
**Objetivo:** respostas replicadas no Sheets após gravação no Supabase.

Entregas:
- `lib/sheets.ts` — cliente do Apps Script
- `submit/route.ts` atualizado para chamar Sheets após Supabase
- `google-apps-script.js` ajustado para aceitar payload da API route
- Sheets funciona como hoje, porém espelho — não mais fonte de verdade

---

### Fase 5 — Polimento e remoção de hardcodes
**Objetivo:** plataforma completa; nova pesquisa = só adicionar no admin.

Entregas:
- `WelcomeStep` e `ThankYou` configuráveis via `surveys.settings` no banco
- `SCHOOL_LINKS` migrados para `surveys.settings.indicacao_links`
- Pasta `src/` removida do repositório
- `pesquisa.html` arquivado ou removido (decisão final do time)

---

## Modelo de Dados (Supabase)

```sql
-- Pesquisas
CREATE TABLE surveys (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug          TEXT UNIQUE NOT NULL,
  title         TEXT NOT NULL,
  description   TEXT,
  survey_type   TEXT CHECK (survey_type IN ('quantitativa', 'qualitativa')) DEFAULT 'quantitativa',
  target_roles  TEXT[] DEFAULT ARRAY['responsavel', 'aluno'],
  status        TEXT CHECK (status IN ('rascunho', 'ativa', 'pausada', 'encerrada')) DEFAULT 'rascunho',
  open_date     DATE,
  close_date    DATE,
  settings      JSONB DEFAULT '{}',
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Perguntas
CREATE TABLE questions (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  survey_id      UUID REFERENCES surveys(id) ON DELETE CASCADE,
  order_index    INTEGER NOT NULL,
  type           TEXT CHECK (type IN ('welcome','nps','scale','scale_sections','radio','text','thankyou')),
  key            TEXT NOT NULL,
  title          TEXT NOT NULL,
  description    TEXT,
  required       BOOLEAN DEFAULT true,
  only_for_roles TEXT[],
  conditional_on JSONB,
  settings       JSONB DEFAULT '{}',
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

-- Opções (radio, scale_sections)
CREATE TABLE question_options (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id   UUID REFERENCES questions(id) ON DELETE CASCADE,
  order_index   INTEGER NOT NULL,
  label         TEXT NOT NULL,
  value         TEXT NOT NULL,
  section_key   TEXT,
  section_title TEXT
);

-- Sessões de resposta
CREATE TABLE response_sessions (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  survey_id        UUID REFERENCES surveys(id),
  community_id     TEXT,
  user_id          TEXT,
  perfil           TEXT,
  nome_responsavel TEXT,
  nome_aluno       TEXT,
  serie            TEXT,
  school           TEXT,
  onda             TEXT,
  submitted_at     TIMESTAMPTZ DEFAULT NOW(),
  synced_to_sheets BOOLEAN DEFAULT false,
  synced_at        TIMESTAMPTZ,
  UNIQUE (survey_id, community_id, user_id)
);

-- Respostas por pergunta
CREATE TABLE responses (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id   UUID REFERENCES response_sessions(id) ON DELETE CASCADE,
  question_id  UUID REFERENCES questions(id),
  question_key TEXT NOT NULL,
  value        JSONB NOT NULL,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- Admins
CREATE TABLE admin_profiles (
  id         UUID PRIMARY KEY REFERENCES auth.users(id),
  email      TEXT UNIQUE NOT NULL,
  name       TEXT,
  role       TEXT DEFAULT 'editor' CHECK (role IN ('admin', 'editor')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## Riscos Técnicos

| Risco | Fase | Probabilidade | Mitigação |
|---|---|---|---|
| Regressão no fluxo condicional bilíngue | 1 | Alta | 10 cenários de teste obrigatórios antes de avançar para Fase 2 |
| `buildActiveSteps` com índices incorretos após conversão para TypeScript | 1 | Média | Migrar usando navegação por `key` (não índice) — já implementado em `pesquisa.html` |
| Transformação banco → `SurveyConfig` produz estrutura diferente do legado | 2 | Média | Comparar output de `lib/survey-config.ts` com o objeto `SURVEYS['csat']` antes de remover hardcode |
| Apps Script URL inativa ao reativar espelho | 4 | Baixa | Reimplantar como nova implantação no Google Apps Script |
| Drag & drop de perguntas no admin com `@dnd-kit` | 3 | Média | Isolar em componente `QuestionList` — fallback: reordenação por setas |
| Variáveis de ambiente Supabase não configuradas na Vercel | 0 | Baixa | Checklist de deploy: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` |
| Submissão duplicada por reenvio do usuário | 2 | Média | Constraint `UNIQUE (survey_id, community_id, user_id)` + resposta `{ ok: true, duplicate: true }` |

---

## Decisões de Arquitetura Registradas

| Decisão | Alternativa descartada | Motivo |
|---|---|---|
| Next.js App Router | Manter React CDN (`pesquisa.html`) | Admin exige roteamento, SSR e auth — inviável em HTML único |
| Supabase como banco principal | Continuar só com Google Sheets | Sheets é ponto único de falha; sem idempotência; sem auth |
| Magic link Supabase para admin | Senha + JWT custom | Zero infraestrutura adicional; mais seguro que senha |
| `survey-platform/` dentro do repositório atual | Novo repositório separado | Mantém histórico unificado; pesquisa.html permanece como referência acessível |
| Google Sheets como espelho (não primário) | Remover Sheets completamente | Time já usa Sheets para análise; migração gradual menos arriscada |
