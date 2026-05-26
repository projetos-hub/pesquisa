<#
.SYNOPSIS
    Monitors agent inboxes and routes messages automatically.

.USAGE
    .\scripts-agentes\watch-mensagens.ps1
    .\scripts-agentes\watch-mensagens.ps1 -AutoSend
    .\scripts-agentes\watch-mensagens.ps1 -AutoSend -ComEnter
    .\scripts-agentes\watch-mensagens.ps1 -AutoSend -IntervaloDiretor 10
#>

param(
    [switch]$AutoSend,
    [switch]$ComEnter,
    [int]$IntervaloDiretor = 15
)

$script:ComEnterAtivo = $ComEnter.IsPresent

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding          = [System.Text.Encoding]::UTF8

$RAIZ     = Split-Path $PSScriptRoot -Parent
$CFG_FILE = Join-Path $RAIZ "tasks\.pids\config.json"
$PIDS_DIR = Join-Path $RAIZ "tasks\.pids"

if (-not (Test-Path $CFG_FILE)) {
    Write-Host "  [ERRO] config.json nao encontrado: $CFG_FILE" -ForegroundColor Red
    exit 1
}

$cfg       = Get-Content $CFG_FILE -Raw | ConvertFrom-Json
$MENSAGENS = Join-Path $RAIZ "tasks\mensagens"
$Engine    = if ($cfg.motor) { $cfg.motor } else { "Claude" }
$Humano    = $cfg.humano

# ── Construir tabela de agentes dinamicamente a partir de config.json ─────────
$AGENTES = @{}

foreach ($ag in $cfg.agentes) {
    $inbox = if ($ag.inbox) { $ag.inbox } else { "para-$($ag.id.ToLower() -replace 'agente-','agente-').md" }
    $AGENTES[$inbox] = @{
        Nome     = $ag.id
        Janela   = $ag.id
        Comando  = "verifique tasks/mensagens/$inbox e processe mensagens com STATUS: NOVO"
        Urgente  = $false
        AutoSend = $true
    }
}

$AGENTES["para-gerente.md"] = @{
    Nome     = "Gerente"
    Janela   = "AGENTE-GERENTE"
    Comando  = "verifique tasks/mensagens/para-gerente.md e processe mensagens com STATUS: NOVO"
    Urgente  = $false
    AutoSend = $true
}

$AGENTES["para-diretor.md"] = @{
    Nome     = "DIRETOR"
    Janela   = "AGENTE-DIRETOR"
    Comando  = "ACAO NECESSARIA: leia tasks/mensagens/geral.md primeiro, depois processe tasks/mensagens/para-diretor.md com STATUS: NOVO."
    Urgente  = $true
    AutoSend = $true
}

$inboxHumano = if ($cfg.humanoInbox) { $cfg.humanoInbox } else { "para-$($Humano.ToLower()).md" }
$AGENTES[$inboxHumano] = @{
    Nome     = "VOCE ($Humano)"
    Janela   = ""
    Comando  = "ACAO NECESSARIA: abra tasks/mensagens/$inboxHumano e responda"
    Urgente  = $true
    AutoSend = $false
}

# ── Wakeup do Diretor ─────────────────────────────────────────────────────────
$script:IntervaloDiretorAtual = $IntervaloDiretor
$proximoWakeupDiretor = if ($IntervaloDiretor -gt 0) { (Get-Date).AddMinutes($IntervaloDiretor) } else { [datetime]::MaxValue }
$wakeupComando = "Diretor: verifique tasks/mensagens/geral.md, tasks/mensagens/para-diretor.md e tasks/STATUS.md. Ha sprints aguardando fechamento? Agentes ociosos? Decisoes pendentes? Tome a acao necessaria."

$ultimoEnvio      = @{}
$ultimoRestart    = @{}
$RESTART_COOLDOWN = 300
$HEALTH_INTERVAL  = 30
$ultimoHealthCheck = (Get-Date).AddSeconds(-$HEALTH_INTERVAL)

