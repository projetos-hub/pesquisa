# Progresso — Plataforma de Pesquisas Layers Education

## Como retomar com o assistente

> "Estou desenvolvendo uma plataforma de pesquisas de satisfação para a Layers Education.
> O projeto fica em C:\Users\luisa.lopes\Desktop\EXP IA\survey-layers-app
> Repositório GitHub: https://github.com/projetos-hub/pesquisa.git
> Leia o arquivo PROGRESSO.md para entender onde paramos."

---

## Estado atual: PRs #1–#74 mergeados em main → ⚠️ PARADO: aplicar migration `028_audit_broadcasts.sql` via MCP Supabase

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
| 6 | Segmentação amostral por escola | ✅ Concluída (commit 20a08a8) |
| 7 | Deploy Vercel | ✅ Concluída |
| 8 | Cron Supabase + Audit Logs + Sample Scope | ✅ Concluída |
| PRs #9–#73 | Features e fixes incrementais (disparos, analytics, relatórios, home admin, auditoria…) | ✅ Todos mergeados em main |
| PR #74 | Thank-you editável + Code Review (QA) | ✅ Mergeado em main |

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

---

### Sessão 2026-05-22 — Pesquisas Global Tree + SAP, fixes admin e mapeamento

#### Novas pesquisas criadas (seeds)

| Migration | Survey | Comunidades |
|-----------|--------|-------------|
| `020_seed_exposicao_arte_total.sql` | Exposição Cultural "Arte Total" — Global Tree | 7 unidades Global Tree |
| `021_seed_mostra_sap_infantil_fund1.sql` | Mostra da Educação Infantil e Fund I — SAP | `sap` |

**Atenção:** Seeds aplicadas via SQL Editor do Supabase (não via CLI). Encoding estava corrompido (UTF-8 lido como Latin-1 ao copiar do terminal Windows CP1252).

**Arquivos de fix de encoding no Desktop:**
- `fix_encoding_arte_total.txt` — corrige surveys + questions + options + move pergunta para title
- `fix_encoding_mostra_sap.txt` — idem para a SAP

Rodar no Supabase SQL Editor antes de usar as pesquisas.

#### PRs mergeados (todos squash em main)

| PR | O que faz |
|----|-----------|
| #40 | **Fix UUID**: `toggleWelcomeStep`/`toggleThankYouStep` retornam `id` real do banco; `QuestionEditor` parou de usar `Math.random()` como ID (causava `invalid input syntax for type uuid` ao editar título) |
| #41 | **Cache**: TTL survey config reduzido 300s → 60s; novo endpoint `POST /api/revalidate-surveys` para bust imediato |
| #42 | **Dispatch**: INSERT condiciona `sequence_steps` (evita erro se migration 017 não aplicada); erros do Supabase agora expostos em `detail` na resposta 500 |
| #43 | **Mapping**: aliases `CRECHE ESCOLA GLOBAL TREE - ABM/PENINSULA/RECREIO` adicionados em `lib/community-mapping.ts` |
| #44 | **Mapping**: `CRECHE ESCOLA GLOBAL TREE - RECREIO` → `w9593n19` (Barra Golf) corrigido |
| #45 | **Mapping**: `GLOBAL TREE RIO 2` → `w95k0s77` corrigido |
| #46 | **Build fix**: `revalidateTag('survey-config', 'default')` — Next.js 16 exige 2 args |

#### Mapeamento Global Tree atualizado (lib/community-mapping.ts)

| Nome no TOTVS/import | community_id |
|---------------------|--------------|
| GLOBAL TREE BOSQUE MARAPENDI | `globaltree-abm` |
| GLOBAL TREE BOTAFOGO | `n6k47n81` |
| GLOBAL TREE PENÍNSULA / PENINSULA | `rf3zk695` |
| GLOBAL TREE BARRA GOLF / RECREIO | `w9593n19` |
| GLOBAL TREE RIO 2 | `w95k0s77` |
| CRECHE ESCOLA GLOBAL TREE - RIO 2 | `creche-globaltree` |
| CRECHE ESCOLA GLOBAL TREE - ABM | `globaltree-abm` |
| CRECHE ESCOLA GLOBAL TREE - PENINSULA | `rf3zk695` |
| CRECHE ESCOLA GLOBAL TREE - RECREIO | `w9593n19` |

