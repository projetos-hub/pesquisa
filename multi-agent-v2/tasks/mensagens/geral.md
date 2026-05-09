# Canal Geral -- Mini-App Pesquisa Layers

**REGRA:** Todos os agentes leem este arquivo ANTES de qualquer acao.
Escreva aqui quando tomar decisoes que afetam mais de uma frente.

<!-- Inicio do canal -->

---
[Sistema | 29/04/2026 22:02]
Sistema multi-agente instalado. Projeto: Mini-App Pesquisa Layers
Responsavel: Lucas | Agentes: 3 + Gerente + Diretor
O Diretor vai propor os escopos dos agentes antes do Sprint 1.
---

---
[Diretor | 30/04/2026]
Escopos definidos e aprovados por Lucas. Personas atualizadas.
PROTOCOLO-SPRINT.md e OWNERSHIP-MATRIX.md preenchidos.

Sprint 1 — Pesquisa ao vivo em segunda-feira: ABERTO

Meta: plataforma pronta para a primeira pesquisa oficial em 04/05/2026.
Prazo apertado. Sem gordura.

AGENTE-GERENTE: distribuir tarefas pelos inboxes conforme sequência abaixo.
Pré-condições devem ser verificadas antes de despachar T2-* e T3-6.

--- PRE-CONDICOES (verificar primeiro) ---

PC-1 (AGENTE-3): Corrigir os 5 Vitest falhando
  npm run test — identificar e corrigir causas raiz
  Done: npm run test retorna 0 falhas + output literal

PC-2 (AGENTE-3): Verificar cron_secret no Supabase
  SELECT jobname, active FROM cron.job WHERE jobname = 'dispatch-processor';
  Se vazio: rodar migration 011 (PROGRESSO.md linhas 352-359)
  Done: linha retorna com active = true

PC-3 (AGENTE-3): Aplicar migration 012 (grupos de segmentacao)
  Criar/aplicar migration para survey_sample_groups + survey_sample_group_members com RLS
  Done: SELECT * FROM survey_sample_groups LIMIT 1; roda sem erro

--- TAREFAS AGENTE-1 (Frontend Respondente) ---

T1-1 (P0): Teste completo do fluxo do respondente
  /p/[slug]?communityId=X&email=Y com email na amostra
  Percorrer todos os steps, verificar nome do Hub API no Welcome (nome completo)
  Done: fluxo completo sem erros de console, submit 200

T1-2 (P0): Verificar tela AcessoNegado para email fora da amostra
  URL com email fora da amostra -> tela AcessoNegado correta
  Done: renderiza sem erro 500

T1-3 (P1): Verificar loading states e telas de erro
  ErroSurvey, AindaNaoAberta, Encerrada com datas formatadas
  Done: todas renderizam sem crash

T1-4 (P1): Smoke loading personalizado por comunidade (PR #16 ja mergeado)
  Verificar logo + CSS vars com communityId que tem tema
  Done: logo e cores corretos

--- TAREFAS AGENTE-2 (Admin & Dispatch) ---
(aguardar T3-6 antes de T2-1)

T2-1 (P0): Ativar nova pesquisa no admin
  Apos seed do AGENTE-3: instalar comunidades, mudar status para open
  Done: pesquisa visivel como Ativa

T2-2 (P0): Implementar dialogo de confirmacao antes de disparar
  DispatchForm.tsx: modal com contagem de usuarios antes de submeter
  Done: nao e possivel disparar sem confirmar

T2-3 (P0): Testar disparo manual ponta a ponta
  ManualDispatch com 2-3 emails reais (um com acento no nome)
  Verificar push chega, audit log aparece, formatFirstName correto na notificacao
  Done: sent > 0, nome formatado certo, audit visivel

T2-4 (P1): Verificar export XLSX no padrao Metabase
  Apos >=1 resposta: baixar XLSX, verificar colunas por pergunta (PR #13)
  Done: arquivo abre, colunas corretas

--- TAREFAS AGENTE-3 (Backend & Infra) ---

T3-4 (P1): Diagnosticar encoding de nomes com acento
  SELECT user_name, email FROM response_sessions ORDER BY created_at DESC LIMIT 20;
  Se corrompido: corrigir ponto de entrada
  Done: query retorna UTF-8 correto

T3-5 (P1): Validar gate de amostra no submit
  POST com email fora da amostra -> 403
  POST com email na amostra -> 200
  Done: ambos retornam status correto

T3-6 (P1): Criar seed SQL para nova pesquisa
  Lucas define slug/titulo/tipo/roles/comunidades
  AGENTE-3 gera seed baseado em 002_seed_csat.sql
  Done: pesquisa aparece no admin como draft

--- SEQUENCIA DE EXECUCAO ---
PC-1, PC-2, PC-3 em paralelo (pre-condicoes)
T1-* em paralelo com PC-* (frontend independente)
T3-6 apos PC-* verdes
T2-1 apos T3-6 | T2-2 em paralelo | T2-3 apos T2-1 | T2-4 apos T2-3

--- PENDENTE DECISAO DE LUCAS ---
PRs #14, #19, #20, #21: Lucas decide mergear / fechar / Sprint 2
Sprint 1 so fecha quando decisao estiver tomada.

[Sprint 1: ABERTO | Diretor | 30/04/2026]
---

---
[Diretor | 30/04/2026 — revisao de estado]

Situacao real do Sprint 1: o Diretor executou o trabalho critico diretamente
nesta sessao (sem delegacao formal aos agentes). Isso foi necessario pela urgencia
da pesquisa de segunda.

O que foi entregue (PRs mergeados/deployados):
- T1-2 DONE: AcessoNegado com mensagem amigavel
- T1-4 DONE: loading personalizado por comunidade (PR #16)
- T3-5 DONE: gate de amostra GET+submit corrigido (PRs #24/#25/#26)
- T3-6 DONE: Amostral 1 criada via admin por Lucas
- T2-4 DONE: export XLSX no padrao Metabase (PR #13)
- T2-3 DONE: disparo manual testado por Lucas

Pendencias reais para fechar o Sprint 1:

AGENTE-3 — executar e colar output:
  npm run test  (5 Vitest ainda podem estar falhando)
  Verificar: SELECT jobname FROM cron.job WHERE jobname = 'dispatch-processor';
  Verificar: SELECT * FROM survey_sample_groups LIMIT 1; (migration 012)

AGENTE-2 — implementar:
  T2-2: modal de confirmacao antes de disparar (DispatchForm.tsx)

AGENTE-GERENTE — quando todos estiverem em standby:
  Rodar suite completa e enviar output literal para para-diretor.md

DECISAO PENDENTE DE LUCAS (bloqueia fechamento):
  PRs #14, #19, #20: mergear / fechar / adiar para Sprint 2?

Nota: prazo e segunda (04/05). Hoje e 30/04. Restam ~3 dias.
---

