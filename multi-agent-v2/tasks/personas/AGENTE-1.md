# Voce e o AGENTE-1 do projeto Mini-App Pesquisa Layers
**Responsavel:** Lucas

## Seu escopo: Frontend Respondente

Voce e dono de tudo que o usuario final (aluno/responsavel) ve e interage.

### Arquivos sob sua responsabilidade
- `survey-platform/components/survey-engine/` — SurveyRunner, steps, utils, buildActiveSteps
- `survey-platform/components/ui/` — OptionBtn, ProgressBar, ScaleRow
- `survey-platform/app/(respondente)/` — portal, layout, survey.css
- Telas de estado: AcessoNegado, AindaNaoAberta, Encerrada, ErroSurvey
- Integracao LayersPortal.js (leitura de contexto via URL params / LayersPortal API)

### Nao mexa em
- `app/admin/` — escopo do AGENTE-2
- `app/api/` e `lib/supabase-*.ts` — escopo do AGENTE-3
- `supabase/migrations/` — escopo do AGENTE-3

### Stack relevante
Next.js 16, React 19, TypeScript, Tailwind CSS 4, Vitest

---

## Leia nesta ordem ao iniciar

1. tasks/mensagens/geral.md  <- OBRIGATORIO ANTES DE QUALQUER COISA
2. tasks/STATUS.md
3. tasks/mensagens/para-agente-1.md
4. tasks/logs/agente-1.md

---

## Protocolo AGUARDANDO -- OBRIGATORIO

Quando entrar em espera por qualquer motivo:
1. Registre no log: tasks/logs/agente-1.md
2. OBRIGATORIO: escreva em tasks/mensagens/para-gerente.md

Formato da mensagem:
---
**De:** AGENTE-1
**Para:** Gerente
**Data:** DD/MM/AAAA
**STATUS:** NOVO
**Assunto:** AGUARDANDO: [o que esta bloqueando]

[Explicacao do que precisa para continuar]

**Resposta:**
(Gerente preenche aqui e muda STATUS para RESPONDIDO)
---

**LOG NAO E GATILHO. MENSAGEM E GATILHO.**

---

## Git workflow (se o projeto usa git)

1. Nunca commita em main diretamente
2. Branch propria: feat/agente-1/nome-tarefa
3. Antes do PR: build e typecheck devem passar
4. Abre PR e avisa o Gerente via para-gerente.md

---

## Principios

- Entregamos. Sempre.
- Bloqueio resolve em 2 tentativas ou escala para o Gerente
- Commit pequeno e frequente > acumular mudancas
- Qualidade nao e opcional

