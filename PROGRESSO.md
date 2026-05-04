# Progresso — Plataforma de Pesquisas Layers Education

## Como retomar com o assistente

> "Estou desenvolvendo uma plataforma de pesquisas de satisfação para a Layers Education.
> O projeto fica em C:\Users\luisa.lopes\Desktop\EXP IA\survey-layers-app
> Repositório GitHub: https://github.com/projetos-hub/pesquisa.git
> Leia o arquivo PROGRESSO.md para entender onde paramos."

---

## Estado atual: Fase 7 concluída (Deploy Vercel) → Fase 8 em planejamento

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
- GET usa anon client (RLS como defesa real) — service client só no submit
- Seed é idempotente: `ON CONFLICT (slug) DO UPDATE` + `DELETE FROM questions WHERE survey_id`

---

### Fase 2B — Submit real para Supabase ✅ (commit 419b4f8)

| Arquivo | O que faz |
|---|---|
| `app/api/surveys/[slug]/submit/route.ts` | POST: upsert `response_session` (idempotente) + insert `responses` em batch |
| `components/survey-engine/SurveyRunner.tsx` | `submitPesquisa` agora faz `POST /api/surveys/[slug]/submit`; duplicate navega para ThankYou |

**Decisões de implementação:**
- Idempotência via `upsert + ignoreDuplicates: true` → `ON CONFLICT (survey_id, community_id, user_id) DO NOTHING`
- `{ duplicate: true }` navega para ThankYou silenciosamente (não é erro do ponto de vista do usuário)
- Respostas de steps pulados (bilíngue condicional) simplesmente não existem em `answers` → ignoradas automaticamente
- `communityId`/`userId` vindos de URL params (serão preenchidos via LayersPortal na Fase 3+)
- Compensação manual: se insert de responses falhar, session é deletada para não bloquear re-envio

---

### Correções pós-review Fase 2 ✅ (commit 5905c02)

| Item | O que foi corrigido |
|---|---|
| GET route com service client | Trocado por anon client — RLS ativa para leitura pública |
| Partial insert sem compensação | Submit deleta session órfã se responses falhar |
| Sem `UNIQUE(survey_id, key)` | Adicionado em `003_admin_rls_and_constraints.sql` |
| Sem RLS de leitura para admin | Políticas criadas para `response_sessions`, `responses`, `surveys`, `questions`, `question_options` |

**Pendências identificadas (diferidas para Fase 3+):**
- `status` da pesquisa calculado no cliente via query param — mover cálculo para o servidor na Fase 3
- `only_for_roles` usa apenas `[0]` do array — documentado, sem impacto no CSAT atual
- Validação de `perfil`/`onda` no submit — implementar junto com autenticação LayersPortal

**Rodar no Supabase antes de usar a Fase 3:**
```sql
-- SQL Editor do Supabase:
003_admin_rls_and_constraints.sql
```

---

---

### Fase 3 — Área admin ✅ (commit 5c69ad0)

**13 arquivos criados. Build: limpo. TypeScript: zero erros.**

| Arquivo | O que faz |
|---|---|
| `proxy.ts` | Auth guard para `/admin/*` (Next.js 16 proxy) — redireciona para `/admin/login` se não autenticado |
| `app/admin/auth/callback/route.ts` | Troca `code` por sessão Supabase Auth (magic link callback) |
| `app/admin/login/page.tsx` | Formulário de magic link — envia e-mail, exibe confirmação |
| `app/admin/LogoutButton.tsx` | Botão de logout (client component — chama `signOut()`) |
| `app/admin/layout.tsx` | Layout com sidebar + verificação server-side de auth |
| `app/admin/page.tsx` | Redireciona `/admin` → `/admin/surveys` |
| `app/admin/surveys/page.tsx` | Lista surveys com status, respostas e datas |
| `app/admin/surveys/actions.ts` | Server Actions: `updateSurvey` e `createSurvey` (auth + service client) |
| `app/admin/surveys/new/page.tsx` + `NewSurveyForm.tsx` | Criação de pesquisa (título, slug, tipo, público) |
| `app/admin/surveys/[id]/page.tsx` | Detalhe: stats por perfil + top escolas + link para respostas |
| `app/admin/surveys/[id]/SurveyEditForm.tsx` | Edição de título, status e datas (useActionState) |
| `app/admin/surveys/[id]/responses/page.tsx` | Tabela: NPS + médias por eixo (pedagógico, admin, infra, bilíngue) |