#### Padrão de layout de perguntas (qualitativa)

O campo `title` da question é o texto exibido em bold (pergunta principal). O `settings.pergunta` era usado como subtítulo — agora está vazio (`{}`) e o texto da pergunta vai diretamente no `title`. Fix aplicado via SQL (fix_encoding_*.txt).

---

### Sessão 2026-05-07 — Bug fix: cron dispatch amostra

#### Bug encontrado e corrigido (PR #35)

**Root cause:** `process-dispatches/route.ts` sempre chamava `executePersonalizedJob` (Layers Hub) ao retomar jobs em andamento, mesmo para dispatches `target_scope='sample'` que deveriam usar `executePersonalizedJobSample` (survey_sample_lists).

**Efeito:** disparo Amostral 1 parava em ~90 usuários (total do Layers Hub para `uniao`). Usuários da amostra nos slots 31–90 não foram notificados. Usuários do Layers Hub (fora da amostra) receberam a notificação nos batches 2 e 3.

**Fix:** adicionada verificação `target_scope === 'sample'` no cron handler para chamar a função correta.

| Batch | Função usada antes do fix | Função após o fix |
|-------|--------------------------|-------------------|
| 1 (0→30, criação) | `executePersonalizedJobSample` ✅ | inalterado |
| 2+ (cron retoma) | `executePersonalizedJob` ❌ | `executePersonalizedJobSample` ✅ |

**PR:** https://github.com/projetos-hub/pesquisa/pull/35  
**Branch:** `fix/cron-sample-dispatch`  
**Arquivo:** `survey-platform/app/api/cron/process-dispatches/route.ts`

#### Após merge do PR #35 — rodar no Supabase SQL Editor

```sql
-- Resetar dispatches Amostral 1 para continuar do offset correto (60)
UPDATE survey_dispatch_jobs
SET status = 'sending', processed_users = 60
WHERE status IN ('sent', 'sending')
  AND dispatch_id IN (SELECT id FROM survey_dispatches WHERE status = 'sending');

UPDATE survey_dispatches SET completed_jobs = 0 WHERE status = 'sending';
```

Depois aguardar 5 min — o cron retoma do offset 60 com a função correta e processa toda a amostra restante.

#### Outros achados

- Dois cron jobs duplicados ativos: `dispatch-processor` e `process-dispatches` (ambos `*/5 * * * *`) — não causa bug mas é ruído
- `completed_jobs = total_jobs` enquanto `status = 'sending'` — lógica de contagem confusa, não é bug funcional

---

### Sessão 2026-05-05 — Lançamento Amostral 1 + Fixes críticos

#### Bugs corrigidos

| Bug | Causa | Fix |
|-----|-------|-----|
| NPS zerado no export | `SurveyRunner` hardcodava `next('nps', d)` — chave errada descartada no submit | Usa `currentStep.key` + `npsKey` dinâmico para ThankYou |
| Colunas de escala em branco | `question_options` vazia para perguntas criadas antes do auto-populate | Migration 018 backfill + export com fallback label→índice |
| Build bloqueado no Vercel | `sequence_steps: unknown[]` incompatível com `SequenceStep[]`; `z.record()` sem 2 args | Cast explícito + `z.record(z.string(), z.unknown())` |
| Disparo travado em 30/303 | Cron `*/5 * * * *` não registrado no `vercel.json`; Hobby plan bloqueou depois | pg_cron + pg_net como workaround |
| Cron 401 | pg_net timeout 5s → pg_net POST (405) → vault sem rows | GET + timeout 30s + CRON_SECRET simples |
| Fila de dispatches bloqueada | 17 dispatches de teste presos em `sending` sem jobs ativos | UPDATE manual + botão cancelar (P2 roadmap) |

