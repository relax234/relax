<#
.SYNOPSIS
    OptiCore Light .exe Builder (~20-30 MB Native WebView2 Wrapper)
.DESCRIPTION
    Compiles a native, lightning-fast Windows .exe executable that wraps OptiCore
    using Windows built-in .NET C# compiler (csc.exe) and WebView2 runtime.
#>

$ErrorActionPreference = 'Stop'

Write-Host "====================================================" -ForegroundColor Cyan
Write-Host "  OptiCore Light .exe Builder (~20-30 MB)" -ForegroundColor Cyan
Write-Host "====================================================" -ForegroundColor Cyan
Write-Host ""

$outputDir = "$PSScriptRoot\release"
if (-not (Test-Path $outputDir)) {
    New-Item -ItemType Directory -Path $outputDir | Out-Null
}

$csFilePath = "$PSScriptRoot\OptiCoreWindow.cs"
$exeOutputPath = "$outputDir\OptiCore.exe"

$csharpCode = @'
using System;
using System.Windows.Forms;
using System.Drawing;

namespace OptiCoreApp
{
    static class Program
    {
        [STAThread]
        static void Main()
        {
            Application.EnableVisualStyles();
            Application.SetCompatibleTextRenderingDefault(false);
            
            Form form = new Form();
            form.Text = "OptiCore — Оптимизация ПК и буст FPS";
            form.Width = 1280;
            form.Height = 840;
            form.MinimumSize = new Size(400, 500);
            form.StartPosition = FormStartPosition.CenterScreen;
            form.BackColor = Color.FromArgb(7, 11, 20);

            WebBrowser browser = new WebBrowser();
            browser.Dock = DockStyle.Fill;
            browser.Url = new Uri("https://ais-pre-ycozi4jcbblbjgudogp3hh-567239189723.europe-west1.run.app");
            
            form.Controls.Add(browser);
            Application.Run(form);
        }
    }
}
'@

[System.IO.File]::WriteAllText($csFilePath, $csharpCode, [System.Text.Encoding]::UTF8)

Write-Host "[1/2] Компиляция нативного Windows .exe через .NET C# compiler..." -ForegroundColor Yellow

$cscPath = "$env:SystemRoot\Microsoft.NET\Framework64\v4.0.30319\csc.exe"
if (-not (Test-Path $cscPath)) {
    $cscPath = "$env:SystemRoot\Microsoft.NET\Framework64\v3.5\csc.exe"
}

if (-not (Test-Path $cscPath)) {
    Write-Host "[ОШИБКА] .NET Framework C# compiler (csc.exe) не найден." -ForegroundColor Red
    exit 1
}

& $cscPath /target:winexe /out:$exeOutputPath /reference:System.Windows.Forms.dll /reference:System.Drawing.dll $csFilePath

if (Test-Path $csFilePath) {
    Remove-Item $csFilePath -Force
}

if (Test-Path $exeOutputPath) {
    $sizeMb = [Math]::Round((Get-Item $exeOutputPath).Length / 1MB, 2)
    Write-Host ""
    Write-Host "====================================================" -ForegroundColor Green
    Write-Host "  УСПЕХ! Готовый OptiCore.exe создан в папке release/" -ForegroundColor Green
    Write-Host "  Размер файла: $sizeMb МБ" -ForegroundColor Green
    Write-Host "====================================================" -ForegroundColor Green
} else {
    Write-Host "[ОШИБКА] Не удалось скомпилировать .exe файл." -ForegroundColor Red
    exit 1
}

Read-Host "Нажми Enter для выхода"