**Decisões de implementação:**
- Dupla proteção: `proxy.ts` (borda) + auth check em `layout.tsx` (Server Component)
- Mutações via `createServiceClient()` com `requireAuth()` explícita antes de cada write
- Leituras via `createServerSupabaseClient()` — RLS verifica `admin_profiles` automaticamente
- `useActionState` para feedback inline de erros/sucesso sem page reload
- Magic link: sem senha, sem configuração de OAuth extra

**Pré-requisito para usar o admin:**
1. Rodar `003_admin_rls_and_constraints.sql` no Supabase
2. Supabase Dashboard → Authentication → URL Configuration → adicionar `{seu-domínio}/admin/auth/callback` em "Redirect URLs"
3. Criar usuário admin: Supabase Dashboard → Authentication → Users → "Invite user"
4. Inserir o usuário em `admin_profiles`:
```sql
INSERT INTO admin_profiles (id, email, name, role)
SELECT id, email, 'Admin', 'admin'
FROM auth.users
WHERE email = 'seu@email.com';
```

**Diferido para Fase 3B:**
- Editor de perguntas (drag & drop com @dnd-kit)
- Paginação na tabela de respostas (hoje mostra todas)

---

### Fix pós-Fase 3 — ERR_TOO_MANY_REDIRECTS ✅ (commit 107ccd1)

**Causa:** `app/admin/layout.tsx` envolvia todas as rotas `/admin/*` incluindo `/admin/login`. Quando usuário não autenticado acessava `/admin/login`, o proxy deixava passar corretamente, mas o layout chamava `redirect('/admin/login')` → loop infinito.

**Correção:** substituído `if (!user) redirect('/admin/login')` por `if (!user) return <>{children}</>` em `layout.tsx`. O `proxy.ts` continua sendo a única fonte de lógica de redirect; o layout é apenas estrutura visual.

**Também removido:** `console.log` de debug esquecido em `app/page.tsx`.

---

## Roadmap completo

| Fase | Descrição | Status |
|---|---|---|
| 0 | Setup Next.js + Supabase clients + schema | ✅ Concluída (commit c581fb2) |
| 1 | Engine migrada (frontend respondente) | ✅ Concluída (commit fd3f70a) |
| 2A | Leitura de pesquisa via Supabase | ✅ Concluída (commit a074fb1) |
| 2B | Submit real para Supabase | ✅ Concluída (commit 419b4f8) |
| 3 | Área admin | ✅ Concluída (commit 5c69ad0) |
| 3-fix | ERR_TOO_MANY_REDIRECTS no login | ✅ Corrigido (commit 107ccd1) |
| 4 | Google Sheets espelho + retry + cron | ✅ Concluída (commit fcae9e6) |
| 5 | Polimento e remoção de hardcodes | ✅ Concluída (commit ddd8180) |
| 6 | Segmentação amostral por escola | ✅ Concluída (commit 20a08a8) — amostra Excel, acesso por email, disparo amostral personalizado |

---

## Convenção de School Assets — Definida em 2026-04-01

### Bucket Supabase Storage
- **Nome do bucket:** `school-assets` (visibilidade: **public**)
- **Pasta:** `logos/`
- **Arquivo:** `{community_id}.svg` — ex: `qi-freguesia.svg`, `leonardodavinci-alfa.svg`

### Formato de arquivo
| Prioridade | Formato | Motivo |
|---|---|---|
| ✅ 1º | SVG | Vetorial, transparente, ~2-10KB |
| ✅ 2º | PNG-24 | Fallback — fundo transparente obrigatório |
| ❌ Evitar | JPEG | Sem transparência |

### URL a salvar em `survey_communities.theme.logo`
```
https://{project-ref}.supabase.co/storage/v1/object/public/school-assets/logos/{community_id}.svg
```

### SQL para inserir logo de uma escola
```sql
UPDATE survey_communities
SET theme = jsonb_set(
  COALESCE(theme, '{}'),
  '{logo}',
  '"https://{project-ref}.supabase.co/storage/v1/object/public/school-assets/logos/qi-freguesia.svg"'
)
WHERE community_id = 'qi-freguesia';
```

### Como testar
1. Upload do arquivo no bucket `school-assets/logos/`
2. Inserir URL via SQL acima
3. Acessar `/p/csat?communityId={id}` → logo aparece no WelcomeStep

