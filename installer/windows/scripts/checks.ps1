# «Кладезъ»: проверки для Inno Setup. Пишет строки «тип|поля…» в UTF-8 с BOM
# (Pascal в Inno Setup не разбирает JSON). Формат — план, Задача 5.
param(
    [Parameter(Mandatory)][string]$OutFile,
    [object]$Facts
)
$ErrorActionPreference = 'Stop'
Import-Module (Join-Path $PSScriptRoot 'Kladez.Checks.psm1') -Force
if (-not $Facts) { $Facts = Get-KladezSystemFacts }

$lines = New-Object System.Collections.Generic.List[string]
$b = Test-KladezWindowsBuild -Build $Facts.Build
$lines.Add("build|$(if ($b.Ok) { 'ok' } else { 'fail' })|$($b.Path)|$($b.Message)")
$m = Test-KladezMemory -TotalBytes $Facts.TotalMemoryBytes
$lines.Add("memory|$($m.Level)|$($m.Message)")
$v = Test-KladezVirtualization -HypervisorPresent $Facts.HypervisorPresent -FirmwareEnabled $Facts.FirmwareEnabled -Slat $Facts.Slat
$lines.Add("virt|$v")
$p = Get-KladezPortPlan -ListeningPorts $Facts.ListeningPorts
$lines.Add("ports|$($p.AdminPort)|$($p.KiwixPort)|$(($p.Busy) -join ',')")
foreach ($d in Get-KladezDriveChoices -Drives $Facts.Drives) {
    $label = ([string]$d.Label) -replace '\|', '/'
    $lines.Add("drive|$($d.Letter)|$label|$($d.FreeGB)|$(($d.Fits) -join ',')|$(if ($d.IsDefault) { 'default' } else { '' })")
}
[IO.File]::WriteAllText($OutFile, ($lines -join "`r`n") + "`r`n", (New-Object System.Text.UTF8Encoding($true)))
