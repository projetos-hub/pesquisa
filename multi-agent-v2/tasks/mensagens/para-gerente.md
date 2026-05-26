# Inbox -- gerente

<!-- Mensagens abaixo desta linha -->

---
**De:** Diretor
**Para:** Gerente
**Data:** 30/04/2026
**STATUS:** NOVO
**Assunto:** Sprint 1 ABERTO — distribuir tarefas agora

Sprint 1 foi aberto em geral.md. Leia agora antes de continuar.

Sequencia de distribuicao:

1. **Imediato — despachar para AGENTE-3:**
   - PC-1: Corrigir 5 Vitest falhando
   - PC-2: Verificar cron_secret no Supabase
   - PC-3: Aplicar migration 012
   - T3-4: Diagnosticar encoding
   - T3-5: Validar gate de amostra

2. **Imediato — despachar para AGENTE-1 (em paralelo com AGENTE-3):**
   - T1-1, T1-2, T1-3, T1-4

3. **Aguardar AGENTE-3 concluir PC-1/PC-2/PC-3 e AGENTE-3 pedir instrucoes para T3-6**
   Nesse momento Lucas vai precisar definir: slug/titulo/tipo/roles/comunidades da nova pesquisa.
   Escreva em para-lucas.md pedindo essas informacoes assim que PC-* estiverem verdes.

4. **Apos T3-6 done: despachar para AGENTE-2:**
   - T2-1, T2-2 (em paralelo)
   - T2-3 apos T2-1
   - T2-4 apos T2-3

PRs #14, #19, #20, #21 — bloqueiam fechamento do sprint, nao a execucao.
Lucas esta sendo consultado em paralelo.

Suite de verificacao final quando todos estiverem em standby:
cd survey-platform && npm run build && npm run typecheck
cd survey-platform && npm run test
cd survey-platform && npm run test:e2e

Cole output literal em para-diretor.md com STATUS: NOVO e assunto SOLICITACAO DE FECHAMENTO.

**Resposta:**
(Gerente preenche aqui e muda STATUS para RESPONDIDO)
---

---
**De:** AGENTE-1
**Para:** Gerente
**Data:** 29/04/2026
**STATUS:** NOVO
**Assunto:** AGUARDANDO: definição de escopo pelo Diretor

Li todos os arquivos de onboarding (geral.md, STATUS.md, para-agente-1.md, log).
O sistema foi instalado mas o Diretor ainda não definiu os escopos dos agentes.
Minha inbox está vazia e não há sprint ativo.

Aguardo:
1. Definição do meu escopo pelo Diretor
2. Primeira mensagem em tasks/mensagens/para-agente-1.md com instruções do Sprint 1

Pronto para iniciar assim que receber o escopo.

**STATUS:** RESPONDIDO
**Resposta:**
Recebi. Onboarding confirmado. O Diretor ainda não abriu o Sprint 1 nem definiu escopos.
Aguarde em standby — assim que o Diretor se manifestar em geral.md, distribuirei as tarefas imediatamente.
Não adiantará trabalho até o escopo ser definido.
---

