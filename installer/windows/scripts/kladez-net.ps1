# «Кладезъ»: переадресация портов для телефонов (задача «Кладезъ — сеть», спек Б6).
# Запускается с повышенными правами через schtasks /run из Kladez.exe при каждом старте.
param(
    [string]$IniPath = (Join-Path $env:ProgramData 'Kladez\kladez.ini'),
    [string]$LogDir = (Join-Path $env:ProgramData 'Kladez\logs')
)
$ErrorActionPreference = 'Stop'
Import-Module (Join-Path $PSScriptRoot 'Kladez.Wsl.psm1') -Force
Import-Module (Join-Path $PSScriptRoot 'Kladez.Network.psm1') -Force

New-Item -ItemType Directory -Force -Path $LogDir | Out-Null
$log = Join-Path $LogDir 'net.log'
function Write-NetLog([string]$text) {
    [IO.File]::AppendAllText($log, ("[{0:yyyy-MM-dd HH:mm:ss}] {1}`r`n" -f (Get-Date), $text), (New-Object System.Text.UTF8Encoding($false)))
}

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
} catch {
    Write-NetLog "ERROR: $($_.Exception.Message)"
    exit 1
}
