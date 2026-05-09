# Sistema Multi-Agente v2.0 — Template Portátil

Sistema de agentes de IA paralelos com comunicação via arquivos markdown, automação via PowerShell + Win32, e supervisão autônoma com Diretor + Gerente.

**Versão 2.0** — redesenhado pós-auditoria 24/04/2026 com lifecycle formal de sprints, canal geral compartilhado, mentalidade de auditor no Diretor, e wizard interativo.

---

## O que está aqui

```
multi-agent-v2/
├── instalar.ps1          ← WIZARD (ponto de entrada — rode este)
├── scripts/
│   ├── iniciar-agente.ps1
│   ├── watch-mensagens.ps1
│   ├── chat-view.ps1
│   └── diagnostico-janelas.ps1
└── README.md
```

---

## Como usar

### 1. Copie a pasta para qualquer projeto

```powershell
# Copie multi-agent-v2/ para dentro (ou ao lado) do seu projeto
# Depois execute o wizard:
.\instalar.ps1
```

O wizard faz apenas 7 perguntas simples — não precisa ser desenvolvedor para responder.

### 2. O wizard pergunta

1. Nome do projeto
2. Seu nome (responsável)
3. Descrição em 1-2 frases do que estão construindo
4. Quantos agentes técnicos (padrão: 3)
5. Para cada agente: qual função você imagina? (opcional — hints para o Diretor)
6. Motor de IA: Claude Code ou Gemini CLI
7. Pasta onde instalar

### 3. O que é criado

```
[seu-projeto]/
├── tasks/
│   ├── mensagens/
│   │   ├── geral.md           ← canal compartilhado (todos leem primeiro)
│   │   ├── para-diretor.md
│   │   ├── para-gerente.md
│   │   ├── para-agente-1.md ... N
│   │   └── para-[voce].md
│   ├── personas/
│   │   ├── AGENTE-1.md ... N  ← templates (Diretor preenche os escopos reais)
│   │   ├── AGENTE-GERENTE.md
│   │   └── AGENTE-DIRETOR.md
│   ├── logs/
│   ├── .pids/config.json     ← configuração do projeto (lida por todos os scripts)
│   ├── STATUS.md
│   ├── ROADMAP.md
│   ├── PROTOCOLO-SPRINT.md
│   ├── PROTOCOLO-COMUNICACAO.md
│   └── OWNERSHIP-MATRIX.md
└── scripts-agentes/          ← scripts copiados automaticamente
    ├── iniciar-agente.ps1
    ├── watch-mensagens.ps1
    ├── chat-view.ps1
    └── diagnostico-janelas.ps1
```

### 4. Primeiro uso

```powershell
# Abre todos os agentes + watcher + chat:
.\scripts-agentes\iniciar-agente.ps1 -Todos -IniciarWatcher -IniciarChat

# Na janela do AGENTE-DIRETOR, o script já envia o prompt automaticamente.
# O Diretor vai:
# 1. Explorar o projeto
# 2. Propor escopos reais para cada agente
# 3. Pedir sua aprovação antes de começar
```

---

## Como funciona

### Hierarquia

```
Você (dono do produto)
    └── Diretor (autoridade delegada, supervisão, fecha sprints)
            └── Gerente (coordenação operacional, despacha tarefas)
                    └── Agente 1, 2, 3... (implementação)
```

### Comunicação assíncrona via arquivos

Cada agente tem um inbox (`para-agente-N.md`). O watcher monitora e entrega mensagens automaticamente.

**geral.md é lido ANTES de qualquer ação por qualquer agente.**

### Protocolo AGUARDANDO (obrigatório para agentes)

Quando um agente para e espera:
1. Registra no log
2. **OBRIGATÓRIO:** escreve em `para-gerente.md` com `STATUS: NOVO`

**Log não é gatilho. Mensagem é gatilho.** O watcher processa `STATUS: NOVO`.

---

## Scripts

### `iniciar-agente.ps1`

```powershell
.\scripts-agentes\iniciar-agente.ps1 -Todos
.\scripts-agentes\iniciar-agente.ps1 -Todos -IniciarWatcher -IniciarChat
.\scripts-agentes\iniciar-agente.ps1 -Nome AGENTE-1
.\scripts-agentes\iniciar-agente.ps1 -Todos -SemPrompt   # só abre janelas
```

Abre cada agente em janela PowerShell independente com cor de fundo própria para identificação. Envia o prompt de persona automaticamente quando o Claude/Gemini estiver pronto.

### `watch-mensagens.ps1`

```powershell
.\scripts-agentes\watch-mensagens.ps1 -AutoSend           # envia, você confirma [Enter]
.\scripts-agentes\watch-mensagens.ps1 -AutoSend -ComEnter # totalmente autônomo
.\scripts-agentes\watch-mensagens.ps1 -IntervaloDiretor 10 # wakeup Diretor a cada 10min
```

| Tecla | Ação |
|-------|------|
| `E` | Alterna Enter automático (manual ↔ autônomo) |
| `T` | Altera intervalo do wakeup do Diretor |

### `chat-view.ps1`

```powershell
.\scripts-agentes\chat-view.ps1                  # geral + inboxes ao vivo
.\scripts-agentes\chat-view.ps1 -SemGeral        # só inboxes
.\scripts-agentes\chat-view.ps1 -SoNovos         # só STATUS: NOVO
.\scripts-agentes\chat-view.ps1 -MaxPrivadas 15  # últimas 15 mensagens
```

### `diagnostico-janelas.ps1`

```powershell
.\scripts-agentes\diagnostico-janelas.ps1
```

Lista todas as janelas de agentes e mostra quais estão abertas (HWND/PID/título).

---

## Ciclo de sprint (v2.0)

```
PLANEJADO → ABERTO → EM_VERIFICAÇÃO → FECHADO → RETROSPECTIVA
```

**Regra inviolável:** Gerente não despacha Sprint N+1 antes de Sprint N estar `FECHADO`.

**Só o Diretor fecha sprints** — e só fecha com output literal de build + testes na mão.

---

## O que muda do template v1

| Aspecto | v1 (antigo) | v2 (este) |
|---------|-------------|-----------|
| Setup | Parâmetros na linha de comando | Wizard interativo |
| Scripts | 2 (setup + watcher) | 5 (wizard + 4 scripts) |
| Configuração | Hardcoded nos scripts | `config.json` — scripts se adaptam |
| Escopos dos agentes | Usuário define | **Diretor propõe após explorar o projeto** |
| Canal geral | Não existia | `geral.md` — lido antes de qualquer ação |
| Fechamento de sprint | Informal | Protocolo formal com evidência obrigatória |
| Personas | Básicas | v2.0 com mentalidade de auditor + onboarding |
| Dashboard | Não incluído | `chat-view.ps1` ao vivo |
| Diagnóstico | Não incluído | `diagnostico-janelas.ps1` |
| Director wakeup | Não incluído | Loop configurável no watcher |

---

## Requisitos

- Windows 10/11
- PowerShell 5.1+
- Claude Code **ou** Gemini CLI instalados
- (Recomendado) Windows Terminal como terminal padrão
