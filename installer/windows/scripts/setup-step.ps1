# «Кладезъ»: один шаг установки, вызывается из Inno Setup (план Задача 6).
# Коды выхода: 0 — готово, 3010 — нужна перезагрузка, 1 — ошибка (текст по-русски в stdout и в журнале).
param(
    [Parameter(Mandatory)][ValidateSet('features', 'wsl', 'integrate', 'distro', 'firstrun', 'upgrade', 'activate')][string]$Step,
    [string]$LauncherPath,
    [string]$NetScriptPath,
    [string]$UserId,
    [string]$FallbackUserId,      # COMPUTER\user of the elevated process — last resort
    [string]$WindowsPathKind = 'modern',   # modern | legacy (из checks.ps1)
    [string]$WslMsi,
    [string]$LegacyKernelMsi,
    [string]$SystemDir,
    [string]$RootfsPath,
    [string]$BundlePath,
    [string]$LibraryDir,
    [string]$LinuxDir,          # payload\linux: new kladez-start, images.lock, compose template (upgrade)
    [int]$AdminPort = 8080,
    [int]$KiwixPort = 8090,
    [string]$IniPath = (Join-Path $env:ProgramData 'Kladez\kladez.ini'),
    [string]$LogDir = (Join-Path $env:ProgramData 'Kladez\logs')
)
$ErrorActionPreference = 'Stop'
Import-Module (Join-Path $PSScriptRoot 'Kladez.Checks.psm1') -Force
Import-Module (Join-Path $PSScriptRoot 'Kladez.Wsl.psm1') -Force

$log = Join-Path $LogDir 'setup.log'
function Write-StepLog([string]$text) { Write-KladezLog -Path $log -Tag $Step -Text $text }

try {
    $result = switch ($Step) {
        'features' { Enable-KladezFeatures }
        'wsl' {
            Set-KladezWslOobeDone   # no «Welcome to WSL» window (same account when elevated by its owner)
            $state = Get-KladezWslState
            switch (Get-KladezInstallAction -Path $WindowsPathKind -FeaturesEnabled $state.FeaturesEnabled -WslVersion $state.WslVersion) {
                'enable-features' { Enable-KladezFeatures }
                'install-wsl-msi' { Install-KladezWslPackage -MsiPath $WslMsi }
                'install-legacy-kernel' { Install-KladezWslPackage -MsiPath $LegacyKernelMsi }
                'ready' { 'ok' }
            }
        }
        'integrate' {
            # Autostart, the elevated network task and the firewall rule for phones (spec Б6–Б7).
            Import-Module (Join-Path $PSScriptRoot 'Kladez.Tasks.psm1') -Force
            # Tasks imports Network as a nested module, so its functions are not visible here: import it too.
            Import-Module (Join-Path $PSScriptRoot 'Kladez.Network.psm1') -Force
            $user = Resolve-KladezTaskUser -UserId $UserId -ExplorerOwners @(Get-KladezExplorerOwners) `
                -SessionId (Get-Process -Id $PID).SessionId -Fallback $FallbackUserId
            if (-not $user) {
                throw 'Не удалось определить пользователя Windows для автозапуска. Войдите в Windows под своей учётной записью и запустите установщик ещё раз.'
            }
            Write-StepLog "task user: $user (from installer: '$UserId')"
            Register-KladezTasks -LauncherPath $LauncherPath -NetScriptPath $NetScriptPath -UserId $user
            New-KladezFirewallRule -Ports @($AdminPort, $KiwixPort)
            'ok'
        }
        'distro' { Set-KladezWslOobeDone; New-Item -ItemType Directory -Force -Path $SystemDir | Out-Null; Install-KladezDistro -SystemDir $SystemDir -RootfsPath $RootfsPath }
        'firstrun' {
            New-Item -ItemType Directory -Force -Path $LibraryDir | Out-Null
            [void](Invoke-KladezFirstRun -BundlePath $BundlePath -LibraryDir $LibraryDir -AdminPort $AdminPort -KiwixPort $KiwixPort)
            'ok'
        }
        'upgrade' {
            Update-KladezDistroFiles -LinuxDir $LinuxDir
            [void](Invoke-KladezUpgrade -BundlePath $BundlePath)
            'ok'
        }
        'activate' {
            # After firstrun/upgrade: phones and keepalive now, not at the next logon. Never fails the install.
            Import-Module (Join-Path $PSScriptRoot 'Kladez.Tasks.psm1') -Force
            $lib = $LibraryDir
            if (-not $lib -and (Test-Path -LiteralPath $IniPath)) {
                foreach ($line in [IO.File]::ReadAllLines($IniPath)) {
                    if ($line -match '^\s*LibraryDir\s*=\s*(.*)$') { $lib = $Matches[1].Trim() }
                }
            }
            Write-StepLog (Start-KladezTasks -LibraryDir $lib)
            'ok'
        }
    }
    Write-StepLog "result: $result"
    if ($result -eq 'reboot') { exit 3010 }
    exit 0
} catch {
    $msg = $_.Exception.Message
    Write-StepLog "ERROR: $msg"
    if ($Step -in 'firstrun', 'upgrade') {
        foreach ($l in @(Get-KladezStartLogTail)) { Write-StepLog "kladez-start.log: $l" }
    }
    Write-Output $msg
    exit 1
}