#### Migrations aplicadas

| Migration | O que faz |
|-----------|-----------|
| `014_communities_table.sql` | Tabela `communities` como fonte de verdade para identidade visual |
| `018_backfill_question_options.sql` | Popula `question_options` para perguntas scale sem opções |

#### Infra configurada

- pg_cron job `process-dispatches` ativo (*/5 * * * *) chamando endpoint Vercel via pg_net
- `CRON_SECRET=pesquisa-cron-2026` configurado no Vercel
- Endpoint aceita CRON_SECRET ou SUPABASE_SERVICE_ROLE_KEY

#### Estado das respostas Amostral 1

- 4 sessões de teste (30/04 a 05/05) sem NPS — bug pré-fix, irrecuperável
- A partir de 05/05 15:40: NPS salvo corretamente com key `qual_e_a_probabilidade_de_voce_recomenda`
- Escala: dados históricos por label, novos por índice — export faz fallback dos dois
- Disparo Amostral 1 em andamento: 60/303 (unificado-zonasul) e 60/149 (uniao) às 17h UTC

#### Roadmap de melhorias criado

Ver `docs/roadmap-melhorias.md` — 13 itens priorizados P0→P3.

---

## Histórico de fases completo

### Fase 7 — Deploy na Vercel ✅ (commit dab4774 - 2026-04-16)

- ✅ App ao vivo em: https://pesquisa-nu-sand.vercel.app
- ✅ Variáveis de ambiente configuradas (SUPABASE_*, LAYERS_API_TOKEN, CRON_SECRET)
- ✅ Bugs de deploy corrigidos (async params, redirect loop, dispatch tab)

---

### Fase 8 — Cron Supabase + Audit Logs + Sample Scope ✅ (PR #8)

- ✅ pg_cron `*/5 * * * *` via pg_net → endpoint `/api/cron/process-dispatches`
- ✅ `notification_audit_logs` — rastreia sent/failed por email
- ✅ `target_scope = 'sample'` — dispatch amostral seguro
- ✅ Bateria de testes unitários e E2E

---

### Sessões 2026-04 a 2026-05 — Features e fixes

| PR | O que entregou |
|----|----------------|
| #9 | Apagar pesquisa com confirmação |
| #10 | Remove `survey_type='misto'` inválido |
| #11 | `mapRole` explícito com roles reais da Layers API |
| #12 | Amostra rápida — colar emails sem Excel |
| #13 | Export XLSX no padrão Metabase |
| #14 | `allow_all_roles` — surveys abertos a qualquer role Layers |
| #15 | NPS e Welcome com textos customizáveis por survey |
| #16 | Loading personalizado por comunidade |
| #17 | Resolver todos os placeholders no disparo via amostra |
| #18 | `formatFirstName` — primeiro nome capitalizado |
| #19–#20 | Placeholders no Disparo Rápido + filtro de comunidades |
| #21 | Grupos de segmentação com curadoria manual |
| #22–#28 | Escala 1-6, indicacaoLink por comunidade, sample gate seguro, tema global |
| #29–#31 | Communities como base de tema, auto-criar question_options, scale cards |
| #32–#33 | Régua de disparos por canal + placeholders visíveis |
| #34 | Fix exportação Excel (respostas em branco) |
| #35 | **Fix crítico cron**: `executePersonalizedJobSample` para dispatches de amostra |
| #36–#39 | Pesquisa Dia da Família, welcome personalization, radio sort |
| #40 | Fix UUID em `toggleWelcomeStep`/`toggleThankYouStep` |
| #41 | Cache TTL survey 300s → 60s + endpoint revalidate |
| #42 | Expõe erro Supabase em detail + guard `sequence_steps` |
| #43–#46 | Mapeamento Global Tree (aliases, RECREIO, RIO 2) |
| #47–#48 | Fix mapping + `open_date`/`close_date` para calcular status |
| #49 | Bugs P0/P1 + dashboard auditoria + rebranding Raiz |
| #50 | Sistema de disparos com Layers API (push/email segmentado por turma) |
| #51 | Datas por comunidade + zombie dispatches resolvidos |
| #52–#56 | Admin escola: nome/community_id, datas por comunidade, layout datas |
| #57–#60 | `use client` community-name, portal filtros, 5 bugs pente-fino, invalidar cache |

