# «Кладезъ»: функции сборки установщика (план Задача 9). Используются build.ps1 и тестами.
Set-StrictMode -Version 3

function Read-KladezVendorLock {
    param([Parameter(Mandatory)][string]$Path)
    foreach ($line in [IO.File]::ReadAllLines($Path)) {
        $t = $line.Trim()
        if (-not $t -or $t.StartsWith('#')) { continue }
        $parts = $t -split '\s+'
        if ($parts.Count -ne 3 -or $parts[2] -notmatch '^sha256:(.+)$') { throw "Неверная строка в $Path`: $t" }
        [pscustomobject]@{ Name = $parts[0]; Url = $parts[1]; Sha256 = $Matches[1].ToLowerInvariant() }
    }
}

function Get-KladezSidecarHash {
    param([Parameter(Mandatory)][string]$Path)
    # kladez-rootfs.tar.gz → kladez-rootfs.sha256, kladez-images.tar.zst → kladez-images.sha256
    $base = [IO.Path]::GetFileName($Path) -replace '\.tar\.(gz|zst)$', ''
    $file = Join-Path (Split-Path $Path) "$base.sha256"
    if (-not (Test-Path -LiteralPath $file)) { return $null }
    ((Get-Content -LiteralPath $file -TotalCount 1) -split '\s+')[0].ToLowerInvariant()
}

function Get-KladezBuildInputs {
    param(
        [Parameter(Mandatory)][string]$DistDir,
        [Parameter(Mandatory)][string]$VendorDir,
        [AllowEmptyCollection()][object[]]$Vendor = @(),
        [switch]$UpdateOnly
    )
    $dist = @('Kladez.exe', 'kladez-images.tar.zst')
    if (-not $UpdateOnly) { $dist += 'kladez-rootfs.tar.gz' }
    foreach ($name in $dist) {
        $path = Join-Path $DistDir $name
        $hash = $null
        if ($name -like '*.tar.*' -and (Test-Path -LiteralPath $path)) { $hash = Get-KladezSidecarHash -Path $path }
        [pscustomobject]@{ Name = $name; Path = $path; Sha256 = $hash }
    }
    if (-not $UpdateOnly) {
        foreach ($v in $Vendor) {
            $sha = $null
            if ($v.PSObject.Properties['Sha256']) { $sha = $v.Sha256 }
            [pscustomobject]@{ Name = $v.Name; Path = (Join-Path $VendorDir $v.Name); Sha256 = $sha }
        }
    }
}

function Test-KladezBuildInputs {
    param([Parameter(Mandatory)][object[]]$Inputs)
    foreach ($i in $Inputs) {
        if (-not (Test-Path -LiteralPath $i.Path -PathType Leaf)) { throw "Нет файла для сборки: $($i.Name) ($($i.Path))" }
        if ($i.Sha256 -eq 'pending') { throw "Не закреплена контрольная сумма $($i.Name): запустите build.ps1 -UpdateLock" }
        if ($i.Sha256) {
            $actual = (Get-FileHash -LiteralPath $i.Path -Algorithm SHA256).Hash.ToLowerInvariant()
            if ($actual -ne $i.Sha256) { throw "Контрольная сумма не совпала: $($i.Name) (ожидалась $($i.Sha256), получена $actual)" }
        }
    }
}

Export-ModuleMember -Function Read-KladezVendorLock, Get-KladezSidecarHash, Get-KladezBuildInputs, Test-KladezBuildInputs
