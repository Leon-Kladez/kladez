# «Кладезъ»: один шаг установки, вызывается из Inno Setup (план Задача 6).
# Коды выхода: 0 — готово, 3010 — нужна перезагрузка, 1 — ошибка (текст по-русски в stdout и в журнале).
param(
    [Parameter(Mandatory)][ValidateSet('features', 'wsl', 'distro', 'firstrun', 'upgrade')][string]$Step,
    [string]$WindowsPathKind = 'modern',   # modern | legacy (из checks.ps1)
    [string]$WslMsi,
    [string]$LegacyKernelMsi,
    [string]$SystemDir,
    [string]$RootfsPath,
    [string]$BundlePath,
    [string]$LibraryDir,
    [int]$AdminPort = 8080,
    [int]$KiwixPort = 8090,
    [string]$LogDir = (Join-Path $env:ProgramData 'Kladez\logs')
)
$ErrorActionPreference = 'Stop'
Import-Module (Join-Path $PSScriptRoot 'Kladez.Checks.psm1') -Force
Import-Module (Join-Path $PSScriptRoot 'Kladez.Wsl.psm1') -Force

New-Item -ItemType Directory -Force -Path $LogDir | Out-Null
$log = Join-Path $LogDir 'setup.log'
function Write-StepLog([string]$text) {
    $line = "[{0:yyyy-MM-dd HH:mm:ss}] [{1}] {2}" -f (Get-Date), $Step, $text
    [IO.File]::AppendAllText($log, $line + "`r`n", (New-Object System.Text.UTF8Encoding($false)))
}

try {
    $result = switch ($Step) {
        'features' { Enable-KladezFeatures }
        'wsl' {
            $state = Get-KladezWslState
            switch (Get-KladezInstallAction -Path $WindowsPathKind -FeaturesEnabled $state.FeaturesEnabled -WslVersion $state.WslVersion) {
                'enable-features' { Enable-KladezFeatures }
                'install-wsl-msi' { Install-KladezWslPackage -MsiPath $WslMsi }
                'install-legacy-kernel' { Install-KladezWslPackage -MsiPath $LegacyKernelMsi }
                'ready' { 'ok' }
            }
        }
        'distro' { New-Item -ItemType Directory -Force -Path $SystemDir | Out-Null; Install-KladezDistro -SystemDir $SystemDir -RootfsPath $RootfsPath }
        'firstrun' {
            New-Item -ItemType Directory -Force -Path $LibraryDir | Out-Null
            [void](Invoke-KladezFirstRun -BundlePath $BundlePath -LibraryDir $LibraryDir -AdminPort $AdminPort -KiwixPort $KiwixPort)
            'ok'
        }
        'upgrade' { [void](Invoke-KladezUpgrade -BundlePath $BundlePath); 'ok' }
    }
    Write-StepLog "result: $result"
    if ($result -eq 'reboot') { exit 3010 }
    exit 0
} catch {
    $msg = $_.Exception.Message
    Write-StepLog "ERROR: $msg"
    Write-Output $msg
    exit 1
}
