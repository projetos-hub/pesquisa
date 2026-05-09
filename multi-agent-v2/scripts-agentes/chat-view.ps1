<#
.SYNOPSIS
    Live dashboard for the multi-agent system.
    Section 1: General channel (geral.md)
    Section 2: Private inboxes

.USAGE
    .\scripts-agentes\chat-view.ps1
    .\scripts-agentes\chat-view.ps1 -SemGeral
    .\scripts-agentes\chat-view.ps1 -SoNovos
    .\scripts-agentes\chat-view.ps1 -MaxPrivadas 15
    .\scripts-agentes\chat-view.ps1 -IntervaloPoll 5
#>

param(
    [switch]$SemGeral,
    [switch]$SoNovos,
    [int]$MaxPrivadas   = 8,
    [int]$IntervaloPoll = 3
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding          = [System.Text.Encoding]::UTF8

$RAIZ     = Split-Path $PSScriptRoot -Parent
$CFG_FILE = Join-Path $RAIZ "tasks\.pids\config.json"

if (-not (Test-Path $CFG_FILE)) {
    Write-Host "  [ERRO] config.json nao encontrado: $CFG_FILE" -ForegroundColor Red
    exit 1
}

$cfg       = Get-Content $CFG_FILE -Raw | ConvertFrom-Json
$MENSAGENS = Join-Path $RAIZ "tasks\mensagens"
$GERAL_MD  = Join-Path $MENSAGENS "geral.md"
$Humano    = $cfg.humano

# ── Construir lista de inboxes a partir de config ─────────────────────────────
$INBOXES = @()
foreach ($ag in $cfg.agentes) {
    $inbox = if ($ag.inbox) { $ag.inbox } else { "para-$($ag.id.ToLower() -replace 'agente-','agente-').md" }
    $INBOXES += $inbox
}
$INBOXES += @("para-gerente.md", "para-diretor.md")
$inboxHumano = if ($cfg.humanoInbox) { $cfg.humanoInbox } else { "para-$($Humano.ToLower()).md" }
$INBOXES += $inboxHumano

# ── Cores de autor (geradas dinamicamente) ────────────────────────────────────
$CORES_AUTOR = @{
    "Diretor"    = "DarkYellow"
    "Gerente"    = "Magenta"
    "Sistema"    = "Yellow"
}
$CORES_AGENTE = @("Cyan","Green","Red","DarkCyan","Yellow")
$idx = 0
foreach ($ag in $cfg.agentes) {
    $CORES_AUTOR[$ag.id] = $CORES_AGENTE[$idx % $CORES_AGENTE.Count]
    $idx++
}
$CORES_AUTOR[$Humano] = "White"

$CORES_STATUS = @{
    "NOVO"       = "Yellow"
    "RESPONDIDO" = "DarkGray"
    "APROVADO"   = "Green"
    "BLOQUEADO"  = "Red"
}
$ICONE_STATUS = @{
    "NOVO"       = "[NOVO] "
    "RESPONDIDO" = "[OK]   "
    "APROVADO"   = "[APR]  "
    "BLOQUEADO"  = "[BLQ]  "
}

# ── Funcoes auxiliares ────────────────────────────────────────────────────────
function Get-CorAutor {
    param([string]$Autor)
    foreach ($chave in $script:CORES_AUTOR.Keys) {
        if ($Autor -match $chave) { return $script:CORES_AUTOR[$chave] }
    }
    return "Gray"
}
function Get-CorStatus {
    param([string]$Status)
    if ($script:CORES_STATUS.ContainsKey($Status)) { return $script:CORES_STATUS[$Status] }
    return "DarkYellow"
}
function Get-IconeStatus {
    param([string]$Status)
    if ($script:ICONE_STATUS.ContainsKey($Status)) { return $script:ICONE_STATUS[$Status] }
    return "[???]  "
}
function Remove-Markdown {
    param([string]$Texto)
    $t = [regex]::Replace($Texto, '\*\*([^*]+)\*\*', '$1')
    $t = [regex]::Replace($t,    '`([^`]+)`',        '$1')
    $t = [regex]::Replace($t,    '\[([^\]]+)\]\([^)]+\)', '$1')
    return $t
}

# ── Parse Canal Geral ─────────────────────────────────────────────────────────
function Get-EntradasGeral {
    param([string]$Caminho)
    $resultado = @()
    if (-not (Test-Path $Caminho)) { return $resultado }
    try {
        $raw = Get-Content $Caminho -Raw -Encoding UTF8 -ErrorAction SilentlyContinue
        if (-not $raw) { return $resultado }
        $partes = $raw -split '(?m)^---\s*$'
        foreach ($parte in $partes) {
            $parte = $parte.Trim()
            if ($parte -eq "") { continue }
            if ($parte -notmatch '^\[([^|\]]+)\|([^\]]+)\]') { continue }
            $autorRaw = $matches[1].Trim()
            $dataRaw  = $matches[2].Trim()
            $linhas   = $parte -split "`n"
            $corpo    = ($linhas | Select-Object -Skip 1) -join "`n"
            $corpo    = $corpo.Trim()
            $linhasCorpo = ($corpo -split "`n") | Where-Object {
                $_ -notmatch '^\s*#' -and $_ -notmatch '^\*\*Regra' -and
                $_ -notmatch '^\*\*Tom'  -and $_ -notmatch '^\*\*Protocolo'
            }
            $corpo = ($linhasCorpo -join "`n").Trim()
            if ($corpo -eq "") { continue }
            $entrada = [PSCustomObject]@{ Autor=$autorRaw; DataRaw=$dataRaw; Corpo=$corpo; DataObj=$null }
            if ($dataRaw -match '(\d{1,2})/(\d{1,2})(?:/(\d{4}))?\s+(\d{1,2}):(\d{2})') {
                try {
                    $ano = if ($matches[3] -ne "") { [int]$matches[3] } else { [int](Get-Date).Year }
                    $entrada.DataObj = [datetime]::new($ano, [int]$matches[2], [int]$matches[1], [int]$matches[4], [int]$matches[5], 0)
                } catch {}
            }
            $resultado += $entrada
        }
    } catch {}
    return $resultado
}

function Write-EntradaGeral {
    param([PSCustomObject]$Entrada, [switch]$IsNova)
    $cor = Get-CorAutor $Entrada.Autor
    if ($IsNova) { Write-Host ""; Write-Host "  *** CANAL GERAL -- nova entrada ***" -ForegroundColor Yellow }
    $horaDisplay = if ($null -ne $Entrada.DataObj) { " - " + $Entrada.DataObj.ToString("HH:mm") } elseif ($Entrada.DataRaw -ne "") { " - " + $Entrada.DataRaw } else { "" }
    Write-Host ""
    Write-Host "  [$($Entrada.Autor)$horaDisplay]" -ForegroundColor $cor
    foreach ($linha in ($Entrada.Corpo -split "`n")) {
        $linhaLimpa = (Remove-Markdown $linha).TrimEnd()
        if ($linhaLimpa -ne "") { Write-Host "  $linhaLimpa" -ForegroundColor White } else { Write-Host "" }
    }
    Write-Host ("  " + ("-" * 54)) -ForegroundColor DarkGray
}

function Write-SecaoGeral {
    param([array]$Entradas)
    $dataHoje = (Get-Date).ToString("dd/MM")
    Write-Host ""
    Write-Host ("  " + ("=" * 60)) -ForegroundColor Cyan
    Write-Host "  CANAL GERAL -- $($cfg.projeto)  $dataHoje" -ForegroundColor Cyan
    Write-Host ("  " + ("=" * 60)) -ForegroundColor Cyan
    if ($Entradas.Count -eq 0) {
        Write-Host ""; Write-Host "  (canal geral vazio)" -ForegroundColor DarkGray
        return
    }
    foreach ($entrada in $Entradas) { Write-EntradaGeral -Entrada $entrada }
}

# ── Parse Inboxes ─────────────────────────────────────────────────────────────
function Get-ConteudoInbox {
    param([string]$Caminho)
    try {
        $raw = Get-Content $Caminho -Raw -Encoding UTF8 -ErrorAction SilentlyContinue
        if (-not $raw) { return "" }
        $idx = $raw.IndexOf("<!-- Mensagens abaixo desta linha -->")
        if ($idx -ge 0) { $raw = $raw.Substring($idx) }
        return [regex]::Replace($raw, '(?s)```.*?```', '')
    } catch { return "" }
}

function Get-CorpoMensagem {
    param([string]$Bloco)
    $corpo = $Bloco
    foreach ($campo in @('De','Para','Data','STATUS','Assunto')) {
        $corpo = [regex]::Replace($corpo, "(?m)^\*\*${campo}:\*\*[^\n]*`n?", '')
    }
    $idxResp = $corpo.IndexOf('**Resposta:**')
    if ($idxResp -ge 0) { $corpo = $corpo.Substring(0, $idxResp) }
    $corpo   = $corpo.Trim()
    $linhas  = ($corpo -split "`n") | Where-Object {
        $l = $_.Trim()
        $l -ne "" -and $l -notmatch '^\(.*preenche aqui' -and $l -notmatch '^---$'
    }
    return ($linhas -join "`n").Trim()
}

function Get-TodasMensagensPrivadas {
    $todas = @()
    $ordemArq = @{}
    $i = 0
    foreach ($arq in $script:INBOXES) { $ordemArq[$arq] = $i; $i++ }

    foreach ($arq in $script:INBOXES) {
        $caminho = Join-Path $script:MENSAGENS $arq
        if (-not (Test-Path $caminho)) { continue }
        $conteudo = Get-ConteudoInbox $caminho
        if ($conteudo -eq "") { continue }
        $partes = [regex]::Split($conteudo, '(?m)^---\s*$')
        $idx = 0
        for ($j = 1; $j -lt $partes.Count; $j += 2) {
            $bloco = $partes[$j].Trim()
            if ($bloco -eq "") { continue }
            $msg = [PSCustomObject]@{
                De="(desconhecido)"; Para="(desconhecido)"; DataRaw=""; DataObj=$null
                STATUS="DESCONHECIDO"; Assunto="(sem assunto)"; Corpo=""
                ArquivoFonte=$arq; IndiceNoArquivo=$idx; _sk=""
            }
            if ($bloco -match '(?m)^\*\*De:\*\*\s*(.+)$')     { $msg.De      = $matches[1].Trim() }
            if ($bloco -match '(?m)^\*\*Para:\*\*\s*(.+)$')   { $msg.Para    = $matches[1].Trim() }
            if ($bloco -match '(?m)^\*\*Data:\*\*\s*(.+)$')   { $msg.DataRaw = $matches[1].Trim() }
            if ($bloco -match '(?m)^\*\*STATUS:\*\*\s*(\S+)') { $msg.STATUS  = $matches[1].Trim() }
            if ($bloco -match '(?m)^\*\*Assunto:\*\*\s*(.+)$'){ $msg.Assunto = $matches[1].Trim() }
            $msg.Corpo  = Get-CorpoMensagem $bloco
            $dataTicks  = if ($null -ne $msg.DataObj) { $msg.DataObj.Ticks } else { [long]::MaxValue }
            $arqOrd     = if ($ordemArq.ContainsKey($arq)) { $ordemArq[$arq] } else { 99 }
            $msg._sk    = "${dataTicks}_${arqOrd}_${idx}"
            $todas += $msg; $idx++
        }
    }
    return ($todas | Sort-Object -Property _sk)
}

function Get-FingerprintMsg {
    param([PSCustomObject]$Msg)
    return "$($Msg.ArquivoFonte)|$($Msg.IndiceNoArquivo)|$($Msg.De)|$($Msg.DataRaw)|$($Msg.Assunto)"
}

function Write-CorpoMsg {
    param([string]$Corpo)
    if ($Corpo -eq "" -or $null -eq $Corpo) { return }
    foreach ($linha in ($Corpo -split "`n")) {
        $l = (Remove-Markdown $linha).TrimEnd()
        if ($l -ne "") { Write-Host "          $l" -ForegroundColor Gray }
    }
    Write-Host ""
}

function Write-SecaoPrivadas {
    param([array]$Mensagens, [int]$Max)
    Write-Host ""
    Write-Host ("  " + ("=" * 60)) -ForegroundColor DarkGray
    Write-Host "  MENSAGENS PRIVADAS                  ultimas $Max" -ForegroundColor DarkGray
    Write-Host ("  " + ("=" * 60)) -ForegroundColor DarkGray
    Write-Host ""
    if ($Mensagens.Count -eq 0) { Write-Host "  (inboxes vazios)" -ForegroundColor DarkGray; return }
    $inicio = [Math]::Max(0, $Mensagens.Count - $Max)
    $exibir = $Mensagens[$inicio..($Mensagens.Count - 1)]
    foreach ($msg in $exibir) {
        if ($script:SoNovos -and $msg.STATUS -ne "NOVO") { continue }
        $corStatus = Get-CorStatus   $msg.STATUS
        $icone     = Get-IconeStatus $msg.STATUS
        $ehHumano  = $msg.ArquivoFonte -eq $script:inboxHumano
        $sufixo    = if ($ehHumano) { " [!]" } else { "" }
        $corNome   = if ($ehHumano) { "Red" } else { "White" }
        $hora      = if ($msg.DataRaw -match '\d{2}:\d{2}') { "  " + $matches[0] } else { "" }
        Write-Host -NoNewline "  "
        Write-Host -NoNewline $icone -ForegroundColor $corStatus
        Write-Host -NoNewline "$($msg.De) -> $($msg.Para)$sufixo" -ForegroundColor $corNome
        Write-Host $hora -ForegroundColor DarkGray
        Write-Host "          $($msg.Assunto)" -ForegroundColor DarkGray
        Write-CorpoMsg -Corpo $msg.Corpo
    }
}

function Write-MsgPrivadaNova {
    param([PSCustomObject]$Msg)
    $corStatus = Get-CorStatus   $Msg.STATUS
    $icone     = Get-IconeStatus $Msg.STATUS
    $ehHumano  = $Msg.ArquivoFonte -eq $script:inboxHumano
    $sufixo    = if ($ehHumano) { " [!]" } else { "" }
    $corNome   = if ($ehHumano) { "Red" } else { "White" }
    Write-Host ""
    Write-Host "  --- mensagem nova ---" -ForegroundColor DarkGray
    Write-Host -NoNewline "  "
    Write-Host -NoNewline $icone -ForegroundColor $corStatus
    Write-Host "$($Msg.De) -> $($Msg.Para)$sufixo" -ForegroundColor $corNome
    Write-Host "          $($Msg.Assunto)" -ForegroundColor DarkGray
    Write-CorpoMsg -Corpo $Msg.Corpo
}

# ── Exibicao inicial ──────────────────────────────────────────────────────────
Write-Host ""
Write-Host "  =================================================" -ForegroundColor Magenta
Write-Host "    $($cfg.projeto) -- Chat ao Vivo" -ForegroundColor Magenta
Write-Host "  =================================================" -ForegroundColor Magenta
Write-Host "  Poll: ${IntervaloPoll}s | Ctrl+C para parar" -ForegroundColor DarkGray
if ($SemGeral) { Write-Host "  Modo: so inboxes privados" -ForegroundColor DarkGray }
if ($SoNovos)  { Write-Host "  Filtro: so STATUS NOVO" -ForegroundColor DarkGray }
Write-Host ""

if (-not $SemGeral) {
    $entradasGeral = Get-EntradasGeral -Caminho $GERAL_MD
    Write-SecaoGeral -Entradas $entradasGeral
}
$todasMsgs = Get-TodasMensagensPrivadas
Write-SecaoPrivadas -Mensagens $todasMsgs -Max $MaxPrivadas
Write-Host ""
Write-Host ("  " + ("-" * 52) + " ao vivo") -ForegroundColor DarkGray
Write-Host ""

# ── Estado inicial do loop ────────────────────────────────────────────────────
$ultimaModGeral     = if (Test-Path $GERAL_MD) { (Get-Item $GERAL_MD).LastWriteTime } else { [datetime]::MinValue }
$entradasVistaCount = (Get-EntradasGeral -Caminho $GERAL_MD).Count
$ultimaModInbox     = @{}
foreach ($arq in $INBOXES) {
    $caminho = Join-Path $MENSAGENS $arq
    if (Test-Path $caminho) { $ultimaModInbox[$arq] = (Get-Item $caminho).LastWriteTime }
}
$msgsVistas = @{}
foreach ($msg in $todasMsgs) { $msgsVistas[(Get-FingerprintMsg $msg)] = $msg.STATUS }

# ── Loop ao vivo ──────────────────────────────────────────────────────────────
while ($true) {
    Start-Sleep -Seconds $IntervaloPoll

    if (-not $SemGeral -and (Test-Path $GERAL_MD)) {
        $modAtual = (Get-Item $GERAL_MD).LastWriteTime
        if ($modAtual -gt $ultimaModGeral) {
            $ultimaModGeral = $modAtual
            $entradasAgora  = Get-EntradasGeral -Caminho $GERAL_MD
            if ($entradasAgora.Count -gt $entradasVistaCount) {
                $novas = $entradasAgora[$entradasVistaCount..($entradasAgora.Count - 1)]
                foreach ($e in $novas) { Write-EntradaGeral -Entrada $e -IsNova }
                $entradasVistaCount = $entradasAgora.Count
            }
        }
    }

    $algumInboxMudou = $false
    foreach ($arq in $INBOXES) {
        $caminho = Join-Path $MENSAGENS $arq
        if (-not (Test-Path $caminho)) { continue }
        $modAtual = (Get-Item $caminho).LastWriteTime
        if (-not $ultimaModInbox.ContainsKey($arq) -or $modAtual -gt $ultimaModInbox[$arq]) {
            $ultimaModInbox[$arq] = $modAtual; $algumInboxMudou = $true
        }
    }

    if ($algumInboxMudou) {
        $todasAgora = Get-TodasMensagensPrivadas
        foreach ($msg in $todasAgora) {
            $fp = Get-FingerprintMsg $msg
            if (-not $msgsVistas.ContainsKey($fp)) {
                if (-not ($script:SoNovos -and $msg.STATUS -ne "NOVO")) { Write-MsgPrivadaNova -Msg $msg }
                $msgsVistas[$fp] = $msg.STATUS
            } elseif ($msgsVistas[$fp] -ne $msg.STATUS) {
                $corStatus = Get-CorStatus $msg.STATUS
                Write-Host "  [update] $($msg.De) -> $($msg.Para): $($msgsVistas[$fp]) -> $($msg.STATUS)" -ForegroundColor $corStatus
                $msgsVistas[$fp] = $msg.STATUS
            }
        }
    }
}
