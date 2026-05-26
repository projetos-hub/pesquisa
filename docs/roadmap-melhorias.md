# Roadmap de Melhorias Estruturais

> Criado em 2026-05-05 após lançamento da pesquisa Amostral 1.
> Baseado em problemas reais encontrados em produção. Prioridades P0→P3.

---

## P0 — Crítico (já mitigado, mas frágil)

### 1. Dispatch cron via pg_cron — autenticação frágil
**Problema:** O cron de processar disparos usa a string `pesquisa-cron-2026` hardcoded no SQL do pg_cron. Funciona mas é difícil de rotacionar e não usa o Supabase Vault corretamente.  
**Fix ideal:** Armazenar o CRON_SECRET no Vault com parâmetros corretos (`vault.create_secret(valor, nome)` — valor primeiro) e referenciar via `vault.decrypted_secrets`.  
**Workaround atual:** String hardcoded no cron job.

### 2. Dispatches presos em 'sending' bloqueiam a fila
**Problema:** O cron processa os 5 primeiros dispatches com `status='sending'`. Se existirem disparos de teste incompletos antes do real na fila, o real nunca é processado.  
**Fix ideal:** Botão "Cancelar disparo" no admin que seta `status='failed'`. Ou limpeza automática de dispatches com mais de 24h sem progresso.  
**Workaround atual:** UPDATE manual no banco.

---

## P1 — Alta prioridade

### 3. Vercel Hobby plan — limitações estruturais
**Problema:** Hobby não suporta crons sub-diários nem timeouts >10s. O processamento de notificações (~5s por batch de 30) está no limite.  
**Fix ideal:** Upgrade para Vercel Pro ($20/mês) — libera crons nativos a cada minuto, timeout 60s, e elimina a dependência do pg_cron para isso.  
**Alternativa:** Mover processamento de notificações para Supabase Edge Function (Deno, sem timeout restrito).

### 4. Formato inconsistente de armazenamento de escala
**Problema:** Respostas antigas usam label como chave (`{"A infraestrutura.": 4}`), respostas novas usam índice (`{"0": 4}`). O export tem fallback para os dois, mas é frágil.  
**Fix ideal:** Criar migration para normalizar dados históricos para índice. Depois remover o fallback por label do export.  
**Estado atual:** Export tem duplo lookup (índice → label).

### 5. Dados históricos de NPS perdidos
**Situação:** 4 sessões de teste perderam o valor de NPS porque o SurveyRunner usava chave `'nps'` hardcoded mas a pergunta no banco tinha key `qual_e_a_probabilidade_de_voce_recomenda`. Sessões de respondentes reais (após fix) estão corretas.  
**Ação:** Documentar que as 4 sessões de 2026-05-05 não têm dados de NPS. Não é possível recuperar.

---

## P2 — Melhorias importantes

### 6. UX de resposta duplicada
**Problema:** Quando um usuário tenta responder uma segunda vez, o sistema silenciosamente retorna `{ duplicate: true }` e redireciona para ThankYou. O usuário não sabe o que aconteceu.  
**Fix ideal:** Mostrar mensagem amigável "Você já respondeu esta pesquisa" no ThankYou screen quando receber duplicate:true.

### 7. Dashboard de saúde do dispatch
**Problema:** Não há visibilidade em tempo real do progresso dos disparos sem ir ao banco. A UI mostra "Enviando..." mas não atualiza automaticamente.  
**Fix ideal:** Polling a cada 30s na tela de histórico de disparos. Ou WebSocket. Ou botão "Atualizar".

### 8. Botão "Cancelar disparo" no admin
**Problema:** Dispatches que falham ficam presos em 'sending' para sempre. Não há forma de cancelá-los pelo admin.  
**Fix ideal:** Botão de cancelar na tela de histórico que seta `status='failed'` para o dispatch e seus jobs.

### 9. Separação visual pesquisa/disparo mais clara
**Contexto:** O usuário hoje entende que pesquisa e disparo são coisas separadas, mas o fluxo de upload de amostra ainda confunde (fazer upload muda `access_control`?). Ver plano de separação amostra/pesquisa (já parcialmente planejado mas não implementado).

---

## P3 — Refatorações estruturais

### 10. Migrar communities para fonte única de verdade (✅ feito)
**Status:** Migration 014 aplicada. Tabela `communities` é a fonte de verdade para logo, cores, nome. `survey_communities.theme` é apenas override per-survey.

### 11. question_options backfill (✅ feito)  
**Status:** Migration 018 aplicada. Todas as perguntas scale/radio/checkbox agora têm linhas em `question_options` derivadas de `settings.accept`.

### 12. Monitoramento de cron jobs
**Problema:** O pg_cron roda silenciosamente. Se o endpoint Vercel retornar erro, o dispatch fica travado indefinidamente sem ninguém saber.  
**Fix ideal:** Alert quando `cron.job_run_details` mostrar erros consecutivos. Ou expor `/admin/dispatch/health` que checa o estado dos jobs.

### 13. Timeout do pg_net  
**Situação atual:** pg_net configurado com `timeout_milliseconds := 30000`. Se o Vercel demorar >30s (batch muito grande, cold start), o pg_net falha silenciosamente mas o Vercel continua processando. Pode causar double-processing.  
**Fix ideal:** Reduzir PERSONALIZED_BATCH_SIZE de 30 para 20 (garante <5s mesmo com cold start) e usar timeout de 15s.

---

## Dívida técnica acumulada

| Item | Impacto | Complexidade |
|------|---------|--------------|
| Sheets integration ainda ativa como fallback | Baixo | Baixo — remover |
| `CRON_SECRET = pesquisa-cron-2026` hardcoded no pg_cron | Médio | Baixo — usar Vault |
| Export com duplo lookup (índice + label) | Baixo | Médio — normalizar DB |
| Dispatches de teste presos no banco | Alto | Baixo — botão cancelar |
| Vercel Hobby plan timeout 10s | Alto | Alto — Pro ou Edge Function |
| NPS histórico perdido (4 sessões) | Baixo | Nulo — irrecuperável |

---

## Stack atual de produção

| Componente | Tecnologia | Observação |
|-----------|-----------|-----------|
| Frontend | Next.js 16 + React 19 | App Router, Turbopack |
| Banco | Supabase PostgreSQL | Projeto qnpvlhfjknnvfiyxrhhl |
| Auth | Supabase Auth (magic link) | |
| Notificações | Layers API `/v2/notification/send` | push + email |
| Cron disparo | pg_cron + pg_net → Vercel | workaround Hobby plan |
| Cron sheets | Vercel Cron `0 11 * * *` | 1x/dia |
| Deploy | Vercel Hobby | Limitações de cron e timeout |
| Storage | Supabase Storage (`school-assets`) | logos SVG/PNG |
