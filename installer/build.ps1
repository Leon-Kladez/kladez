# «Кладезъ»: сборка установщика на Windows из готовых артефактов (план Задача 9).
#
#   build.ps1                    — проверить вложения и собрать dist\Кладезъ-установка-<версия>.exe
#   build.ps1 -UpdateOnly        — собрать файл обновления без интернета (только образы и скрипты)
#   build.ps1 -SkipCompile       — только проверить вложения и контрольные суммы
#   build.ps1 -Download          — докачать недостающие файлы из vendor.lock (большие: ~370 МБ)
#   build.ps1 -UpdateLock        — скачать файлы с хешем PENDING и вписать их хеш в vendor.lock
#
# Ожидает в dist\: Kladez.exe (build-launcher.ps1), kladez-rootfs.tar.gz и kladez-images.tar.zst
# с файлами .sha256 рядом (собираются в CI на Linux: installer/linux/build-*.sh).
param(
    [string]$Version = '0.1.0',
    [switch]$UpdateOnly,
    [switch]$SkipCompile,
    [switch]$Download,
    [switch]$UpdateLock,
    [string]$DistDir = (Join-Path $PSScriptRoot '..\dist'),
    [string]$VendorDir = (Join-Path $PSScriptRoot '..\vendor'),
    [string]$Iscc
)
$ErrorActionPreference = 'Stop'
Import-Module (Join-Path $PSScriptRoot 'Kladez.Build.psm1') -Force
$repo = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$lockPath = Join-Path $PSScriptRoot 'windows\vendor.lock'
New-Item -ItemType Directory -Force -Path $DistDir, $VendorDir | Out-Null
$DistDir = (Resolve-Path $DistDir).Path
$VendorDir = (Resolve-Path $VendorDir).Path
$vendor = @(Read-KladezVendorLock -Path $lockPath)

if ($Download -or $UpdateLock) {
    foreach ($v in $vendor) {
        $target = Join-Path $VendorDir $v.Name
        if (($v.Sha256 -eq 'pending' -and $UpdateLock) -or ($Download -and -not (Test-Path $target))) {
            Write-Output "Скачиваю $($v.Name)…"
            Invoke-WebRequest -Uri $v.Url -OutFile $target -UseBasicParsing
        }
        if ($UpdateLock -and $v.Sha256 -eq 'pending') {
            $hash = (Get-FileHash $target -Algorithm SHA256).Hash.ToLowerInvariant()
            $text = [IO.File]::ReadAllText($lockPath)
            $text = $text.Replace("$($v.Url) sha256:PENDING", "$($v.Url) sha256:$hash")
            [IO.File]::WriteAllText($lockPath, $text, (New-Object System.Text.UTF8Encoding($false)))
            Write-Output "Закреплён хеш $($v.Name): $hash"
        }
    }
    $vendor = @(Read-KladezVendorLock -Path $lockPath)
}

$inputs = @(Get-KladezBuildInputs -DistDir $DistDir -VendorDir $VendorDir -Vendor $vendor -UpdateOnly:$UpdateOnly)
Test-KladezBuildInputs -Inputs $inputs
Write-Output "Все вложения на месте, контрольные суммы совпали ($($inputs.Count) файлов)."
if ($SkipCompile) { return }

if (-not $Iscc) {
    $Iscc = @("${env:ProgramFiles(x86)}\Inno Setup 6\ISCC.exe", "$env:ProgramFiles\Inno Setup 6\ISCC.exe",
        "$env:LOCALAPPDATA\Programs\Inno Setup 6\ISCC.exe") | Where-Object { Test-Path $_ } | Select-Object -First 1
}
if (-not $Iscc) { throw 'Не найден компилятор Inno Setup 6 (ISCC.exe). Укажите путь: -Iscc <путь>.' }

$defines = @("/DAppVersion=$Version", "/DRepoRoot=$repo", "/DDist=$DistDir", "/DVendor=$VendorDir")
if ($UpdateOnly) { $defines += '/DUpdateOnly' }
& $Iscc /Qp @defines (Join-Path $PSScriptRoot 'windows\kladez.iss')
if ($LASTEXITCODE -ne 0) { throw "Inno Setup завершился с ошибкой $LASTEXITCODE." }

$exe = Get-ChildItem $DistDir -Filter 'Кладезъ-*.exe' | Sort-Object LastWriteTime -Descending | Select-Object -First 1
$sums = Get-ChildItem $DistDir -Filter 'Кладезъ-*.exe' | ForEach-Object {
    '{0}  {1}' -f (Get-FileHash $_.FullName -Algorithm SHA256).Hash.ToLowerInvariant(), $_.Name
}
[IO.File]::WriteAllLines((Join-Path $DistDir 'SHA256SUMS.txt'), [string[]]$sums, (New-Object System.Text.UTF8Encoding($false)))
Write-Output ("Готово: {0} ({1:N0} МБ)" -f $exe.Name, ($exe.Length / 1MB))
