# «Кладезъ»: проверки компьютера перед установкой (спек Б4, план Задача 5).
# Все функции, кроме Get-KladezSystemFacts, — чистые: факты приходят параметрами.
Set-StrictMode -Version 3

$script:SystemGB = 10
$script:SetGB = [ordered]@{ aptechka = 5; biblioteka = 25; vse = 70 }

function Test-KladezWindowsBuild {
    param([Parameter(Mandatory)][int]$Build)
    if ($Build -lt 19041) {
        return [pscustomobject]@{ Ok = $false; Path = 'unsupported'
            Message = 'Эта версия Windows слишком старая. «Кладезъ» работает на Windows 10 версии 2004 и новее и на Windows 11. Обновите Windows через «Параметры → Обновление и безопасность».' }
    }
    if ($Build -lt 19044) {
        return [pscustomobject]@{ Ok = $true; Path = 'legacy'
            Message = 'Windows 10 старого выпуска: установим встроенным способом. Если не получится, установщик попросит обновить Windows.' }
    }
    [pscustomobject]@{ Ok = $true; Path = 'modern'; Message = 'Версия Windows подходит.' }
}

function Test-KladezMemory {
    param([Parameter(Mandatory)][long]$TotalBytes)
    if ($TotalBytes -lt 4GB) {
        return [pscustomobject]@{ Level = 'fail'; Message = 'На компьютере меньше 4 ГБ оперативной памяти — «Кладезъ» не сможет работать.' }
    }
    if ($TotalBytes -lt 8GB) {
        return [pscustomobject]@{ Level = 'warn'; Message = 'Оперативной памяти меньше 8 ГБ: программа будет работать медленно, а ИИ-помощник не потянет.' }
    }
    [pscustomobject]@{ Level = 'ok'; Message = 'Оперативной памяти достаточно.' }
}

function Test-KladezVirtualization {
    param(
        [Parameter(Mandatory)][bool]$HypervisorPresent,
        [Parameter(Mandatory)][bool]$FirmwareEnabled,
        [Parameter(Mandatory)][bool]$Slat
    )
    # When Hyper-V/WSL2 already runs, Windows reports the firmware flag as false.
    if ($HypervisorPresent) { return 'ok' }
    if (-not $FirmwareEnabled) { return 'bios-off' }
    if (-not $Slat) { return 'no-slat' }
    'ok'
}

function Get-KladezDriveChoices {
    param([Parameter(Mandatory)][AllowEmptyCollection()][object[]]$Drives)
    $fixed = @($Drives | Where-Object { $_.DriveType -eq 3 })
    $result = foreach ($d in $fixed) {
        $freeGB = [math]::Floor([double]$d.FreeBytes / 1GB)
        $fits = @($script:SetGB.Keys | Where-Object { $freeGB -ge ($script:SystemGB + $script:SetGB[$_]) })
        [pscustomobject]@{ Letter = $d.Letter; Label = $d.Label; FreeGB = [long]$freeGB
            Fits = $fits; IsSystem = [bool]$d.IsSystem; IsDefault = $false }
    }
    $result = @($result)
    $pool = @($result | Where-Object { -not $_.IsSystem })
    if ($pool.Count -eq 0) { $pool = $result }
    $best = $pool | Sort-Object FreeGB -Descending | Select-Object -First 1
    if ($best) { $best.IsDefault = $true }
    $result
}

function Get-KladezPortPlan {
    param([AllowEmptyCollection()][int[]]$ListeningPorts = @())
    $plans = @(@(8080, 8090), @(8180, 8190))
    $busy = New-Object System.Collections.Generic.List[int]
    foreach ($p in $plans) {
        $taken = @($p | Where-Object { $ListeningPorts -contains $_ })
        foreach ($t in $taken) { if (-not $busy.Contains($t)) { $busy.Add($t) } }
        if ($taken.Count -eq 0) {
            return [pscustomobject]@{ AdminPort = $p[0]; KiwixPort = $p[1]; Busy = $busy.ToArray() }
        }
    }
    [pscustomobject]@{ AdminPort = $null; KiwixPort = $null; Busy = $busy.ToArray() }
}

function ConvertTo-KladezWslPath {
    param([Parameter(Mandatory, Position = 0)][string]$WindowsPath)
    if ($WindowsPath -notmatch '^([A-Za-z]):\\?(.*)$') {
        throw "Путь должен начинаться с буквы диска: $WindowsPath"
    }
    $rest = $Matches[2] -replace '\\', '/'
    '/mnt/' + $Matches[1].ToLowerInvariant() + $(if ($rest) { '/' + $rest.TrimEnd('/') } else { '' })
}

function Get-KladezSystemFacts {
    $os = Get-CimInstance Win32_OperatingSystem
    $cs = Get-CimInstance Win32_ComputerSystem
    $cpu = @(Get-CimInstance Win32_Processor)[0]
    $sysLetter = $env:SystemDrive.TrimEnd(':')
    $drives = foreach ($d in Get-CimInstance Win32_LogicalDisk) {
        [pscustomobject]@{ Letter = $d.DeviceID.TrimEnd(':'); Label = [string]$d.VolumeName
            FreeBytes = [long]$d.FreeSpace; DriveType = [int]$d.DriveType
            IsSystem = ($d.DeviceID.TrimEnd(':') -eq $sysLetter) }
    }
    $ports = @()
    try { $ports = @(Get-NetTCPConnection -State Listen -ErrorAction Stop | Select-Object -ExpandProperty LocalPort -Unique) } catch { }
    [pscustomobject]@{
        Build = [int]$os.BuildNumber
        TotalMemoryBytes = [long]$cs.TotalPhysicalMemory
        HypervisorPresent = [bool]$cs.HypervisorPresent
        FirmwareEnabled = [bool]$cpu.VirtualizationFirmwareEnabled
        Slat = [bool]$cpu.SecondLevelAddressTranslationExtensions
        ListeningPorts = [int[]]$ports
        Drives = @($drives)
    }
}

Export-ModuleMember -Function Test-KladezWindowsBuild, Test-KladezMemory, Test-KladezVirtualization,
    Get-KladezDriveChoices, Get-KladezPortPlan, ConvertTo-KladezWslPath, Get-KladezSystemFacts
