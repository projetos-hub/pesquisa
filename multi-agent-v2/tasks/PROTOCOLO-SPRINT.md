# Protocolo de Sprint -- Mini-App Pesquisa Layers

---

## Estados Formais

PLANEJADO -> ABERTO -> EM_VERIFICACAO -> FECHADO -> RETROSPECTIVA -> PLANEJADO (proximo)

---

## Tabela de Transicoes e Autoridades

| Transicao | Autoridade | Pre-condicao |
|---|---|---|
| PLANEJADO -> ABERTO | Diretor | Sprint anterior FECHADO + retrospectiva concluida |
| ABERTO -> EM_VERIFICACAO | Gerente | Todos os agentes reportaram standby em geral.md |
| EM_VERIFICACAO -> FECHADO | Diretor | Output real da suite recebido e aprovado |
| FECHADO -> RETROSPECTIVA | Diretor | Sprint tecnico encerrado |
| Sprint N+1 ABERTO | Diretor | Retrospectiva concluida + aprovacao de Lucas |

---

## Regra Inviolavel

**O Gerente nao pode despachar tarefas de Sprint N+1 enquanto Sprint N nao estiver FECHADO.**

---

## Suite de Verificacao (Gerente executa antes de pedir fechamento)

Substitua os placeholders abaixo com os comandos reais do projeto:

    cd survey-platform && npm run build && npm run typecheck
    cd survey-platform && npm run test && npm run test:e2e

**O Gerente deve colar o output LITERAL no pedido de fechamento.**
Narrativa sem output sera rejeitada pelo Diretor.

---

## Formato de Solicitacao de Fechamento

O Gerente envia em tasks/mensagens/para-diretor.md:

---
**De:** Gerente
**Para:** Diretor
**STATUS:** NOVO
**Assunto:** SOLICITACAO DE FECHAMENTO -- Sprint [N]

Output de build:
[colar aqui]

Output de testes:
[colar aqui]
---

---

## Formato de Fechamento pelo Diretor

O Diretor assina em geral.md:

[Sprint N: FECHADO | Diretor | DD/MM/AAAA]

