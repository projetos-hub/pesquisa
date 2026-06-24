# Arquitetura — Plataforma de Pesquisas

> Atualizado em: 2026-03-10
> Estado: Fase 3 concluída. Próxima: Fase 4 (Google Sheets espelho).

---

## Estado atual (Fase 3 concluída)

```
pesquisa.html  ←── legado em produção (referência, não mexer)
survey-platform/  ←── plataforma nova funcional (Fases 0–3 completas)
```

O que já está operacional:
- Engine respondente completa (`/p/[surveySlug]`)
- API de leitura (`GET /api/surveys/[slug]`) — lê do Supabase
- API de submissão (`POST /api/surveys/[slug]/submit`) — grava no Supabase com idempotência
- Área admin com auth magic link, CRUD de surveys e tabela de respostas
- RLS configurado para leitura pública (surveys ativas) e admin (admin_profiles)

O que falta:
- Fase 4: espelho Google Sheets após gravação no Supabase
- Fase 5: polimento (LayersPortal.js, remoção de hardcodes, paginação, editor de perguntas)

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

## Estrutura atual — survey-platform/

```
survey-platform/
│
├── app/
│   ├── (respondente)/p/[surveySlug]/   ← frontend respondente ✅
│   ├── admin/                           ← área admin protegida ✅
│   │   ├── login/                       ← magic link ✅
│   │   ├── auth/callback/               ← troca code → sessão ✅
│   │   ├── surveys/                     ← lista + CRUD ✅
│   │   └── surveys/[id]/responses/      ← tabela de respostas ✅
│   └── api/surveys/[slug]/
│       ├── route.ts                     ← GET config ✅
│       └── submit/route.ts              ← POST submissão ✅
│
├── components/
│   ├── survey-engine/                   ← engine migrada ✅
│   │   ├── steps/                       ← NPS, Escala, Radio, Text, etc.
│   │   └── utils/                       ← buildActiveSteps, types
│   └── ui/                              ← OptionBtn, ScaleRow, ProgressBar
│
├── lib/
│   ├── supabase.ts                      ← browser client
│   ├── supabase-server.ts               ← server/RSC client
│   ├── supabase-service.ts              ← service role (API routes)
│   └── survey-config.ts                 ← rowsToConfig + applyConditionals
│
├── proxy.ts                             ← auth guard /admin/* ✅
│
└── supabase/migrations/
    ├── 001_initial_schema.sql           ← schema base + RLS
    ├── 002_seed_csat.sql                ← seed CSAT (idempotente)
    └── 003_admin_rls_and_constraints.sql← RLS admin + UNIQUE(survey_id,key)
```

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

## Rotas

| Rota | Tipo | Status | Descrição |
|---|---|---|---|
| `/p/[surveySlug]` | Page | ✅ | Frontend respondente |
| `/api/surveys/[slug]` | API GET | ✅ | Config da pesquisa via Supabase |
| `/api/surveys/[slug]/submit` | API POST | ✅ | Submissão com idempotência |
| `/admin/login` | Page | ✅ | Magic link auth |
| `/admin/auth/callback` | Route | ✅ | Troca code → sessão Supabase |
| `/admin` | Page | ✅ | Redireciona para /admin/surveys |
| `/admin/surveys` | Page | ✅ | Lista surveys com stats |
| `/admin/surveys/new` | Page | ✅ | Criar pesquisa |
| `/admin/surveys/[id]` | Page | ✅ | Editar título/status/datas |
| `/admin/surveys/[id]/responses` | Page | ✅ | Tabela de respostas |
| `/admin/surveys/[id]/questions` | Page | 🔜 Fase 3B | Editor de perguntas (drag & drop) |
# Atualizacao operacional - 2026-06-24

Este documento tem historico das fases iniciais. Para o estado atual da arquitetura, considerar tambem:

- `docs/release-2026-06-24-visual-sample-text.md`
- `README.md`
- `survey-platform/README.md`
- `MANUAL-RETOMADA.md`

Pontos atuais:

- Admin sem sidebar lateral como estrutura principal.
- Home com tiles/atalhos principais.
- Telas internas com navegacao superior compacta em `app/admin/AdminHubNav.tsx`.
- Shell visual do admin em `app/admin/AdminPageShell.tsx`.
- Identidade visual por comunidade em `/admin/communities`.
- Placeholders visuais em `app/admin/components/PlaceholderTextField.tsx`.
- Controle de alinhamento em `app/admin/components/TextAlignControl.tsx`.
- Helper de alinhamento do respondente em `components/survey-engine/utils/textAlign.ts`.
- Aliases de comunidades em `lib/community-mapping.ts`.
- Agregacao paginada de comunidades de amostra em `app/api/admin/surveys/[id]/sample/communities/route.ts`.

---
