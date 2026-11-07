# «Кладезъ»: WSL и дистрибутив Kladez (спек Б4 п.3–7, план Задача 6).
# Only touches the distro named Kladez. Global WSL settings of the user and their other
# distros are never changed (spec Б4 п.4).
Set-StrictMode -Version 3
Import-Module (Join-Path $PSScriptRoot 'Kladez.Checks.psm1')   # ConvertTo-KladezWslPath

$script:DistroName = 'Kladez'
$script:KladezMinWslVersion = [version]'2.0.0'
$script:StartScript = '/usr/local/bin/kladez-start'

function ConvertFrom-WslOutput {
    param([AllowEmptyCollection()][byte[]]$Bytes = @())
    if (-not $Bytes -or $Bytes.Length -eq 0) { return '' }
    if ($Bytes.Length -ge 2 -and $Bytes[0] -eq 0xFF -and $Bytes[1] -eq 0xFE) {
        $text = [Text.Encoding]::Unicode.GetString($Bytes, 2, $Bytes.Length - 2)
    } elseif ($Bytes.Length -ge 3 -and $Bytes[0] -eq 0xEF -and $Bytes[1] -eq 0xBB -and $Bytes[2] -eq 0xBF) {
        $text = [Text.Encoding]::UTF8.GetString($Bytes, 3, $Bytes.Length - 3)
    } else {
        # wsl.exe writes UTF-16LE without BOM unless WSL_UTF8=1 is honoured (new WSL only).
        $zeros = 0
        for ($i = 1; $i -lt $Bytes.Length; $i += 2) { if ($Bytes[$i] -eq 0) { $zeros++ } }
        if ($zeros * 2 -ge [math]::Floor($Bytes.Length / 2)) {
            $text = [Text.Encoding]::Unicode.GetString($Bytes)
        } else {
            $text = [Text.Encoding]::UTF8.GetString($Bytes)
        }
    }
    $text.Replace([string][char]0, '')
}

function Get-KladezWslVersion {
    param([AllowEmptyString()][string]$VersionText = '')
    foreach ($line in $VersionText -split "`r?`n") {
        if ($line -match 'WSL[^0-9]*?(\d+\.\d+\.\d+(\.\d+)?)') { return [version]$Matches[1] }
    }
    $null
}

function Get-KladezInstallAction {
    param(
        [Parameter(Mandatory)][ValidateSet('modern', 'legacy')][string]$Path,
        [Parameter(Mandatory)][bool]$FeaturesEnabled,
        [AllowNull()][version]$WslVersion
    )
    if (-not $FeaturesEnabled) { return 'enable-features' }
    if ($Path -eq 'legacy') { return 'install-legacy-kernel' }
    if ($null -eq $WslVersion -or $WslVersion -lt $script:KladezMinWslVersion) { return 'install-wsl-msi' }
    'ready'
}

function Test-KladezDistroExists {
    param([AllowEmptyString()][string]$ListText = '')
    foreach ($line in $ListText -split "`r?`n") {
        if ($line.Trim() -ieq $script:DistroName) { return $true }
    }
    $false
}

function ConvertTo-KladezArgumentString {
    param([AllowEmptyCollection()][string[]]$Arguments = @())
    $parts = foreach ($a in $Arguments) {
        if ($a -eq '') { '""' }
        elseif ($a -match '[\s"]') { '"' + ($a -replace '(\\*)"', '$1$1\"' -replace '(\\+)$', '$1$1') + '"' }
        else { $a }
    }
    $parts -join ' '
}