---

### Sessão 2026-06-03 — Pente-fino residual + 3 features paralelas

**Contexto:** Ciclo de bug-fix batch + 3 agents em paralelo.

| PR | O que entregou |
|----|----------------|
| #61 | Fix ThankYou sobreposto + navegação corrompida (Arte Total) |
| #62 | Agendamento automático de surveys (cron) |
| #63 | Fix dispatch: CHECK constraint sample + channels + multi-role |
| #64 | Relatórios avançados com filtros e XLSX multi-aba |
| #65 | Analytics dashboard — KPIs, temporal, comunidades, perfil, funil |
| #67 | Endpoint provider comunicados `@layers:Posts:getUpdatedAfter` |
| #68 | Fixes residuais pente-fino: SurveyStatus `'aberta'`→`'ativa'`, auth check audit routes, dead code disparos |
| #69 | Home hub admin minimalista (Conceito C) — 5 cards, grid 3+2, sem queries |
| #70 | Dashboard de auditoria — correlação disparos × respostas, timeline |
| #71–#72 | Hotfix Vercel Hobby plan: remover cron `advance-survey-status` do `vercel.json` |
| #73 | Dead code cleanup — audit legado, migration conflict, nav fix |

**Migration pendente (rodar no Supabase SQL Editor):**
```sql
-- Ativa o dashboard /admin/auditoria
-- Arquivo: survey-platform/supabase/migrations/028_audit_broadcasts.sql
```

---

### Sessão 2026-06-11 — Thank-you message editável + Code Review / Agente QA

**Branch atual:** `feat/thankyou-message-editable`  
**Commits:** `24d9ce0`, `55b4473`, `1f621e0`

#### Features entregues

| PR equivalente | O que fez |
|---|---|
| `24d9ce0` | Thank-you message editável por survey e por comunidade (admin) |
| `55b4473` | Fix 3 bugs que impediam mensagem customizada de aparecer |
| `1f621e0` | Code review — 8 fixes + 4 refatorações de CC e manutenibilidade |

#### Detalhes do code review aplicado (commit `1f621e0`)

| Tipo | Arquivo | O que mudou |
|---|---|---|
| CRÍTICO | `communities/actions.ts` | READ-MERGE-WRITE no theme; `requireAuth` consistente; validação URL logo |
| CRÍTICO | `lib/survey-config.ts` | Strategy map `STEP_BUILDERS`; merge centralizado; CC 14→4 |
| MÉDIO | `actions.ts` | `deleteQuestion` + `toggleThankYouStep` invalidam cache |
| MÉDIO | `SurveyRunner.tsx` | `useMemo` para theme; `STEP_RENDERERS`; useEffect usa memo |
| MÉDIO | `ThankYou.tsx` | `\|\|` → `??` para `indicacaoLink` vazio |
| MÉDIO | `route.ts` | Sanitização de `communityId` como cache key |
| MÉDIO | `CommunitiesThemeEditor.tsx` | `toDatetimeLocal()` para datas em Brasília |
| REFACTOR | `QuestionEditor.tsx` | 14 useState → `useQuestionForm` hook; Set para lookups |
| REFACTOR | `SurveyRunner.tsx` | CC `renderCurrentStep` 11→3 via lookup table |
| REFACTOR | `survey-config.ts` | CC `rowsToConfig` 14→4 via strategy map |

**Score pós-revisão:** Qualidade 8/10 | Segurança 8/10 | Manutenibilidade 8/10

