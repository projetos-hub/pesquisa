<#
.SYNOPSIS
    Opens each agent in an independent PowerShell window and sends
    the persona prompt automatically when the AI engine is ready.

.USAGE
    .\scripts-agentes\iniciar-agente.ps1 -Nome AGENTE-1
    .\scripts-agentes\iniciar-agente.ps1 -Todos
    .\scripts-agentes\iniciar-agente.ps1 -Todos -SemPrompt
    .\scripts-agentes\iniciar-agente.ps1 -Todos -IniciarWatcher
    .\scripts-agentes\iniciar-agente.ps1 -Todos -IniciarChat
#>

param(
    [string]$Nome         = "",
    [switch]$Todos,
    [switch]$SemPrompt,
    [switch]$IniciarWatcher,
    [switch]$IniciarChat
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$RAIZ     = Split-Path $PSScriptRoot -Parent
$CFG_FILE = Join-Path $RAIZ "tasks\.pids\config.json"
$PIDS_DIR = Join-Path $RAIZ "tasks\.pids"

if (-not (Test-Path $CFG_FILE)) {
    Write-Host "  [ERRO] config.json nao encontrado: $CFG_FILE" -ForegroundColor Red
    Write-Host "  Execute instalar.ps1 primeiro." -ForegroundColor DarkGray
    exit 1
}

$cfg    = Get-Content $CFG_FILE -Raw | ConvertFrom-Json
$Engine = $cfg.motor
if (-not $Engine) { $Engine = "Claude" }

# ── Cores por posicao (tecnico 1-5, gerente, diretor) ─────────────────────────
$CORES_PADRAO = @("DarkBlue","DarkGreen","DarkRed","DarkCyan","DarkYellow")

$CORES   = @{}
$PROMPTS = @{}

$idx = 0
foreach ($ag in $cfg.agentes) {
    $cor = if ($ag.cor) { $ag.cor } else { $CORES_PADRAO[$idx % $CORES_PADRAO.Count] }
    $CORES[$ag.id]   = $cor
    $PROMPTS[$ag.id] = "Leia tasks/personas/$($ag.id).md e assuma o papel descrito. Siga a sequencia de leitura antes de qualquer acao."
    $idx++
}
$CORES["AGENTE-GERENTE"]   = "DarkMagenta"
$CORES["AGENTE-DIRETOR"]   = "Black"
$PROMPTS["AGENTE-GERENTE"] = "Leia tasks/personas/AGENTE-GERENTE.md e assuma o papel descrito. Siga a sequencia de leitura antes de qualquer acao."
$PROMPTS["AGENTE-DIRETOR"] = "Leia tasks/personas/AGENTE-DIRETOR.md e assuma o papel descrito. Siga a sequencia de leitura antes de qualquer acao."

$TODOS_IDS = @()
foreach ($ag in $cfg.agentes) { $TODOS_IDS += $ag.id }
$TODOS_IDS += @("AGENTE-GERENTE", "AGENTE-DIRETOR")

# ── Win32 (definido fora de qualquer bloco para PS5.1) ────────────────────────
$WIN32_CS = @'
using System;
using System.Runtime.InteropServices;
using System.Text;
public class IniciarWin32 {
    public delegate bool EnumWindowsProc(IntPtr hWnd, IntPtr lParam);
    [DllImport("user32.dll")] public static extern bool EnumWindows(EnumWindowsProc f, IntPtr lp);
    [DllImport("user32.dll")] public static extern int  GetWindowText(IntPtr hWnd, StringBuilder sb, int n);
    [DllImport("user32.dll")] public static extern bool IsWindowVisible(IntPtr hWnd);
    [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr hWnd);
    [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr hWnd, int nCmd);
    [DllImport("user32.dll")] public static extern bool BringWindowToTop(IntPtr hWnd);
    [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
    [DllImport("user32.dll")] public static extern bool AllowSetForegroundWindow(int dwProcessId);
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
    public static bool Ativar(IntPtr hWnd) {
        AllowSetForegroundWindow(-1);
        ShowWindow(hWnd, 9);
        BringWindowToTop(hWnd);
        SetForegroundWindow(hWnd);
        return GetForegroundWindow() == hWnd;
    }
}
'@
Add-Type -TypeDefinition $WIN32_CS
Add-Type -AssemblyName System.Windows.Forms

$uiaOk = $false
try {
    Add-Type -AssemblyName UIAutomationClient
    Add-Type -AssemblyName UIAutomationTypes
    $uiaOk = $true
} catch {}

# ── Funcoes ───────────────────────────────────────────────────────────────────
function Wait-JanelaAbrir {
    param([string]$TituloEsperado, [int]$TimeoutSeg = 30)
    $fim = (Get-Date).AddSeconds($TimeoutSeg)
    Write-Host "    aguardando janela '$TituloEsperado'..." -NoNewline -ForegroundColor DarkGray
    while ((Get-Date) -lt $fim) {
        $hwnd = [IniciarWin32]::FindByTitle($TituloEsperado)
        if ($hwnd -ne [IntPtr]::Zero) {
            Write-Host " encontrada" -ForegroundColor Green
            return $hwnd
        }
        Write-Host "." -NoNewline -ForegroundColor DarkGray
        Start-Sleep -Milliseconds 500
    }
    Write-Host " timeout" -ForegroundColor Red
    return [IntPtr]::Zero
}

function Wait-EnginePrompt {
    param([IntPtr]$Hwnd, [int]$TimeoutSeg = 30)
    $esperaFixa = if ($Engine -eq "Gemini") { 12 } else { 6 }
    if (-not $uiaOk) {
        Write-Host "    aguardando $Engine carregar ($($esperaFixa)s)..." -NoNewline -ForegroundColor DarkGray
        Start-Sleep -Seconds $esperaFixa
        Write-Host " ok" -ForegroundColor Green
        return $true
    }
    $fim        = (Get-Date).AddSeconds($TimeoutSeg)
    $semPattern = 0
    Write-Host "    aguardando prompt $Engine..." -NoNewline -ForegroundColor DarkGray
    while ((Get-Date) -lt $fim) {
        try {
            $elem    = [System.Windows.Automation.AutomationElement]::FromHandle($Hwnd)
            $pattern = $null
            try {
                $pattern = $elem.GetCurrentPattern(
                    [System.Windows.Automation.TextPattern]::Pattern
                ) -as [System.Windows.Automation.TextPattern]
            } catch {}
            if ($null -ne $pattern) {
                $semPattern = 0
                $texto = $pattern.DocumentRange.GetText(-1)
                if ($texto -match "[>]+\s*$" -or $texto -match "Welcome" -or $texto -match "Claude Code" -or $texto -match "Gemini") {
                    if ($Engine -eq "Gemini") { Start-Sleep -Seconds 2 }
                    Write-Host " pronto" -ForegroundColor Green
                    return $true
                }
            } else {
                $semPattern++
                if ($semPattern -ge 3) {
                    Write-Host " (sem TextPattern, aguardando $($esperaFixa)s)..." -NoNewline -ForegroundColor DarkGray
                    Start-Sleep -Seconds $esperaFixa
                    Write-Host " ok" -ForegroundColor Green
                    return $true
                }
            }
        } catch { $semPattern++ }
        Write-Host "." -NoNewline -ForegroundColor DarkGray
        Start-Sleep -Seconds 2
    }
    Write-Host " timeout - enviando mesmo assim" -ForegroundColor DarkYellow
    return $true
}

function Send-PromptInicial {
    param([IntPtr]$Hwnd, [string]$Prompt)
    Start-Sleep -Milliseconds 500
    $ativou = [IniciarWin32]::Ativar($Hwnd)
    if (-not $ativou) {
        Write-Host "    [aviso] foreground check falhou - tentando mesmo assim..." -ForegroundColor DarkYellow
    }
    Start-Sleep -Milliseconds 500
    $clipAnterior = $null
    try { $clipAnterior = [System.Windows.Forms.Clipboard]::GetText() } catch {}
    [System.Windows.Forms.Clipboard]::SetText($Prompt)
    Start-Sleep -Milliseconds 150
    [System.Windows.Forms.SendKeys]::SendWait("^v")
    Start-Sleep -Milliseconds 200
    [System.Windows.Forms.SendKeys]::SendWait("{ENTER}")
    Start-Sleep -Milliseconds 300
    try {
        if ($null -ne $clipAnterior -and $clipAnterior -ne "") {
            [System.Windows.Forms.Clipboard]::SetText($clipAnterior)
        }
    } catch {}
    return $true
}

function Start-Agente {
    param([string]$NomeAgente)
    $prompt = $PROMPTS[$NomeAgente]
    if (-not $prompt) {
        Write-Host "  [!!] Agente desconhecido: $NomeAgente" -ForegroundColor Red
        Write-Host "  IDs validos: $($TODOS_IDS -join ', ')" -ForegroundColor DarkGray
        return
    }
    Write-Host ""
    Write-Host "  [$NomeAgente]" -ForegroundColor Cyan
    $cor = if ($CORES[$NomeAgente]) { $CORES[$NomeAgente] } else { "DarkCyan" }
    $engineCmd = if ($Engine -eq "Gemini") { "gemini" } else { "claude" }
    $cmd = "`$host.UI.RawUI.BackgroundColor = '$cor'; `$host.UI.RawUI.ForegroundColor = 'White'; " +
           "`$host.UI.RawUI.WindowTitle = '$NomeAgente'; Clear-Host; Set-Location '$RAIZ'; $engineCmd"
    $proc = Start-Process powershell.exe -ArgumentList @("-NoExit", "-Command", $cmd) -PassThru
    $proc.Id | Out-File (Join-Path $PIDS_DIR "$NomeAgente.pid") -Encoding ascii
    Write-Host "    janela iniciada (PID $($proc.Id), fundo $cor)" -ForegroundColor DarkGray
    if ($SemPrompt) {
        Write-Host "    (-SemPrompt ativo)" -ForegroundColor DarkGray
        return
    }
    $hwnd = Wait-JanelaAbrir -TituloEsperado $NomeAgente -TimeoutSeg 30
    if ($hwnd -eq [IntPtr]::Zero) {
        Write-Host "    [!!] janela nao encontrada - envie o prompt manualmente" -ForegroundColor Red
        return
    }
    $hwnd.ToInt64() | Out-File (Join-Path $PIDS_DIR "$NomeAgente.hwnd") -Encoding ascii
    Wait-EnginePrompt -Hwnd $hwnd -TimeoutSeg 30 | Out-Null
    $ok = Send-PromptInicial -Hwnd $hwnd -Prompt $prompt
    if ($ok) {
        Write-Host "    prompt enviado" -ForegroundColor Green
        Write-Host "    '$( $prompt.Substring(0, [Math]::Min(60, $prompt.Length)) )...'" -ForegroundColor DarkGray
    }
    Start-Sleep -Seconds 2
}

# ── Header ────────────────────────────────────────────────────────────────────
Write-Host ""
Write-Host "  =================================================" -ForegroundColor Magenta
Write-Host "    Iniciar Agentes -- $($cfg.projeto)" -ForegroundColor Magenta
Write-Host "  =================================================" -ForegroundColor Magenta
Write-Host "  Engine       : $Engine" -ForegroundColor Cyan
Write-Host "  UIAutomation : $(if ($uiaOk) { 'disponivel' } else { 'indisponivel (espera fixa)' })" -ForegroundColor DarkGray
Write-Host "  Prompt auto  : $(if ($SemPrompt) { 'desativado' } else { 'ativado' })" -ForegroundColor DarkGray
Write-Host ""

# ── Execucao ──────────────────────────────────────────────────────────────────
if ($Todos) {
    Write-Host "  Dica: nao clique nas janelas enquanto o script estiver rodando." -ForegroundColor DarkYellow
    Write-Host ""
    foreach ($n in $TODOS_IDS) { Start-Agente -NomeAgente $n }
    Write-Host ""
    Write-Host "  Todos os agentes iniciados." -ForegroundColor Green
    if ($IniciarChat) {
        Write-Host ""
        Write-Host "  Iniciando chat-view..." -ForegroundColor Cyan
        $chatCmd = "Set-Location '$RAIZ'; & '$PSScriptRoot\chat-view.ps1'"
        Start-Process powershell.exe -ArgumentList @("-NoExit", "-Command", $chatCmd)
        Write-Host "  Chat-view aberto." -ForegroundColor Green
    }
    if ($IniciarWatcher) {
        Write-Host ""
        Write-Host "  Iniciando watcher (-AutoSend)..." -ForegroundColor Cyan
        Write-Host "  (esta janela vira o watcher - Ctrl+C para parar)" -ForegroundColor DarkGray
        Write-Host ""
        & "$PSScriptRoot\watch-mensagens.ps1" -AutoSend
    } elseif (-not $IniciarChat) {
        Write-Host "  Diagnostico : .\scripts-agentes\diagnostico-janelas.ps1" -ForegroundColor DarkGray
        Write-Host "  Watcher     : .\scripts-agentes\watch-mensagens.ps1 -AutoSend" -ForegroundColor DarkGray
        Write-Host "  Chat        : .\scripts-agentes\chat-view.ps1" -ForegroundColor DarkGray
        Write-Host "  Tudo junto  : .\scripts-agentes\iniciar-agente.ps1 -Todos -IniciarWatcher -IniciarChat" -ForegroundColor DarkGray
    }
} elseif ($Nome -ne "") {
    if (-not $PROMPTS.ContainsKey($Nome)) {
        Write-Host "  [!!] ID invalido: $Nome" -ForegroundColor Red
        Write-Host "  Validos: $($TODOS_IDS -join ', ')" -ForegroundColor DarkGray
    } else {
        Write-Host "  Dica: nao clique na janela enquanto o script estiver rodando." -ForegroundColor DarkYellow
        Write-Host ""
        Start-Agente -NomeAgente $Nome
    }
} else {
    Write-Host "  Uso:" -ForegroundColor Yellow
    Write-Host "    .\scripts-agentes\iniciar-agente.ps1 -Nome AGENTE-1" -ForegroundColor White
    Write-Host "    .\scripts-agentes\iniciar-agente.ps1 -Todos" -ForegroundColor White
    Write-Host "    .\scripts-agentes\iniciar-agente.ps1 -Todos -IniciarWatcher -IniciarChat" -ForegroundColor White
    Write-Host ""
    Write-Host "  IDs: $($TODOS_IDS -join ', ')" -ForegroundColor DarkGray
}
Write-Host ""
