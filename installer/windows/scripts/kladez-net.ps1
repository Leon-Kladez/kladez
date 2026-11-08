# «Кладезъ»: переадресация портов для телефонов (задача «Кладезъ — сеть», спек Б6).
# Запускается с повышенными правами через schtasks /run из Kladez.exe при каждом старте.
param(
    [string]$IniPath = (Join-Path $env:ProgramData 'Kladez\kladez.ini'),
    [string]$LogDir = (Join-Path $env:ProgramData 'Kladez\logs')
)
$ErrorActionPreference = 'Stop'
Import-Module (Join-Path $PSScriptRoot 'Kladez.Checks.psm1') -Force
Import-Module (Join-Path $PSScriptRoot 'Kladez.Wsl.psm1') -Force
Import-Module (Join-Path $PSScriptRoot 'Kladez.Network.psm1') -Force

$log = Join-Path $LogDir 'net.log'
function Write-NetLog([string]$text) { Write-KladezLog -Path $log -Tag 'net' -Text $text }

try {
    $ini = @{}
    foreach ($line in [IO.File]::ReadAllLines($IniPath)) {
        if ($line -match '^\s*([A-Za-z]+)\s*=\s*(.*)$') { $ini[$Matches[1]] = $Matches[2].Trim() }
    }
    $ports = @([int]$ini['AdminPort'], [int]$ini['KiwixPort'])
    $ip = Get-KladezWslIp -HostnameOutput (Invoke-KladezNative -FilePath 'wsl.exe' -Arguments @('-d', 'Kladez', '-u', 'root', '--', 'hostname', '-I')).Output
    if (-not $ip) { throw 'Не удалось узнать адрес системного модуля «Кладезъ».' }
    $show = Invoke-KladezNative -FilePath 'netsh.exe' -Arguments @('interface', 'portproxy', 'show', 'v4tov4')
    $plan = @(Get-KladezPortProxyPlan -WslIp $ip -Ports $ports -Existing @(ConvertFrom-KladezPortProxyShow -Text $show.Output))
    foreach ($cmd in $plan) {
        $r = Invoke-KladezNative -FilePath 'netsh.exe' -Arguments $cmd
        Write-NetLog "netsh $($cmd -join ' ') → $($r.ExitCode)"
    }
    Write-NetLog "ok: $ip, ports $($ports -join ','), changes: $($plan.Count)"
    # Адреса компьютера в домашней сети — панели для QR-кода «Открыть на телефоне». Не вышло — телефоны
    # всё равно работают, просто без QR-кода, поэтому только пишем в журнал.
    try {
        # Сразу после включения компьютера задача стартует раньше, чем подключится Wi-Fi:
        # адреса ещё нет, и QR-код пропал бы до следующего запуска. Ждём сеть до 3 минут.
        $lan = @()
        for ($try = 0; $try -lt 19; $try++) {
            $lan = @(Get-KladezLanAddress -Adapters @(Get-NetAdapter -Physical -ErrorAction Stop) `
                -Addresses @(Get-NetIPAddress -AddressFamily IPv4 -ErrorAction Stop))
            if ($lan.Count) { break }
            if ($try -eq 0) { Write-NetLog 'lan: no address yet, waiting for the network' }
            Start-Sleep -Seconds 10
        }
        $mem = 0L; $disks = @()
        try { $mem = Get-KladezInstalledMemory -VisibleBytes 0 } catch { }
        try { $disks = @(Get-KladezHostDisk -LogicalDisks @(Get-CimInstance Win32_LogicalDisk -ErrorAction Stop)) } catch { }
        $json = ConvertTo-KladezNetworkJson -Addresses $lan -AdminPort ([int]$ini['AdminPort']) -MemoryBytes $mem -Disks $disks
        $file = Write-KladezNetworkFile -LibraryDir $ini['LibraryDir'] -Json $json
        Write-NetLog "lan: $(@($lan | ForEach-Object { $_.ip }) -join ', ') → $file"
    } catch {
        Write-NetLog "lan ERROR: $($_.Exception.Message)"
    }
} catch {
    Write-NetLog "ERROR: $($_.Exception.Message)"
    exit 1
}
