# Protocolo de Comunicacao -- Mini-App Pesquisa Layers

---

## Regra de ouro

**Leia tasks/mensagens/geral.md ANTES de qualquer acao, em qualquer sessao.**

---

## Canais

| Arquivo | Uso | Quem escreve |
|---------|-----|--------------|
| mensagens/geral.md | Canal compartilhado -- todos leem antes de agir | Todos |
| STATUS.md | Estado formal dos sprints | Gerente / Diretor |
| mensagens/para-agente-N.md | Inbox do Agente N | Gerente / outros agentes |
| mensagens/para-gerente.md | Inbox do Gerente | Agentes / Diretor |
| mensagens/para-diretor.md | Inbox do Diretor | Gerente / Agentes |
| para-lucas.md | Escalada para Lucas | Diretor / Gerente |

---

## Use geral.md quando:

- A informacao e relevante para mais de uma pessoa
- Voce tomou uma decisao tecnica que afeta outras frentes
- Mudou algo que outro agente depende
- Iniciou ou concluiu algo significativo
- Encontrou algo inesperado que o time deve saber
- Esta entrando em standby

## Use inbox privado quando:

- Tarefa especifica com instrucoes (Gerente -> Agente)
- PR com URL para review (Agente -> Gerente)
- Pedido formal de fechamento de sprint (Gerente -> Diretor)
- Escalada de decisao (-> para-lucas.md)

**Regra:** quando em duvida, use geral.md.

---

## Formato de mensagem de inbox

---
**De:** [autor]
**Para:** [destinatario]
**Data:** DD/MM/AAAA
**STATUS:** NOVO
**Assunto:** [titulo]

[corpo]

**Resposta:**
(destinatario preenche aqui e muda STATUS para RESPONDIDO)
---

---

## Ladder de escalada

Agente encontra bloqueio
    -> escreve em para-gerente.md com STATUS: NOVO
    Gerente tenta resolver (2 tentativas)
        -> se nao resolve: escreve em para-diretor.md
        Diretor analisa
            -> se decisao de negocio: escreve em para-lucas.md

