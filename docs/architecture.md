# Arquitetura — Plataforma de Pesquisas

> Atualizado em: 2026-03-10
> Estado: Fase 0 concluída (infraestrutura). Fase 1 não iniciada.

---

## Estado atual (Fase 0)

O que existe hoje é apenas a **infraestrutura base** — Next.js scaffoldado com clientes Supabase e schema SQL. Nenhuma rota funcional além da home placeholder.

```
pesquisa.html  ←── ainda em produção (legado)
survey-platform/  ←── em construção (Next.js, sem rotas de negócio)
```

---

## Diagrama — Arquitetura alvo (todas as fases)

```
┌─────────────────────────────────────────────────────────────┐
│                        USUÁRIO FINAL                        │
│                  (iFrame no app Layers)                     │
└────────────────────────┬────────────────────────────────────┘
                         │ GET /p/[surveySlug]
                         │ ?communityId=...&role=responsavel
                         ▼
┌─────────────────────────────────────────────────────────────┐
│              Next.js — App Respondente                      │
│   app/(respondente)/p/[surveySlug]/page.tsx                 │
│                                                             │
│   ┌─────────────────────────────────────────────────────┐  │
│   │              SurveyRunner.tsx                        │  │
│   │  ┌──────────────┐  ┌───────────────────────────┐   │  │
│   │  │buildActive   │  │  steps/                    │   │  │
│   │  │Steps.ts      │  │  WelcomeStep.tsx           │   │  │
│   │  │              │  │  StepNPS.tsx               │   │  │
│   │  │ filtra steps │  │  StepEscala.tsx            │   │  │
│   │  │ por respostas│  │  StepRadio.tsx             │   │  │
│   │  │ e perfil     │  │  StepText.tsx              │   │  │
│   │  └──────────────┘  │  ThankYou.tsx              │   │  │
│   │                    └───────────────────────────┘   │  │
│   └─────────────────────────────────────────────────────┘  │
│                         │                                   │
│              GET /api/surveys/[slug]                        │
│              POST /api/surveys/[slug]/submit                │
└────────────────────────┬────────────────────────────────────┘
                         │
         ┌───────────────┴────────────────┐
         ▼                                ▼
┌─────────────────┐            ┌──────────────────────┐
│    Supabase     │            │   Google Apps Script  │
│  (fonte verdade)│            │   (espelho — Sheets)  │
│                 │            │                       │
│  surveys        │            │  POST payload         │
│  questions      │            │  → aba Respostas_csat │
│  question_options│           │  synced_to_sheets=true│
│  response_sessions│          │  falha silenciosa     │
│  responses      │            └──────────────────────┘
│  admin_profiles │
└─────────────────┘

┌─────────────────────────────────────────────────────────────┐
│              Next.js — App Admin                            │
│   app/admin/...                                             │
│                                                             │
│   Supabase Auth (magic link)                                │
│   CRUD: surveys, questions, options                         │
│   shadcn/ui: tabela, drawer, dialog                         │
└─────────────────────────────────────────────────────────────┘
```

---

## Diagrama — Estado atual (Fase 0)

```
survey-platform/
│
├── app/
│   ├── layout.tsx         ← Root layout (Tailwind, fonte)
│   ├── page.tsx           ← Home placeholder (sem conteúdo)
│   └── globals.css        ← Tailwind v4 base
│
├── lib/
│   ├── supabase.ts        ← createBrowserClient()   [browser]
│   ├── supabase-server.ts ← createServerClient()    [RSC/API]
│   └── supabase-service.ts← createClient(serviceKey)[API routes]
│
└── supabase/
    └── migrations/
        └── 001_initial_schema.sql  ← 6 tabelas + RLS + trigger
```

**O que NÃO existe ainda:**
- Rotas respondente (`/p/[surveySlug]`)
- Engine (`SurveyRunner`, steps, `buildActiveSteps`)
- API routes (`/api/surveys/[slug]`)
- Área admin
- Integração Sheets

---

## Modelo de dados

```
surveys ──< questions ──< question_options
   │
   └──< response_sessions ──< responses
```

| Tabela | Chave primária | Relações |
|---|---|---|
| `surveys` | `id` (UUID) | tem muitas `questions`, `response_sessions` |
| `questions` | `id` (UUID) | pertence a `survey`, tem muitas `question_options` |
| `question_options` | `id` (UUID) | pertence a `question` |
| `response_sessions` | `id` (UUID) | pertence a `survey`, UNIQUE `(survey_id, community_id, user_id)` |
| `responses` | `id` (UUID) | pertence a `response_session` e `question` |
| `admin_profiles` | `id` (UUID = auth.users.id) | — |

---

## Row Level Security — Resumo

| Tabela | Anônimo pode | Autenticado pode |
|---|---|---|
| `surveys` | SELECT onde `status = 'ativa'` | — |
| `questions` | SELECT via survey ativa | — |
| `question_options` | SELECT via survey ativa | — |
| `response_sessions` | INSERT | — |
| `responses` | INSERT | — |
| `admin_profiles` | — | ALL onde `auth.uid() = id` |

Admin com `service_role_key` (API routes): bypass de RLS, acesso total.

---

## Fluxo de submissão (Fase 2+)

```
1. Respondente clica "Enviar"
2. SurveyRunner → POST /api/surveys/[slug]/submit
3. API route (service role):
   a. INSERT response_sessions
      → CONFLICT (survey_id, community_id, user_id): retorna { duplicate: true }
   b. INSERT responses (uma row por pergunta)
   c. POST Apps Script (assíncrono, falha silenciosa)
      → success: UPDATE response_sessions SET synced_to_sheets = true
      → failure: mantém synced_to_sheets = false (reprocessar depois)
4. Responde { ok: true } ao frontend
5. SurveyRunner exibe ThankYou
```

---

## Rotas planejadas

| Rota | Tipo | Fase | Descrição |
|---|---|---|---|
| `/` | Page | 0 | Home placeholder |
| `/p/[surveySlug]` | Page | 1 | Frontend respondente |
| `/api/surveys/[slug]` | API GET | 2 | Config da pesquisa |
| `/api/surveys/[slug]/submit` | API POST | 2 | Submissão de resposta |
| `/admin` | Page | 3 | Dashboard admin |
| `/admin/surveys` | Page | 3 | Lista de pesquisas |
| `/admin/surveys/new` | Page | 3 | Criar pesquisa |
| `/admin/surveys/[id]` | Page | 3 | Editar pesquisa |
| `/admin/surveys/[id]/questions` | Page | 3 | Gerenciar perguntas |