#### Agente QA criado

Arquivo: `docs/qa-action-plan.md` — plano de revisão em 4 sprints.

---

## Roadmap completo atualizado

| Fase | Descrição | Status |
|---|---|---|
| 0 | Setup Next.js + Supabase clients + schema | ✅ Concluída |
| 1 | Engine migrada (frontend respondente) | ✅ Concluída |
| 2A | Leitura de pesquisa via Supabase | ✅ Concluída |
| 2B | Submit real para Supabase | ✅ Concluída |
| 3 | Área admin | ✅ Concluída |
| 4 | Google Sheets espelho + retry + cron | ✅ Concluída |
| 5 | Polimento e remoção de hardcodes | ✅ Concluída |
| 6 | Segmentação amostral por escola | ✅ Concluída |
| 7 | Deploy Vercel | ✅ Concluída |
| 8 | Cron Supabase + Audit Logs + Sample Scope | ✅ Concluída |
| — | Features incrementais (PRs #9–#73) | ✅ Todas mergeadas em main |
| — | Thank-you editável + Code Review | ✅ Concluída (PR #74) |
| — | Duplicar template de pesquisa | ⏳ Draft PR #75 — merge pendente |

---

## Próximos passos

### ⚠️ PARADO AQUI — retomar neste ponto ao reabrir

**Tarefa:** Aplicar `028_audit_broadcasts.sql` no banco de produção.

**Contexto:** A migration cria a tabela `audit_broadcasts` e a coluna `expected_responses` em `survey_communities`. O dashboard `/admin/auditoria` (PR #70) já está no ar mas depende dessas estruturas para funcionar.

**Verificação feita:** A tabela `audit_broadcasts` **NÃO existe** no banco — REST API retornou 404 ao tentar acessá-la.

**Como aplicar (MCP Supabase):**
1. Ao reabrir, o MCP do Supabase estará disponível
2. Usar `supabase__execute_sql` com `project_id="qnpvlhfjknnvfiyxrhhl"`
3. Rodar o conteúdo de `survey-platform/supabase/migrations/028_audit_broadcasts.sql`
4. Verificar: `SELECT table_name FROM information_schema.tables WHERE table_name = 'audit_broadcasts'`
5. Verificar: `SELECT column_name FROM information_schema.columns WHERE table_name = 'survey_communities' AND column_name = 'expected_responses'`

**Arquivo da migration:** `survey-platform/supabase/migrations/028_audit_broadcasts.sql`

### 🔄 PR #75 — Duplicar template de pesquisa

**Branch:** `feat/duplicate-survey-template`  
**Status:** Draft — merge + testar em produção pendente

**O que faz:** Botão "Duplicar" na listagem e no detail da pesquisa. Cria cópia exata com:
- Slug único (`slug-copia`, `slug-copia-1`, etc.)
- Status `rascunho`, datas limpas
- Todas as perguntas + opções copiadas
- Community installations **não** copiadas (admin reinstala manualmente)

**Arquivos:** `actions.ts` (+duplicateSurvey), `DuplicateSurveyButton.tsx` (novo), `page.tsx`, `[id]/page.tsx`

### QA Action Plan — sprints pendentes (`docs/qa-action-plan.md`)

| Sprint | Prioridade | O que revisar |
|---|---|---|
| S0-1 | BLOQUEANTE | `communities/actions.ts` — `saveCommunityTheme` UPDATE silencioso se row não existe |
| S1 | P0 CRÍTICO | Submit endpoint (`submit/route.ts`), `applyConditionals`, `buildActiveSteps` |
| S2 | P0 CRÍTICO | Cron/dispatch (`process-dispatches/route.ts`, `DispatchForm.tsx` 46KB) |
| S3 | P1 ALTA | Testes unitários: `rowsToConfig`, `useQuestionForm`, `ThankYou` fallback |
| S4 | P2 MÉDIA | Sample upload, analytics queries, `ReportsClient.tsx` |
