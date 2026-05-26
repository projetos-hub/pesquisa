<#
.SYNOPSIS
    Multi-Agent System Installer v2.0
    Interactive wizard. Run from inside any project folder.

.USAGE
    .\instalar.ps1
    .\instalar.ps1 -Raiz "C:\MeuProjeto"
#>

param(
    [string]$Raiz = (Get-Location).Path
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding          = [System.Text.Encoding]::UTF8

$SCRIPT_DIR = $PSScriptRoot

# ── Helper: Read input with default ──────────────────────────────────────────
function Read-Resposta {
    param([string]$Prompt, [string]$Default = "", [switch]$Opcional)
    $sufixo = if ($Default -ne "") { " [$Default]" } else { if ($Opcional) { " (opcional - Enter para pular)" } else { "" } }
    Write-Host -NoNewline "  $Prompt$sufixo : " -ForegroundColor Cyan
    $resp = Read-Host
    if ($resp -eq "" -and $Default -ne "") { return $Default }
    return $resp
}

function Read-Numero {
    param([string]$Prompt, [int]$Default, [int]$Min, [int]$Max)
    while ($true) {
        $resp = Read-Resposta -Prompt $Prompt -Default "$Default"
        try {
            $n = [int]$resp
            if ($n -ge $Min -and $n -le $Max) { return $n }
            Write-Host "  Digite um numero entre $Min e $Max." -ForegroundColor Yellow
        } catch {
            Write-Host "  Digite apenas um numero." -ForegroundColor Yellow
        }
    }
}

function Read-SimNao {
    param([string]$Prompt, [bool]$DefaultSim = $true)
    $padrao = if ($DefaultSim) { "S" } else { "N" }
    while ($true) {
        $resp = Read-Resposta -Prompt "$Prompt [S/N]" -Default $padrao
        switch ($resp.ToUpper()) {
            "S" { return $true }
            "Y" { return $true }
            "N" { return $false }
            default { Write-Host "  Digite S ou N." -ForegroundColor Yellow }
        }
    }
}

function Escrever-Arquivo {
    param([string]$Caminho, [string]$Conteudo)
    $dir = Split-Path $Caminho
    if (-not (Test-Path $dir)) { New-Item -ItemType Directory -Path $dir -Force | Out-Null }
    $Conteudo | Out-File $Caminho -Encoding UTF8 -Force
    Write-Host "  [+] $(($Caminho).Replace($script:RAIZ_PROJ, '').TrimStart('\'))" -ForegroundColor DarkGray
}

# ── Banner ────────────────────────────────────────────────────────────────────
Clear-Host
Write-Host ""
Write-Host "  =====================================================" -ForegroundColor Magenta
Write-Host "    Sistema Multi-Agente v2.0 -- Instalador" -ForegroundColor Magenta
Write-Host "  =====================================================" -ForegroundColor Magenta
Write-Host ""
Write-Host "  Este wizard vai configurar um sistema de agentes de IA" -ForegroundColor White
Write-Host "  paralelos para trabalhar no seu projeto." -ForegroundColor White
Write-Host ""
Write-Host "  Cada agente e uma janela independente de Claude Code" -ForegroundColor DarkGray
Write-Host "  (ou Gemini). O sistema de mensagens coordena o trabalho." -ForegroundColor DarkGray
Write-Host ""
Write-Host "  Responda as perguntas abaixo. Pressione Enter para usar" -ForegroundColor DarkGray
Write-Host "  o valor entre colchetes quando houver um padrao." -ForegroundColor DarkGray
Write-Host ""

# ── Perguntas ─────────────────────────────────────────────────────────────────

# 1. Nome do projeto
Write-Host "  --------------------------------------------------" -ForegroundColor DarkGray
Write-Host ""
$NomeProjeto = ""
while ($NomeProjeto -eq "") {
    $NomeProjeto = Read-Resposta -Prompt "1. Qual e o nome do projeto?" -Default "Meu Projeto"
    if ($NomeProjeto -eq "") { Write-Host "  O nome do projeto e obrigatorio." -ForegroundColor Yellow }
}
Write-Host ""

# 2. Nome do dono
$NomeHumano = ""
while ($NomeHumano -eq "") {
    $NomeHumano = Read-Resposta -Prompt "2. Qual e o seu nome? (responsavel pelo projeto)" -Default "Lucas"
    if ($NomeHumano -eq "") { Write-Host "  Seu nome e obrigatorio." -ForegroundColor Yellow }
}
Write-Host ""

# 3. Descricao do projeto
Write-Host "  --------------------------------------------------" -ForegroundColor DarkGray
Write-Host ""
Write-Host "  O Diretor vai ler esta descricao para entender o projeto" -ForegroundColor DarkGray
Write-Host "  e propor o escopo de cada agente." -ForegroundColor DarkGray
Write-Host ""
$Descricao = Read-Resposta -Prompt "3. Descreva em 1-2 frases o que estao construindo" -Default "Projeto de software"
Write-Host ""

# 4. Numero de agentes
Write-Host "  --------------------------------------------------" -ForegroundColor DarkGray
Write-Host ""
Write-Host "  Recomendacao: 3 agentes para a maioria dos projetos." -ForegroundColor DarkGray
Write-Host "  (min: 1, max: 5)" -ForegroundColor DarkGray
Write-Host ""
$NumAgentes = Read-Numero -Prompt "4. Quantos agentes tecnicos?" -Default 3 -Min 1 -Max 5
Write-Host ""

# 5. Hints de papel para cada agente
Write-Host "  --------------------------------------------------" -ForegroundColor DarkGray
Write-Host ""
Write-Host "  Para cada agente, voce pode dar um hint do papel que imagina." -ForegroundColor DarkGray
Write-Host "  O Diretor vai usar isso como ponto de partida para definir" -ForegroundColor DarkGray
Write-Host "  os escopos reais. Pode deixar em branco se nao souber." -ForegroundColor DarkGray
Write-Host ""
$Hints = @()
for ($i = 1; $i -le $NumAgentes; $i++) {
    $hint = Read-Resposta -Prompt "   Agente $i -- qual funcao voce imagina?" -Opcional
    $Hints += $hint
}
Write-Host ""

# 6. Motor de IA
Write-Host "  --------------------------------------------------" -ForegroundColor DarkGray
Write-Host ""
Write-Host "  [1] Claude Code (recomendado)" -ForegroundColor White
Write-Host "  [2] Gemini CLI" -ForegroundColor White
Write-Host ""
$motorResp = Read-Resposta -Prompt "6. Motor de IA" -Default "1"
$Motor = if ($motorResp -eq "2") { "Gemini" } else { "Claude" }
Write-Host ""

# 7. Onde instalar
Write-Host "  --------------------------------------------------" -ForegroundColor DarkGray
Write-Host ""
Write-Host "  Onde criar a pasta tasks/ e scripts-agentes/?" -ForegroundColor DarkGray
Write-Host ""
$RaizInput = Read-Resposta -Prompt "7. Pasta do projeto" -Default $Raiz
if ($RaizInput -ne "") { $Raiz = $RaizInput }
$script:RAIZ_PROJ = $Raiz
Write-Host ""

# ── Confirmacao ───────────────────────────────────────────────────────────────
Write-Host "  =====================================================" -ForegroundColor Cyan
Write-Host "    Resumo" -ForegroundColor Cyan
Write-Host "  =====================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "  Projeto    : $NomeProjeto" -ForegroundColor White
Write-Host "  Responsavel: $NomeHumano" -ForegroundColor White
Write-Host "  Descricao  : $Descricao" -ForegroundColor White
Write-Host "  Agentes    : $NumAgentes tecnicos + Gerente + Diretor" -ForegroundColor White
for ($i = 0; $i -lt $NumAgentes; $i++) {
    $hint = $Hints[$i]
    $hintDisplay = if ($hint -ne "") { "  (hint: $hint)" } else { "" }
    Write-Host "    Agente $($i+1): AGENTE-$($i+1)$hintDisplay" -ForegroundColor DarkGray
}
Write-Host "  Motor      : $Motor" -ForegroundColor White
Write-Host "  Pasta      : $Raiz" -ForegroundColor White
Write-Host ""

$confirmar = Read-SimNao -Prompt "Instalar com estes dados?" -DefaultSim $true
if (-not $confirmar) {
    Write-Host ""
    Write-Host "  Instalacao cancelada. Execute novamente para reiniciar." -ForegroundColor Yellow
    Write-Host ""
    exit 0
}

Write-Host ""
Write-Host "  Instalando..." -ForegroundColor Green
Write-Host ""

# ── Criar pastas ──────────────────────────────────────────────────────────────
$TASKS    = Join-Path $Raiz "tasks"
$MSGS     = Join-Path $TASKS "mensagens"
$PERSONAS = Join-Path $TASKS "personas"
$LOGS     = Join-Path $TASKS "logs"
$PIDS_DIR = Join-Path $TASKS ".pids"
$SCRIPTS  = Join-Path $Raiz "scripts-agentes"

foreach ($p in @($TASKS,$MSGS,$PERSONAS,$LOGS,$PIDS_DIR,$SCRIPTS)) {
    if (-not (Test-Path $p)) {
        New-Item -ItemType Directory -Path $p -Force | Out-Null
    }
}

# ── Gerar config.json ─────────────────────────────────────────────────────────
$CORES_DISPONIVEIS = @("DarkBlue","DarkGreen","DarkRed","DarkCyan","DarkYellow")
$agentesJson = @()
for ($i = 0; $i -lt $NumAgentes; $i++) {
    $id    = "AGENTE-$($i+1)"
    $cor   = $CORES_DISPONIVEIS[$i % $CORES_DISPONIVEIS.Count]
    $inbox = "para-agente-$($i+1).md"
    $agentesJson += @{
        id    = $id
        hint  = $Hints[$i]
        cor   = $cor
        inbox = $inbox
    }
}
$config = [ordered]@{
    projeto     = $NomeProjeto
    humano      = $NomeHumano
    descricao   = $Descricao
    motor       = $Motor
    humanoInbox = "para-$($NomeHumano.ToLower()).md"
    agentes     = $agentesJson
}
$configJson = $config | ConvertTo-Json -Depth 5
$configJson | Out-File (Join-Path $PIDS_DIR "config.json") -Encoding UTF8 -Force
Write-Host "  [+] tasks/.pids/config.json" -ForegroundColor DarkGray

# ── Gerar geral.md ────────────────────────────────────────────────────────────
$data = Get-Date -Format "dd/MM/yyyy HH:mm"
$geralConteudo = @"
# Canal Geral -- $NomeProjeto

**REGRA:** Todos os agentes leem este arquivo ANTES de qualquer acao.
Escreva aqui quando tomar decisoes que afetam mais de uma frente.

<!-- Inicio do canal -->

---
[Sistema | $data]
Sistema multi-agente instalado. Projeto: $NomeProjeto
Responsavel: $NomeHumano | Agentes: $NumAgentes + Gerente + Diretor
O Diretor vai propor os escopos dos agentes antes do Sprint 1.
---

"@
Escrever-Arquivo (Join-Path $MSGS "geral.md") $geralConteudo

# ── Gerar inboxes ─────────────────────────────────────────────────────────────
$inboxHumano = "para-$($NomeHumano.ToLower()).md"
$todosInboxes = @()
for ($i = 1; $i -le $NumAgentes; $i++) { $todosInboxes += "para-agente-$i.md" }
$todosInboxes += @("para-gerente.md", "para-diretor.md", $inboxHumano)

foreach ($inbox in $todosInboxes) {
    $nomeDestinatario = $inbox -replace "para-","" -replace ".md",""
    $conteudoInbox = @"
# Inbox -- $nomeDestinatario

<!-- Mensagens abaixo desta linha -->

"@
    Escrever-Arquivo (Join-Path $MSGS $inbox) $conteudoInbox
}

# ── Gerar personas tecnicos ───────────────────────────────────────────────────
for ($i = 1; $i -le $NumAgentes; $i++) {
    $id   = "AGENTE-$i"
    $hint = $Hints[$i-1]
    $hintSecao = if ($hint -ne "") {
        "**Hint do responsavel:** $hint`n(O Diretor vai confirmar e detalhar este papel antes do Sprint 1)"
    } else {
        "(O Diretor vai definir seu escopo antes do Sprint 1)"
    }
    $personaConteudo = @"
# Voce e o $id do projeto $NomeProjeto
**Responsavel:** $NomeHumano

$hintSecao

---

## Leia nesta ordem ao iniciar

1. tasks/mensagens/geral.md  <- OBRIGATORIO ANTES DE QUALQUER COISA
2. tasks/STATUS.md
3. tasks/mensagens/para-agente-$i.md
4. tasks/logs/agente-$i.md

---

## Protocolo AGUARDANDO -- OBRIGATORIO

Quando entrar em espera por qualquer motivo:
1. Registre no log: tasks/logs/agente-$i.md
2. OBRIGATORIO: escreva em tasks/mensagens/para-gerente.md

Formato da mensagem:
---
**De:** $id
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
2. Branch propria: feat/agente-$i/nome-tarefa
3. Antes do PR: build e typecheck devem passar
4. Abre PR e avisa o Gerente via para-gerente.md

---

## Principios

- Entregamos. Sempre.
- Bloqueio resolve em 2 tentativas ou escala para o Gerente
- Commit pequeno e frequente > acumular mudancas
- Qualidade nao e opcional

"@
    Escrever-Arquivo (Join-Path $PERSONAS "$id.md") $personaConteudo
    Escrever-Arquivo (Join-Path $LOGS "agente-$i.md") "# Log -- AGENTE-$i`n`n<!-- Entradas abaixo -->`n"
}

# ── Persona Gerente ───────────────────────────────────────────────────────────
$personaGerenteConteudo = @"
# Voce e o Gerente do projeto $NomeProjeto
**Responsavel:** $NomeHumano

---

## Leia nesta ordem ao iniciar

1. tasks/mensagens/geral.md  <- OBRIGATORIO ANTES DE QUALQUER COISA
2. tasks/STATUS.md
3. Todos os inboxes com STATUS: NOVO
4. tasks/logs/ de cada agente

---

## Hierarquia de autoridade

$NomeHumano (dono do produto)
    Diretor (autoridade delegada, supervisao e estrategia)
    Voce (Gerente -- coordenacao operacional)
    Agentes 1-$NumAgentes (implementacao)

**Ordem do Diretor = ordem de $NomeHumano. Sem questionamento.**

---

## Regra INVIOLAVEL -- Lifecycle de sprint

**NAO despache tarefas de Sprint N+1 enquanto Sprint N nao estiver FECHADO.**

Agentes que concluem ficam em standby. Nao adiantam trabalho do proximo sprint.

### Ciclo completo:
1. Diretor abre Sprint N em geral.md
2. Voce le e distribui tarefas pelos agentes via seus inboxes
3. Agentes concluem e reportam standby em geral.md
4. Voce executa suite de verificacao:
   [COMANDO_BUILD]
   [COMANDO_TESTES]
5. Voce envia output LITERAL para tasks/mensagens/para-diretor.md
6. Diretor valida e assina FECHADO
7. Somente entao planejam Sprint N+1

---

## Escalada

- Agente bloqueado -> escreve em para-gerente.md (voce resolve)
- Voce bloqueado -> escreve em para-diretor.md com STATUS: NOVO
- Decisao de negocio -> escreve em $inboxHumano
- Maximo 2 tentativas de resolucao antes de escalar

---

## Git e PRs

- Agente abre PR -> informa em para-gerente.md com URL
- Voce aprova o PR -> informa Diretor em para-diretor.md
- NUNCA faca o merge. O Diretor faz via GitHub MCP.

---

## Principios

- "Entregamos. Sempre."
- Agente ocioso e falha de planejamento: despache imediatamente
- Bloqueio resolve em 2 tentativas ou escala
- Qualidade nao e opcional: zero erros de typecheck antes de pedir fechamento

"@
Escrever-Arquivo (Join-Path $PERSONAS "AGENTE-GERENTE.md") $personaGerenteConteudo
Escrever-Arquivo (Join-Path $LOGS "gerente.md") "# Log -- AGENTE-GERENTE`n`n<!-- Entradas abaixo -->`n"

# ── Persona Diretor ───────────────────────────────────────────────────────────
$personaDiretorConteudo = @"
# Voce e o Diretor do projeto $NomeProjeto
**Responsavel:** $NomeHumano

---

## Leia nesta ordem ao iniciar

1. tasks/mensagens/geral.md  <- OBRIGATORIO ANTES DE QUALQUER COISA
2. tasks/STATUS.md
3. tasks/mensagens/para-diretor.md
4. tasks/ROADMAP.md (se existir)

---

## PRIMEIRA SESSAO -- Protocolo de onboarding

**Se STATUS.md nao tiver sprints anteriores (projeto novo):**

1. Leia tasks/STATUS.md para entender o contexto e descricao do projeto
2. Explore o repositorio: leia package.json, requirements.txt, go.mod ou qualquer
   arquivo de configuracao para entender o stack tecnologico real
3. Leia tasks/.pids/config.json para ver os hints de papel dos agentes
4. Com base no que encontrou, PROPONHA os escopos reais de cada agente.
   Escreva a proposta em tasks/mensagens/$inboxHumano com STATUS: NOVO

   Exemplo de proposta:
   ---
   De: Diretor
   Para: $NomeHumano
   STATUS: NOVO
   Assunto: Proposta de escopos dos agentes -- aguardo aprovacao

   Com base no projeto ($Descricao) e no stack encontrado,
   proponho os seguintes escopos:
   - AGENTE-1: [escopo baseado no hint e no stack]
   - AGENTE-2: [escopo]
   ...
   ---

5. Aguarde aprovacao de $NomeHumano
6. Uma vez aprovado, EDITE os arquivos tasks/personas/AGENTE-N.md
   com as responsabilidades reais de cada agente
7. Defina os comandos de build e teste no PROTOCOLO-SPRINT.md
8. Abra o Sprint 1 em geral.md

---

## Mentalidade de auditor

**Este sistema e imperfeito. Agentes podem alucinar com total confianca.**
**Um log bem escrito nao e evidencia. Output de comando e evidencia.**

O que conta como evidencia para fechar um sprint:
- Output LITERAL de [COMANDO_BUILD] colado na mensagem
- Output LITERAL de [COMANDO_TESTES] com numero de testes passando
- Se o output diz "0 errors" -- aceito. Se o agente diz "0 erros" -- rejeitado.

O que NAO conta:
- "Build passou"
- "Typecheck zerado"
- "Todos os testes passaram"
- Qualquer narrativa sem output literal

---

## Ciclo formal de sprint

PLANEJADO -> ABERTO -> EM_VERIFICACAO -> FECHADO -> RETROSPECTIVA

| Transicao | Autoridade | Pre-condicao |
|---|---|---|
| PLANEJADO -> ABERTO | Voce (Diretor) | Sprint anterior FECHADO + retrospectiva |
| ABERTO -> EM_VERIFICACAO | Gerente | Todos agentes em standby em geral.md |
| EM_VERIFICACAO -> FECHADO | Voce (Diretor) | Output real de build e testes recebido |
| FECHADO -> RETROSPECTIVA | Voce (Diretor) | Sprint tecnico encerrado |

**Assine fechamentos em geral.md:**
[Sprint X: FECHADO | Diretor | DD/MM/AAAA]

---

## Criterios de intervencao

- Gerente ocioso mais de 10 min apos conclusao de agente
- Mais de 1 agente ocioso simultaneamente
- Projeto travado sem nenhum agente trabalhando
- Gerente vai contra orientacao de $NomeHumano

---

## Supervisao silenciosa

Quando tudo esta fluindo: NAO intervenha.
Escreva em geral.md somente para: abrir sprint, fechar sprint, decisao critica.
Tom conversacional, nao burocrático.

"@
Escrever-Arquivo (Join-Path $PERSONAS "AGENTE-DIRETOR.md") $personaDiretorConteudo
Escrever-Arquivo (Join-Path $LOGS "diretor.md") "# Log -- AGENTE-DIRETOR`n`n<!-- Entradas abaixo -->`n"

# ── STATUS.md ─────────────────────────────────────────────────────────────────
$statusConteudo = @"
# STATUS -- $NomeProjeto
**Ultima atualizacao:** $(Get-Date -Format 'dd/MM/yyyy') -- Setup inicial

---

## Descricao do Projeto

$Descricao

---

## Agentes

| Agente | Papel | Estado |
|--------|-------|--------|
$(for ($i = 1; $i -le $NumAgentes; $i++) {
    $hint = $Hints[$i-1]
    $papel = if ($hint -ne "") { $hint } else { "(a definir pelo Diretor)" }
    "| AGENTE-$i | $papel | aguardando onboarding |"
    "`n"
})| AGENTE-GERENTE | Coordenacao operacional | aguardando Diretor |
| AGENTE-DIRETOR | Estrategia e supervisao | aguardando ativacao |

---

## Sprints

| Sprint | Estado | Observacao |
|--------|--------|------------|
| (nenhum) | - | Onboarding pendente |

---

## Historico

| Data | Acao |
|------|------|
| $(Get-Date -Format 'dd/MM/yyyy') | Setup inicial -- instalador v2.0 |

"@
Escrever-Arquivo (Join-Path $TASKS "STATUS.md") $statusConteudo

# ── ROADMAP.md ────────────────────────────────────────────────────────────────
$roadmapConteudo = @"
# ROADMAP -- $NomeProjeto

**Responsavel:** $NomeHumano

---

## Onboarding (antes do Sprint 1)

- [ ] Diretor explora o projeto e propoe escopos dos agentes
- [ ] $NomeHumano aprova os escopos
- [ ] Diretor edita as personas com escopos reais
- [ ] Diretor define comandos de build e teste
- [ ] Diretor abre Sprint 1

---

## Sprint 1

(a ser preenchido pelo Diretor apos onboarding)

---

## Backlog

(a ser preenchido ao longo do projeto)

"@
Escrever-Arquivo (Join-Path $TASKS "ROADMAP.md") $roadmapConteudo

# ── PROTOCOLO-SPRINT.md ───────────────────────────────────────────────────────
$protocoloSprintConteudo = @"
# Protocolo de Sprint -- $NomeProjeto

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
| Sprint N+1 ABERTO | Diretor | Retrospectiva concluida + aprovacao de $NomeHumano |

---

## Regra Inviolavel

**O Gerente nao pode despachar tarefas de Sprint N+1 enquanto Sprint N nao estiver FECHADO.**

---

## Suite de Verificacao (Gerente executa antes de pedir fechamento)

Substitua os placeholders abaixo com os comandos reais do projeto:

    [COMANDO_BUILD]
    [COMANDO_TESTES]

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

"@
Escrever-Arquivo (Join-Path $TASKS "PROTOCOLO-SPRINT.md") $protocoloSprintConteudo

# ── PROTOCOLO-COMUNICACAO.md ─────────────────────────────────────────────────
$protocoloComunicacaoConteudo = @"
# Protocolo de Comunicacao -- $NomeProjeto

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
| $inboxHumano | Escalada para $NomeHumano | Diretor / Gerente |

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
- Escalada de decisao (-> $inboxHumano)

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
            -> se decisao de negocio: escreve em $inboxHumano

"@
Escrever-Arquivo (Join-Path $TASKS "PROTOCOLO-COMUNICACAO.md") $protocoloComunicacaoConteudo

# ── OWNERSHIP-MATRIX.md ──────────────────────────────────────────────────────
$ownershipConteudo = @"
# Ownership Matrix -- $NomeProjeto

**O Diretor preenche esta tabela durante o onboarding.**

---

## Regra

Cada arquivo ou pasta tem exatamente um dono.
Modificacoes em arquivos de outro agente requerem: [AUTORIZADO: Diretor]

---

## Matriz (preencher durante onboarding)

| Arquivo / Pasta | Dono | Observacao |
|-----------------|------|------------|
| tasks/ | Gerente | Sistema de coordenacao |
| tasks/mensagens/geral.md | Todos | Canal compartilhado |
| tasks/STATUS.md | Gerente | Quadro de estado |
| [seu codigo aqui] | [agente] | [descricao] |

---

## Arquivos protegidos (exigem autorizacao do Diretor)

- Arquivos de configuracao de build (package.json, go.mod, etc.)
- Arquivos de infraestrutura (docker-compose, CI/CD)
- Arquivos de autenticacao e seguranca

"@
Escrever-Arquivo (Join-Path $TASKS "OWNERSHIP-MATRIX.md") $ownershipConteudo

# ── Copiar scripts de ./scripts/ ─────────────────────────────────────────────
Write-Host ""
Write-Host "  Copiando scripts..." -ForegroundColor DarkGray

$scriptsSource = Join-Path $SCRIPT_DIR "scripts"
$scriptFiles   = @("iniciar-agente.ps1","watch-mensagens.ps1","chat-view.ps1","diagnostico-janelas.ps1")

foreach ($s in $scriptFiles) {
    $src = Join-Path $scriptsSource $s
    $dst = Join-Path $SCRIPTS $s
    if (Test-Path $src) {
        Copy-Item $src $dst -Force
        Write-Host "  [+] scripts-agentes\$s" -ForegroundColor DarkGray
    } else {
        Write-Host "  [aviso] $s nao encontrado em scripts\ -- copie manualmente" -ForegroundColor Yellow
    }
}

# ── Resumo final ──────────────────────────────────────────────────────────────
Write-Host ""
Write-Host "  =====================================================" -ForegroundColor Green
Write-Host "    Instalacao concluida!" -ForegroundColor Green
Write-Host "  =====================================================" -ForegroundColor Green
Write-Host ""
Write-Host "  Estrutura criada em: $Raiz" -ForegroundColor White
Write-Host ""
Write-Host "  Proximos passos:" -ForegroundColor Cyan
Write-Host ""
Write-Host "  1. Abra todos os agentes:" -ForegroundColor White
Write-Host "     .\scripts-agentes\iniciar-agente.ps1 -Todos -IniciarWatcher -IniciarChat" -ForegroundColor DarkGray
Write-Host ""
Write-Host "  2. Na janela do AGENTE-DIRETOR, cole o prompt:" -ForegroundColor White
Write-Host "     Leia tasks/personas/AGENTE-DIRETOR.md e assuma o papel descrito." -ForegroundColor DarkGray
Write-Host "     Siga a sequencia de leitura antes de qualquer acao." -ForegroundColor DarkGray
Write-Host ""
Write-Host "  3. O Diretor vai explorar o projeto, propor os escopos" -ForegroundColor White
Write-Host "     dos agentes e pedir sua aprovacao antes de comecar." -ForegroundColor White
Write-Host ""
Write-Host "  Referencia rapida:" -ForegroundColor DarkGray
Write-Host "    Diagnostico  : .\scripts-agentes\diagnostico-janelas.ps1" -ForegroundColor DarkGray
Write-Host "    So o watcher : .\scripts-agentes\watch-mensagens.ps1 -AutoSend" -ForegroundColor DarkGray
Write-Host "    Chat ao vivo : .\scripts-agentes\chat-view.ps1" -ForegroundColor DarkGray
Write-Host ""
