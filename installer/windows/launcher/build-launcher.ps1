# «Кладезъ»: сборка Kladez.exe компилятором из .NET Framework 4.8 (план Задача 8).
#   build-launcher.ps1 -Test   — собрать и запустить тесты LauncherCore
#   build-launcher.ps1         — собрать dist\Kladez.exe
param(
    [switch]$Test,
    [string]$OutDir = (Join-Path $PSScriptRoot '..\..\..\dist')
)
$ErrorActionPreference = 'Stop'
$csc = Join-Path $env:WINDIR 'Microsoft.NET\Framework64\v4.0.30319\csc.exe'
if (-not (Test-Path $csc)) { throw "Не найден компилятор C#: $csc" }
New-Item -ItemType Directory -Force -Path $OutDir | Out-Null
$OutDir = (Resolve-Path $OutDir).Path
$src = $PSScriptRoot
$common = @('/nologo', '/codepage:65001', '/optimize+', '/warnaserror+', '/platform:anycpu')

if ($Test) {
    $exe = Join-Path $OutDir 'LauncherTests.exe'
    & $csc @common '/target:exe' "/out:$exe" (Join-Path $src 'LauncherCore.cs') (Join-Path $src 'LauncherTests.cs')
    if ($LASTEXITCODE -ne 0) { throw 'Тесты не скомпилировались.' }
    & $exe
    exit $LASTEXITCODE
}

$exe = Join-Path $OutDir 'Kladez.exe'
$refs = '/reference:System.Windows.Forms.dll', '/reference:System.Drawing.dll', '/reference:System.IO.Compression.dll', '/reference:System.IO.Compression.FileSystem.dll'
& $csc @common '/target:winexe' "/win32icon:$(Join-Path $src 'kladez.ico')" @refs "/out:$exe" `
    (Join-Path $src 'LauncherCore.cs') (Join-Path $src 'Program.cs')
if ($LASTEXITCODE -ne 0) { throw 'Kladez.exe не собрался.' }
Write-Output "built $exe"