# ── Win32 (fora de qualquer bloco para PS5.1) ─────────────────────────────────
$WIN32_CS = @'
using System;
using System.Runtime.InteropServices;
using System.Text;
public class Win32Helper {
    public delegate bool EnumWindowsProc(IntPtr hWnd, IntPtr lParam);
    [DllImport("user32.dll")] public static extern bool EnumWindows(EnumWindowsProc f, IntPtr lp);
    [DllImport("user32.dll")] public static extern int  GetWindowText(IntPtr hWnd, StringBuilder sb, int n);
    [DllImport("user32.dll")] public static extern bool IsWindowVisible(IntPtr hWnd);
    [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr hWnd);
    [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr hWnd, int nCmd);
    [DllImport("user32.dll")] public static extern bool BringWindowToTop(IntPtr hWnd);
    [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
    [DllImport("user32.dll")] public static extern bool AllowSetForegroundWindow(int dwProcessId);
    [DllImport("user32.dll")] public static extern int GetWindowThreadProcessId(IntPtr hWnd, out int lpdwProcessId);
    public static IntPtr FindByTitle(string fragment) {
        IntPtr found = IntPtr.Zero;
        EnumWindows(delegate(IntPtr hWnd, IntPtr unused) {
            if (!IsWindowVisible(hWnd)) return true;
            var sb = new StringBuilder(256);
            GetWindowText(hWnd, sb, 256);
            if (sb.ToString().IndexOf(fragment, StringComparison.OrdinalIgnoreCase) >= 0) {
                found = hWnd; return false;
            }
            return true;
        }, IntPtr.Zero);
        return found;
    }
}
'@

Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing
$script:UIAutoDisponivel = $false

if ($AutoSend) {
    Add-Type -TypeDefinition $WIN32_CS
    try {
        Add-Type -AssemblyName UIAutomationClient
        Add-Type -AssemblyName UIAutomationTypes
        $script:UIAutoDisponivel = $true
    } catch {
        Write-Host "  [aviso] UIAutomation indisponivel" -ForegroundColor DarkYellow
    }
}

# ── Funcoes de janela ─────────────────────────────────────────────────────────
function Get-HwndSalvo {
    param([string]$NomeJanela)
    $hwndFile = Join-Path $PIDS_DIR "$NomeJanela.hwnd"
    if (-not (Test-Path $hwndFile)) { return [IntPtr]::Zero }
    try {
        $val  = [long](Get-Content $hwndFile -ErrorAction SilentlyContinue)
        $hwnd = [IntPtr]::new($val)
        if ([Win32Helper]::IsWindowVisible($hwnd)) { return $hwnd }
    } catch {}
    return [IntPtr]::Zero
}

function Get-HwndByPid {
    param([string]$NomeJanela)
    $pidFile = Join-Path $PIDS_DIR "$NomeJanela.pid"
    if (-not (Test-Path $pidFile)) { return [IntPtr]::Zero }
    try {
        $agentPid = [int](Get-Content $pidFile -ErrorAction SilentlyContinue)
        if ($agentPid -eq 0) { return [IntPtr]::Zero }
        $proc = Get-Process -Id $agentPid -ErrorAction SilentlyContinue
        if ($null -eq $proc) { return [IntPtr]::Zero }
        $proc.Refresh()
        return $proc.MainWindowHandle
    } catch { return [IntPtr]::Zero }
}

function Get-ConteudoMensagens {
    param([string]$Caminho)
    try {
        $raw = Get-Content $Caminho -Raw -Encoding UTF8 -ErrorAction SilentlyContinue
        if (-not $raw) { return "" }
        $idx = $raw.IndexOf("<!-- Mensagens abaixo desta linha -->")
        if ($idx -ge 0) { $raw = $raw.Substring($idx) }
        return [regex]::Replace($raw, '(?s)```.*?```', '')
    } catch { return "" }
}

function Get-Assunto {
    param([string]$Caminho)
    try {
        $conteudo = Get-ConteudoMensagens $Caminho
        foreach ($linha in ($conteudo -split "`n")) {
            if ($linha -match "\*\*Assunto:\*\*\s*(.+)") { return $matches[1].Trim() }
        }
    } catch {}
    return "(sem assunto)"
}

function Show-Balao {
    param([string]$Titulo, [string]$Texto, [bool]$Aviso, [int]$Duracao = 8000)
    try {
        $b = New-Object System.Windows.Forms.NotifyIcon
        $b.Icon = if ($Aviso) { [System.Drawing.SystemIcons]::Warning } else { [System.Drawing.SystemIcons]::Information }
        $b.Visible = $true
        $b.BalloonTipTitle = $Titulo
        $b.BalloonTipText  = $Texto
        $b.ShowBalloonTip($Duracao)
        Start-Sleep -Seconds 1
        $b.Visible = $false
        $b.Dispose()
    } catch {}
}

function Test-PromptVisivel {
    param([IntPtr]$Hwnd)
    if (-not $script:UIAutoDisponivel) { return $null }
    try {
        $elem    = [System.Windows.Automation.AutomationElement]::FromHandle($Hwnd)
        $pattern = $null
        try {
            $pattern = $elem.GetCurrentPattern(
                [System.Windows.Automation.TextPattern]::Pattern
            ) -as [System.Windows.Automation.TextPattern]
        } catch {}
        if ($null -eq $pattern) { return $null }
        $texto  = $pattern.DocumentRange.GetText(-1)
        $linhas = $texto -split "`n"
        for ($i = $linhas.Count - 1; $i -ge [Math]::Max(0, $linhas.Count - 5); $i--) {
            $linha = $linhas[$i].Trim()
            if ($linha -match "^[>]" -or $linha -match "[>]\s*$" -or $linha -match "Welcome" -or $linha -match "Claude Code" -or $linha -match "Gemini") {
                return $true
            }
        }
        return $false
    } catch { return $null }
}

function Invoke-AtivarJanela {
    param([IntPtr]$Hwnd)
    [Win32Helper]::AllowSetForegroundWindow(-1) | Out-Null
    [Win32Helper]::ShowWindow($Hwnd, 9) | Out-Null
    [Win32Helper]::BringWindowToTop($Hwnd) | Out-Null
    [Win32Helper]::SetForegroundWindow($Hwnd) | Out-Null
    Start-Sleep -Milliseconds 300
    return ([Win32Helper]::GetForegroundWindow() -eq $Hwnd)
}

function Send-ParaJanela {
    param([string]$Titulo, [string]$Comando, [bool]$ComEnter)
    $hwnd = Get-HwndSalvo  -NomeJanela $Titulo
    if ($hwnd -eq [IntPtr]::Zero) { $hwnd = Get-HwndByPid  -NomeJanela $Titulo }
    if ($hwnd -eq [IntPtr]::Zero) { $hwnd = [Win32Helper]::FindByTitle($Titulo) }
    if ($hwnd -eq [IntPtr]::Zero) { return "nao_encontrada" }

    $timeoutSeg   = 60
    $intervaloSeg = 2
    $tentativas   = [Math]::Ceiling($timeoutSeg / $intervaloSeg)
    $promptOk     = $false

    for ($t = 0; $t -lt $tentativas; $t++) {
        $resultado = Test-PromptVisivel -Hwnd $hwnd
        if ($resultado -eq $true) { $promptOk = $true; break }
        if ($null -eq $resultado) { $promptOk = $true; break }
        if ($t -eq 0) { Write-Host "  [..] aguardando prompt '$Titulo'..." -ForegroundColor DarkGray -NoNewline }
        else          { Write-Host "." -ForegroundColor DarkGray -NoNewline }
        Start-Sleep -Seconds $intervaloSeg
    }
    if (-not $promptOk) { Write-Host " timeout (60s)" -ForegroundColor DarkYellow; return "timeout_prompt" }

    $ativou = Invoke-AtivarJanela -Hwnd $hwnd
    if (-not $ativou) {
        Write-Host ""
        Write-Host "  [!!] Janela encontrada mas nao conseguiu ativar" -ForegroundColor DarkYellow
        return "ativacao_falhou"
    }
    Write-Host ""
    [System.Windows.Forms.SendKeys]::SendWait($Comando)
    if ($ComEnter) { Start-Sleep -Milliseconds 80; [System.Windows.Forms.SendKeys]::SendWait("{ENTER}") }
    return "ok"
}

function Get-UltimaEntradaGeral {
    param([string]$Caminho)
    try {
        $raw = Get-Content $Caminho -Raw -Encoding UTF8 -ErrorAction SilentlyContinue
        if (-not $raw) { return "(sem conteudo)" }
        $ocorrencias = [regex]::Matches($raw, '(?m)^\[([^\]]+)\]')
        if ($ocorrencias.Count -gt 0) {
            $ultima  = $ocorrencias[$ocorrencias.Count - 1]
            $trecho  = $raw.Substring($ultima.Index)
            $linhas  = ($trecho -split "`n") | Select-Object -First 2
            $preview = ($linhas -join " ")
            return $preview.Substring(0, [Math]::Min(120, $preview.Length))
        }
        return "(entrada sem formato esperado)"
    } catch { return "(erro ao ler)" }
}

function Show-Alerta {
    param($Agente, [string]$Preview, [string]$Arquivo)

    if ($Agente.Urgente) {
        for ($i = 0; $i -lt 3; $i++) { [Console]::Beep(1400, 300); Start-Sleep -Milliseconds 100 }
        Write-Host ""
        Write-Host "  !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!" -ForegroundColor Red
        Write-Host "  [$( Get-Date -Format 'HH:mm:ss' )] ACAO NECESSARIA" -ForegroundColor Red
        Write-Host "  Para   : $($Agente.Nome)" -ForegroundColor Yellow
        Write-Host "  Assunto: $Preview" -ForegroundColor Yellow
        Write-Host "  Acao   : abra tasks/mensagens/$Arquivo e responda" -ForegroundColor Yellow
        Write-Host "  !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!" -ForegroundColor Red
        Write-Host ""
        Set-Clipboard -Value $Agente.Comando
        Show-Balao "ACAO NECESSARIA -- $($cfg.projeto)" "$Preview" $true 15000

        if ($AutoSend -and $Agente.AutoSend -and $Agente.Janela -ne "") {
            Send-ParaJanela -Titulo $Agente.Janela -Comando $Agente.Comando -ComEnter $script:ComEnterAtivo | Out-Null
        }
        return
    }

    $agora = (Get-Date)
    if ($ultimoEnvio.ContainsKey($Arquivo)) {
        $diff = ($agora - $ultimoEnvio[$Arquivo]).TotalSeconds
        if ($diff -lt 60) {
            Write-Host "  [cooldown] $($Agente.Nome) - proximo: $([int](60 - $diff))s" -ForegroundColor DarkGray
            return
        }
    }

    [Console]::Beep(880, 150); Start-Sleep -Milliseconds 80; [Console]::Beep(1100, 200)

    if ($AutoSend -and $Agente.AutoSend -and $Agente.Janela -ne "") {
        Write-Host ""
        Write-Host "  [$( Get-Date -Format 'HH:mm:ss' )] NOVA MENSAGEM -> AUTO-SEND" -ForegroundColor Yellow
        Write-Host "  Para   : $($Agente.Nome)" -ForegroundColor Cyan
        Write-Host "  Assunto: $Preview" -ForegroundColor White

        $resultado = Send-ParaJanela -Titulo $Agente.Janela -Comando $Agente.Comando -ComEnter $script:ComEnterAtivo
        switch ($resultado) {
            "ok" {
                $detalhe = if ($script:ComEnterAtivo) { "enviado + Enter" } else { "digitado - pressione Enter" }
                Write-Host "  Status : $detalhe" -ForegroundColor Green
                Write-Host ""
                $ultimoEnvio[$Arquivo] = $agora
                Show-Balao "Auto-send - $($Agente.Nome)" "$Preview`n$detalhe" $false
                return
            }
            "nao_encontrada" { Write-Host "  [!!] Janela '$($Agente.Janela)' nao encontrada" -ForegroundColor DarkYellow }
            "timeout_prompt" { Write-Host "  [!!] Agente nao exibiu prompt em 60s" -ForegroundColor DarkYellow }
            "ativacao_falhou" { Write-Host "  [!!] Nao foi possivel ativar a janela" -ForegroundColor DarkYellow }
        }
    }

    Set-Clipboard -Value $Agente.Comando
    Write-Host ""
    Write-Host "  [$( Get-Date -Format 'HH:mm:ss' )] NOVA MENSAGEM" -ForegroundColor Yellow
    Write-Host "  Para   : $($Agente.Nome)" -ForegroundColor Cyan
    Write-Host "  Assunto: $Preview" -ForegroundColor White
    Write-Host "  Acao   : Ctrl+V no terminal do agente + Enter" -ForegroundColor Green
    Write-Host ""
    $ultimoEnvio[$Arquivo] = $agora
    Show-Balao "$($cfg.projeto) - $($Agente.Nome)" "$Preview`nCtrl+V pronto" $false
}

# ── Marcadores urgentes no canal geral ────────────────────────────────────────
$GERAL_MARCADORES = @('\[SPRINT_', '\[AUTORIZADO:', '\[ALERTA\]', '\[BLOQUEADO\]', '\[DECISAO\]')

# ── Estado inicial ────────────────────────────────────────────────────────────
$ultimaModificacao = @{}
$pendentesNoStartup = @()
$caminhoGeral     = Join-Path $MENSAGENS "geral.md"
$ultimaModGeral   = if (Test-Path $caminhoGeral) { (Get-Item $caminhoGeral).LastWriteTime } else { (Get-Date) }
$ultimoBroadcast  = (Get-Date).AddSeconds(-120)

foreach ($arquivo in $AGENTES.Keys) {
    $caminho = Join-Path $MENSAGENS $arquivo
    if (Test-Path $caminho) {
        $ultimaModificacao[$arquivo] = (Get-Item $caminho).LastWriteTime
        $conteudo = Get-ConteudoMensagens $caminho
        if ($conteudo -match "STATUS:[^\n]*\bNOVO\b") { $pendentesNoStartup += $arquivo }
    }
}

# ── Header ────────────────────────────────────────────────────────────────────
Write-Host ""
Write-Host "  =================================================" -ForegroundColor Magenta
Write-Host "    $($cfg.projeto) -- Watcher de Mensagens" -ForegroundColor Magenta
Write-Host "  =================================================" -ForegroundColor Magenta
if ($AutoSend) {
    $modoEnter = if ($script:ComEnterAtivo) { "Enter automatico" } else { "voce confirma [E para alternar]" }
    Write-Host "  Modo   : AUTO-SEND via Win32" -ForegroundColor Green
    Write-Host "  Enter  : $modoEnter" -ForegroundColor Cyan
    if ($script:IntervaloDiretorAtual -gt 0) {
        Write-Host "  Dir    : wakeup a cada $($script:IntervaloDiretorAtual) min [T para alterar]" -ForegroundColor DarkGray
    }
} else {
    Write-Host "  Modo   : clipboard + notificacao" -ForegroundColor Cyan
    Write-Host "  Dica   : use -AutoSend para envio automatico" -ForegroundColor DarkGray
}
Write-Host "  Tasks  : $MENSAGENS" -ForegroundColor DarkGray
Write-Host "  Ctrl+C para parar" -ForegroundColor DarkGray
Write-Host ""

# ── Pendentes no startup ──────────────────────────────────────────────────────
if ($pendentesNoStartup.Count -gt 0) {
    Write-Host "  +----------------------------------------------+" -ForegroundColor Yellow
    Write-Host "  | MENSAGENS PENDENTES AO INICIAR               |" -ForegroundColor Yellow
    Write-Host "  +----------------------------------------------+" -ForegroundColor Yellow
    Write-Host ""
    $i = 1
    foreach ($arquivo in $pendentesNoStartup) {
        $agente  = $AGENTES[$arquivo]
        $caminho = Join-Path $MENSAGENS $arquivo
        $preview = Get-Assunto $caminho
        if ($agente.Urgente) {
            Write-Host "  [$i] [!!!] $($agente.Nome)" -ForegroundColor Red
            Write-Host "       $preview" -ForegroundColor Yellow
        } else {
            Write-Host "  [$i] $($agente.Nome)" -ForegroundColor Cyan
            Write-Host "       $preview" -ForegroundColor White
        }
        Write-Host ""
        $i++
    }
    [Console]::Beep(880, 200); Start-Sleep -Milliseconds 100; [Console]::Beep(1100, 300)
    $primeiro = $AGENTES[$pendentesNoStartup[0]]
    Set-Clipboard -Value $primeiro.Comando
    Write-Host "  Clipboard: comando do item [1] copiado." -ForegroundColor DarkGray
    Write-Host ""
}

# ── Loop principal ────────────────────────────────────────────────────────────
while ($true) {
    foreach ($arquivo in $AGENTES.Keys) {
        $caminho = Join-Path $MENSAGENS $arquivo
        if (-not (Test-Path $caminho)) { continue }
        $modificado = (Get-Item $caminho).LastWriteTime
        if (-not $ultimaModificacao.ContainsKey($arquivo)) {
            $ultimaModificacao[$arquivo] = $modificado; continue
        }
        if ($modificado -gt $ultimaModificacao[$arquivo]) {
            $ultimaModificacao[$arquivo] = $modificado
            $conteudo = Get-ConteudoMensagens $caminho
            if ($conteudo -match "STATUS:[^\n]*\bNOVO\b") {
                Show-Alerta -Agente $AGENTES[$arquivo] -Preview (Get-Assunto $caminho) -Arquivo $arquivo
            }
        }
    }

    # Monitoramento do geral.md
    if (Test-Path $caminhoGeral) {
        $modGeral = (Get-Item $caminhoGeral).LastWriteTime
        if ($modGeral -gt $ultimaModGeral) {
            $ultimaModGeral  = $modGeral
            $entradaPreview  = Get-UltimaEntradaGeral $caminhoGeral
            $agora           = Get-Date
            Write-Host ""
            Write-Host "  [$( $agora.ToString('HH:mm:ss') )] CANAL GERAL atualizado" -ForegroundColor DarkCyan
            Write-Host "  $entradaPreview" -ForegroundColor White
            Write-Host ""
            $padraoUrgente = $GERAL_MARCADORES -join '|'
            $ehUrgente     = ($entradaPreview -match $padraoUrgente)
            $segundosDesde = ($agora - $ultimoBroadcast).TotalSeconds
            if ($ehUrgente -and $AutoSend -and $segundosDesde -ge 60) {
                $ultimoBroadcast = $agora
                $cmdGeral = "ATENCAO: nova entrada importante em tasks/mensagens/geral.md. Leia antes de continuar."
                Write-Host "  [BROADCAST] Entrada urgente -- notificando agentes..." -ForegroundColor Yellow
                foreach ($kv in $AGENTES.GetEnumerator()) {
                    if ($kv.Value.AutoSend -and $kv.Value.Janela -ne "") {
                        Send-ParaJanela -Titulo $kv.Value.Janela -Comando $cmdGeral -ComEnter $false | Out-Null
                    }
                }
                Write-Host "  Broadcast enviado." -ForegroundColor Green
                Show-Balao "Canal Geral -- $($cfg.projeto)" "Entrada urgente: $entradaPreview" $true 10000
            } elseif (-not $ehUrgente) {
                Show-Balao "Canal Geral -- $($cfg.projeto)" $entradaPreview $false 6000
            }
        }
    }

    # Health check
    if ($AutoSend) {
        $agora = Get-Date
        if (($agora - $ultimoHealthCheck).TotalSeconds -ge $HEALTH_INTERVAL) {
            $ultimoHealthCheck = $agora
            foreach ($kv in $AGENTES.GetEnumerator()) {
                $ag = $kv.Value
                if (-not $ag.AutoSend -or $ag.Janela -eq "") { continue }
                $hwnd = Get-HwndSalvo -NomeJanela $ag.Janela
                if ($hwnd -eq [IntPtr]::Zero) { $hwnd = Get-HwndByPid -NomeJanela $ag.Janela }
                if ($hwnd -ne [IntPtr]::Zero) { continue }
                $podReiniciar = $true
                if ($ultimoRestart.ContainsKey($ag.Janela)) {
                    if (($agora - $ultimoRestart[$ag.Janela]).TotalSeconds -lt $RESTART_COOLDOWN) { $podReiniciar = $false }
                }
                if (-not $podReiniciar) { continue }
                [Console]::Beep(440, 300); Start-Sleep -Milliseconds 100; [Console]::Beep(440, 300)
                Write-Host ""
                Write-Host "  [!!] [$( Get-Date -Format 'HH:mm:ss' )] $($ag.Nome) nao encontrado - reabrindo..." -ForegroundColor Yellow
                $scriptInicio = Join-Path $PSScriptRoot "iniciar-agente.ps1"
                $cmdRestart   = "Set-Location '$RAIZ'; . '$scriptInicio' -Nome '$($ag.Janela)'"
                Start-Process powershell.exe -ArgumentList @("-NoExit", "-Command", $cmdRestart)
                $ultimoRestart[$ag.Janela] = $agora
                Write-Host "  Reiniciando $($ag.Nome) - aguarde ~15s." -ForegroundColor Green
                Write-Host ""
            }
        }
    }

    # Teclas de controle
    while ([Console]::KeyAvailable) {
        $tecla = [Console]::ReadKey($true)
        switch ($tecla.Key.ToString().ToUpper()) {
            "E" {
                $script:ComEnterAtivo = -not $script:ComEnterAtivo
                $novoModo = if ($script:ComEnterAtivo) { "AUTONOMO (Enter automatico)" } else { "MANUAL (voce pressiona Enter)" }
                Write-Host ""; Write-Host "  [E] Enter automatico: $novoModo" -ForegroundColor Cyan; Write-Host ""
            }
            "T" {
                Write-Host ""
                Write-Host "  [T] Alterar intervalo wakeup do Diretor" -ForegroundColor Cyan
                Write-Host "  Atual: $($script:IntervaloDiretorAtual) min | 0 = desativar" -ForegroundColor DarkGray
                Write-Host -NoNewline "  Novo intervalo (minutos): " -ForegroundColor White
                $novoStr = ""
                while ($true) {
                    $k = [Console]::ReadKey($true)
                    if ($k.Key -eq [ConsoleKey]::Enter)     { break }
                    if ($k.Key -eq [ConsoleKey]::Escape)    { $novoStr = ""; break }
                    if ($k.Key -eq [ConsoleKey]::Backspace) {
                        if ($novoStr.Length -gt 0) { $novoStr = $novoStr.Substring(0, $novoStr.Length - 1); Write-Host "`b `b" -NoNewline }
                    } elseif ($k.KeyChar -match '\d') {
                        $novoStr += $k.KeyChar; Write-Host $k.KeyChar -NoNewline
                    }
                }
                Write-Host ""
                if ($novoStr -ne "") {
                    $novoInt = [int]$novoStr
                    $script:IntervaloDiretorAtual = $novoInt
                    if ($novoInt -gt 0) {
                        $proximoWakeupDiretor = (Get-Date).AddMinutes($novoInt)
                        Write-Host "  Intervalo: $novoInt min | Proximo: $($proximoWakeupDiretor.ToString('HH:mm'))" -ForegroundColor Green
                    } else {
                        $proximoWakeupDiretor = [datetime]::MaxValue
                        Write-Host "  Wakeup do Diretor desativado." -ForegroundColor DarkYellow
                    }
                }
                Write-Host ""
            }
        }
    }

    # Wakeup do Diretor
    if ($AutoSend -and $script:IntervaloDiretorAtual -gt 0) {
        $agora = Get-Date
        if ($agora -ge $proximoWakeupDiretor) {
            Write-Host ""
            Write-Host "  [$( $agora.ToString('HH:mm:ss') )] WAKEUP -> AGENTE-DIRETOR ($($script:IntervaloDiretorAtual) min)" -ForegroundColor DarkYellow
            $resultado = Send-ParaJanela -Titulo "AGENTE-DIRETOR" -Comando $wakeupComando -ComEnter $script:ComEnterAtivo
            if ($resultado -eq "ok") { Write-Host "  Wakeup enviado." -ForegroundColor Green }
            else                     { Write-Host "  Falha ao enviar wakeup: $resultado" -ForegroundColor DarkYellow }
            $proximoWakeupDiretor = $agora.AddMinutes($script:IntervaloDiretorAtual)
            Write-Host "  Proximo: $($proximoWakeupDiretor.ToString('HH:mm'))" -ForegroundColor DarkGray
            Write-Host ""
        }
    }

    Start-Sleep -Seconds 3
}
