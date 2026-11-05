# «Кладезъ»: удаление программы, вызывается деинсталлятором Inno Setup (спек Б8).
# Компоненты Windows (WSL, Платформа ВМ) не выключаются — ими могут пользоваться другие программы.
param(
    [Parameter(Mandatory)][ValidateSet('0', '1')][string]$RemoveLibrary,
    [string]$IniPath = (Join-Path $env:ProgramData 'Kladez\kladez.ini')
)
$ErrorActionPreference = 'Stop'
Import-Module (Join-Path $PSScriptRoot 'Kladez.Tasks.psm1') -Force

$ini = @{ AdminPort = '8080'; KiwixPort = '8090'; LibraryDir = '' }
if (Test-Path -LiteralPath $IniPath) {
    foreach ($line in [IO.File]::ReadAllLines($IniPath)) {
        if ($line -match '^\s*([A-Za-z]+)\s*=\s*(.*)$') { $ini[$Matches[1]] = $Matches[2].Trim() }
    }
}
$message = Invoke-KladezUninstall -LibraryDir $ini['LibraryDir'] -Ports @([int]$ini['AdminPort'], [int]$ini['KiwixPort']) -RemoveLibrary ($RemoveLibrary -eq '1')
Write-Output $message