# The only place external programs are started; tests mock it.
function Invoke-KladezNative {
    param(
        [Parameter(Mandatory)][string]$FilePath,
        [AllowEmptyCollection()][string[]]$Arguments = @()
    )
    $psi = New-Object System.Diagnostics.ProcessStartInfo
    $psi.FileName = $FilePath
    $psi.Arguments = ConvertTo-KladezArgumentString -Arguments $Arguments
    $psi.UseShellExecute = $false
    $psi.CreateNoWindow = $true
    $psi.RedirectStandardOutput = $true
    $psi.RedirectStandardError = $true
    $psi.EnvironmentVariables['WSL_UTF8'] = '1'
    $p = [System.Diagnostics.Process]::Start($psi)
    $out = New-Object IO.MemoryStream
    $errTask = $p.StandardError.BaseStream.CopyToAsync(($err = New-Object IO.MemoryStream))
    $p.StandardOutput.BaseStream.CopyTo($out)
    $errTask.Wait()
    $p.WaitForExit()
    $text = (ConvertFrom-WslOutput -Bytes $out.ToArray()) + (ConvertFrom-WslOutput -Bytes $err.ToArray())
    [pscustomobject]@{ ExitCode = $p.ExitCode; Output = $text }
}

function Invoke-KladezWsl {
    param([Parameter(Mandatory)][string[]]$Arguments)
    Invoke-KladezNative -FilePath 'wsl.exe' -Arguments $Arguments
}

function Install-KladezDistro {
    param(
        [Parameter(Mandatory)][string]$SystemDir,
        [Parameter(Mandatory)][string]$RootfsPath
    )
    $list = Invoke-KladezWsl -Arguments @('-l', '-q')
    if (Test-KladezDistroExists -ListText $list.Output) { return 'exists' }
    $r = Invoke-KladezWsl -Arguments @('--import', $script:DistroName, $SystemDir, $RootfsPath, '--version', '2')
    if ($r.ExitCode -ne 0) {
        throw "Не удалось установить системный модуль «Кладезъ» (WSL). Подробности: $($r.Output.Trim())"
    }
    # Lets ext4.vhdx shrink after deletions; older WSL lacks the option, which is fine.
    [void](Invoke-KladezWsl -Arguments @('--manage', $script:DistroName, '--set-sparse', 'true'))
    'imported'
}

function Invoke-KladezStart {
    param([Parameter(Mandatory)][string[]]$StartArguments)
    $r = Invoke-KladezWsl -Arguments (@('-d', $script:DistroName, '-u', 'root', '--', $script:StartScript) + $StartArguments)
    if ($r.ExitCode -ne 0) { throw "Не удалось запустить «Кладезъ»: $($r.Output.Trim())" }
    $r
}

function Invoke-KladezFirstRun {
    param(
        [Parameter(Mandatory)][string]$BundlePath,
        [Parameter(Mandatory)][string]$LibraryDir,
        [Parameter(Mandatory)][int]$AdminPort,
        [Parameter(Mandatory)][int]$KiwixPort
    )
    Invoke-KladezStart -StartArguments @('--first-run',
        '--bundle', (ConvertTo-KladezWslPath $BundlePath),
        '--library', (ConvertTo-KladezWslPath $LibraryDir),
        '--admin-port', [string]$AdminPort, '--kiwix-port', [string]$KiwixPort)
}

function Invoke-KladezUpgrade {
    param([Parameter(Mandatory)][string]$BundlePath)
    Invoke-KladezStart -StartArguments @('--upgrade', '--bundle', (ConvertTo-KladezWslPath $BundlePath))
}

function Enable-KladezFeatures {
    $reboot = $false
    foreach ($f in 'Microsoft-Windows-Subsystem-Linux', 'VirtualMachinePlatform') {
        $r = Invoke-KladezNative -FilePath 'dism.exe' -Arguments @('/online', '/enable-feature', "/featurename:$f", '/all', '/norestart')
        if ($r.ExitCode -eq 3010) { $reboot = $true }
        elseif ($r.ExitCode -ne 0) { throw "Не удалось включить компонент Windows «$f» (код $($r.ExitCode))." }
    }
    if ($reboot) { 'reboot' } else { 'ok' }
}

