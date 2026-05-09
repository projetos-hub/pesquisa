<#
.SYNOPSIS
    Diagnose open agent windows.
    Reads config.json and checks HWND/PID for each agent.

.USAGE
    .\scripts-agentes\diagnostico-janelas.ps1
#>

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$RAIZ     = Split-Path $PSScriptRoot -Parent
$CFG_FILE = Join-Path $RAIZ "tasks\.pids\config.json"
$PIDS_DIR = Join-Path $RAIZ "tasks\.pids"

$WIN32_CS = @'
using System;
using System.Runtime.InteropServices;
using System.Text;
public class DiagWin32 {
    public delegate bool EnumWindowsProc(IntPtr hWnd, IntPtr lParam);
    [DllImport("user32.dll")] public static extern bool EnumWindows(EnumWindowsProc f, IntPtr lp);
    [DllImport("user32.dll")] public static extern int  GetWindowText(IntPtr hWnd, StringBuilder sb, int n);
    [DllImport("user32.dll")] public static extern bool IsWindowVisible(IntPtr hWnd);
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
    public static bool IsVisible(IntPtr hWnd) { return IsWindowVisible(hWnd); }
}
'@
Add-Type -TypeDefinition $WIN32_CS

function Get-StatusJanela {
    param([string]$NomeAgente)
    $hwndFile = Join-Path $PIDS_DIR "$NomeAgente.hwnd"
    $pidFile  = Join-Path $PIDS_DIR "$NomeAgente.pid"
    $metodo   = ""
    $hwnd     = [IntPtr]::Zero

    if (Test-Path $hwndFile) {
        try {
            $val  = [long](Get-Content $hwndFile -ErrorAction SilentlyContinue)
            $h    = [IntPtr]::new($val)
            if ([DiagWin32]::IsVisible($h)) { $hwnd = $h; $metodo = "HWND" }
        } catch {}
    }

    if ($hwnd -eq [IntPtr]::Zero -and (Test-Path $pidFile)) {
        try {
            $pid2 = [int](Get-Content $pidFile -ErrorAction SilentlyContinue)
            $proc = Get-Process -Id $pid2 -ErrorAction SilentlyContinue
            if ($proc) { $proc.Refresh(); $hwnd = $proc.MainWindowHandle; $metodo = "PID" }
        } catch {}
    }

    if ($hwnd -eq [IntPtr]::Zero) {
        $hwnd = [DiagWin32]::FindByTitle($NomeAgente)
        if ($hwnd -ne [IntPtr]::Zero) { $metodo = "Title" }
    }

    return @{ Hwnd = $hwnd; Metodo = $metodo }
}

Write-Host ""
Write-Host "  =========================================" -ForegroundColor Magenta
Write-Host "    Diagnostico de Janelas -- Multi-Agent" -ForegroundColor Magenta
Write-Host "  =========================================" -ForegroundColor Magenta
Write-Host ""

if (-not (Test-Path $CFG_FILE)) {
    Write-Host "  [ERRO] config.json nao encontrado em: $CFG_FILE" -ForegroundColor Red
    Write-Host "  Execute instalar.ps1 primeiro." -ForegroundColor DarkGray
    exit 1
}

$cfg = Get-Content $CFG_FILE -Raw | ConvertFrom-Json
Write-Host "  Projeto : $($cfg.projeto)" -ForegroundColor Cyan
Write-Host "  Motor   : $($cfg.motor)" -ForegroundColor Cyan
Write-Host ""

$todos = @()
foreach ($ag in $cfg.agentes) { $todos += $ag.id }
$todos += @("AGENTE-GERENTE", "AGENTE-DIRETOR")

$abertos  = 0
$fechados = 0

foreach ($nome in $todos) {
    $status = Get-StatusJanela -NomeAgente $nome
    if ($status.Hwnd -ne [IntPtr]::Zero) {
        Write-Host "  [OK]  $nome" -ForegroundColor Green -NoNewline
        Write-Host "  (via $($status.Metodo), HWND=$($status.Hwnd.ToInt64()))" -ForegroundColor DarkGray
        $abertos++
    } else {
        Write-Host "  [--]  $nome" -ForegroundColor DarkGray -NoNewline
        Write-Host "  (janela nao encontrada)" -ForegroundColor DarkGray
        $fechados++
    }
}

Write-Host ""
Write-Host "  Resultado: $abertos aberta(s), $fechados fechada(s)" -ForegroundColor $(if ($fechados -eq 0) { "Green" } else { "Yellow" })
Write-Host ""
if ($fechados -gt 0) {
    Write-Host "  Para abrir todas:" -ForegroundColor DarkGray
    Write-Host "    .\scripts-agentes\iniciar-agente.ps1 -Todos" -ForegroundColor White
    Write-Host ""
}