---

## Próximos passos

### Fase 7 — Deploy na Vercel ✅ (commit dab4774 - 2026-04-16)

**Completado:**
- ✅ Repositório GitHub conectado à Vercel (`survey-platform/` como root)
- ✅ Variáveis de ambiente configuradas (SUPABASE_*, LAYERS_API_TOKEN, CRON_SECRET)
- ✅ Todas as migrations rodadas em produção (001-010)
- ✅ App ao vivo em: https://pesquisa-nu-sand.vercel.app

**Bugs corrigidos durante deploy:**
- ✅ Next.js 16 async params issue em `sample/route.ts`
- ✅ Admin redirect loop (logout → login)
- ✅ Dispatch tab visibility (sidebar)

---

### Fase 8 — Cron Supabase + Audit Logs + Sample Scope ✅ (commits e18106b..2d3e3b0)

**PR #8:** https://github.com/projetos-hub/pesquisa/pull/8  
**Branch:** `feat/phase-8-cron-audit-sample`

**Implementado:**
- ✅ Migration 011 — pg_cron `*/5 * * * *` via `trigger_dispatch_processor` + pg_net
- ✅ `notification_audit_logs` — rastreia sent/failed por email
- ✅ `target_scope = 'sample'` — constraint estendido, valida personalized=true
- ✅ `executePersonalizedJobSample()` — audit log + fix offset (não loopa em falhas)
- ✅ DispatchForm — radio "📊 Amostra" + info box
- ✅ GET /dispatch-audit — endpoint de audit logs
- ✅ ManualDispatch — disparo rápido por email (max 50)
- ✅ **Fix segurança**: POST /submit agora re-valida amostra (bypasse bloqueado)

**Bateria de testes (Sprint 8 + 9):**
- Unit: `submit-sample-gate.test.ts` (5), `audit-log.test.ts` (5), `sample-dispatch.test.ts` (7)
- E2E: `sample-gate.spec.ts` (7), `admin-sample.spec.ts` (7), `dispatch-execution.spec.ts` (6)

**🔴 BLOQUEADOR — fazer ANTES de mergear o PR:**

1. Abrir [Supabase SQL Editor](https://supabase.com/dashboard/project/qnpvlhfjknnvfiyxrhhl/sql/new)
2. Rodar primeiro (valor do CRON_SECRET está em `.env.local`):
   ```sql
   ALTER DATABASE postgres SET "app.cron_secret" = '<valor de CRON_SECRET do .env.local>';
   SELECT pg_reload_conf();
   ```
3. Depois rodar o restante de `supabase/migrations/011_phase8_dispatch_audit.sql`
4. Verificar: `SELECT * FROM cron.job WHERE jobname = 'dispatch-processor';`
5. Mergear PR #8 → deploy automático

**Após merge:**
- Verificar [Vercel dashboard](https://vercel.com) que deploy passou
- Testar: acessar survey com email fora da amostra → deve bloquear (403)
- Testar: criar dispatch scope=sample → audit logs em /dispatch-audit

---

### Ajustes visuais e dados — 2026-05-04 (commits 2edd60f, 1ff5045)

**Código — `survey-platform/`:**
- `StepNPS.tsx` — `titulo` exibido como pergunta principal (`step-title`), `desc` como subtítulo
- `StepNPS.tsx` — labels "Nada provável" (ao lado do 0) e "Extremamente provável" (ao lado do 10) embutidos na linha dos botões; removido `nps-hint` separado
- `ScaleRow.tsx` — labels "1 - Muito Insatisfeito" e "6 - Muito Satisfeito" ao lado dos botões 1 e 6
- `survey.css` — `.scale-btns` com `flex-wrap: nowrap` e `.scale-btn` com `flex: 1` para 6 botões caberem em uma linha
- `StepEscala.tsx` — texto fallback atualizado de "1 a 5" para "1 a 6"
- `SurveyEditForm.tsx` — campos de data voltaram para `type="date"` (sem horário), labels atualizados

**Banco de dados (Supabase — pesquisa CSAT):**
- `surveys.open_date` → `2026-05-04`
- `surveys.close_date` → `2026-05-17`
- `questions.description` das 3 escalas (pedagógico, administrativo, infraestrutura) → "Avalie de 1 a 6 os seguintes aspectos:"