function Install-KladezWslPackage {
    param([Parameter(Mandatory)][string]$MsiPath)
    $r = Invoke-KladezNative -FilePath 'msiexec.exe' -Arguments @('/i', $MsiPath, '/qn', '/norestart')
    switch ($r.ExitCode) {
        0 { 'ok' }
        3010 { 'reboot' }
        default { throw "Не удалось установить WSL из $MsiPath (код $($r.ExitCode))." }
    }
}

# Upgrade: the new scripts and image list must replace the ones baked into the first rootfs,
# otherwise --upgrade re-renders compose from the old images.lock and nothing changes.
function Update-KladezDistroFiles {
    param([Parameter(Mandatory)][string]$LinuxDir)
    $src = ConvertTo-KladezWslPath $LinuxDir
    $copies = @(
        @('-m', '0755', "$src/kladez-start", '/usr/local/bin/kladez-start'),
        @('-D', '-m', '0644', "$src/kladez-lib.sh", '/usr/local/lib/kladez/kladez-lib.sh'),
        @('-m', '0644', "$src/images.lock", '/opt/project-nomad/images.lock'),
        @('-m', '0644', "$src/compose.template.yaml", '/opt/project-nomad/compose.template.yaml')
    )
    foreach ($c in $copies) {
        $r = Invoke-KladezWsl -Arguments (@('-d', $script:DistroName, '-u', 'root', '--', 'install') + $c)
        if ($r.ExitCode -ne 0) { throw "Не удалось обновить файлы «Кладезъ» ($($c[-1])): $($r.Output.Trim())" }
    }
}

# Last lines of kladez-start.log inside the distro (compose and docker output land there), for
# setup.log when a step fails — otherwise the log only says «Не удалось запустить программы».
function Get-KladezStartLogTail {
    param([int]$Lines = 40)
    try {
        $r = Invoke-KladezWsl -Arguments @('-d', $script:DistroName, '-u', 'root', '--', 'tail', '-n', [string]$Lines, '/var/log/kladez-start.log')
        if ($r.ExitCode -ne 0) { return @() }
        @($r.Output -split "`r?`n" | Where-Object { $_.Trim() })
    } catch { @() }
}

function Get-KladezWslState {
    $features = @('Microsoft-Windows-Subsystem-Linux', 'VirtualMachinePlatform') | ForEach-Object {
        (Get-WindowsOptionalFeature -Online -FeatureName $_).State -eq 'Enabled'
    }
    $v = Invoke-KladezWsl -Arguments @('--version')
    [pscustomobject]@{
        FeaturesEnabled = -not ($features -contains $false)
        WslVersion = $(if ($v.ExitCode -eq 0) { Get-KladezWslVersion -VersionText $v.Output } else { $null })
    }
}

# WSL shows its «Welcome to WSL» window (wslsettings OOBE) on the user's first WSL session unless
# HKCU\Software\Microsoft\Windows\CurrentVersion\Lxss has OOBEComplete=1 — microsoft/WSL,
# LxssUserSession.cpp _LaunchOOBEIfNeeded, LXSS_OOBE_COMPLETE_NAME. The window means nothing to our
# users, so we mark it as seen. Only this value of the user's WSL key is touched.
function Set-KladezWslOobeDone {
    param([string]$KeyPath = 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Lxss')
    try {
        if (-not (Test-Path -LiteralPath $KeyPath)) { New-Item -Path $KeyPath -Force | Out-Null }
        Set-ItemProperty -LiteralPath $KeyPath -Name 'OOBEComplete' -Value 1 -Type DWord
    } catch { }
}

Export-ModuleMember -Function ConvertFrom-WslOutput, Get-KladezWslVersion, Get-KladezInstallAction,
    Test-KladezDistroExists, ConvertTo-KladezArgumentString, Invoke-KladezNative, Invoke-KladezWsl,
    Install-KladezDistro, Invoke-KladezFirstRun, Invoke-KladezUpgrade, Enable-KladezFeatures,
    Install-KladezWslPackage, Get-KladezWslState, Update-KladezDistroFiles, Set-KladezWslOobeDone,
    Get-KladezStartLogTail
