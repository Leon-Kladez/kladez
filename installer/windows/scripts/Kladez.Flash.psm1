# «Кладезъ»: установка с флешки, сделанной «Копией на флешку» (Kladez.exe --copy-to-usb).
# На флешке рядом с установщиком: библиотека\ (книги, карты, поиск, дороги, модели ИИ), образы\*.tar.zst
# (программы маршрутов и ИИ — их нет в установщике) и библиотека.ini. Интернет не нужен.
Import-Module (Join-Path $PSScriptRoot 'Kladez.Checks.psm1')
Import-Module (Join-Path $PSScriptRoot 'Kladez.Wsl.psm1')

$script:ImagesInLibrary = '.kladez-images'

# robocopy: 0–7 — успех (скопировано, ничего не нужно, лишние файлы и т. п.), 8 и больше — ошибка.
function Test-KladezRobocopyOk {
    param([Parameter(Mandatory)][int]$ExitCode)
    $ExitCode -ge 0 -and $ExitCode -lt 8
}

# Библиотека с флешки — в папку библиотеки; образы программ — в служебную папку библиотеки (оттуда их
# загрузит шаг images, когда Docker уже работает). Прерванный перенос robocopy продолжает.
function Copy-KladezFlashLibrary {
    param(
        [Parameter(Mandatory)][string]$SourceDir,
        [Parameter(Mandatory)][string]$LibraryDir
    )
    $lib = Join-Path $SourceDir 'библиотека'
    if (-not (Test-Path -LiteralPath $lib -PathType Container)) { throw "На флешке нет папки «библиотека»: $SourceDir" }
    New-Item -ItemType Directory -Force -Path $LibraryDir | Out-Null
    $args1 = @($lib, $LibraryDir, '/E', '/J', '/R:2', '/W:5', '/NP', '/NFL', '/NDL', '/NJH', '/XF', '*.part', '*.tmp')
    $r = Invoke-KladezNative -FilePath 'robocopy.exe' -Arguments $args1
    if (-not (Test-KladezRobocopyOk -ExitCode $r.ExitCode)) {
        throw "Не удалось перенести библиотеку с флешки (robocopy $($r.ExitCode)). Проверьте, что флешка вставлена, и запустите установку ещё раз."
    }
    $images = Join-Path $SourceDir 'образы'
    if (Test-Path -LiteralPath $images -PathType Container) {
        $dest = Join-Path $LibraryDir $script:ImagesInLibrary
        $r2 = Invoke-KladezNative -FilePath 'robocopy.exe' -Arguments @($images, $dest, '*.tar.zst', '/J', '/R:2', '/W:5', '/NP', '/NFL', '/NDL', '/NJH')
        if (-not (Test-KladezRobocopyOk -ExitCode $r2.ExitCode)) { throw "Не удалось перенести программы маршрутов и ИИ с флешки (robocopy $($r2.ExitCode))." }
    }
    "copied (robocopy $($r.ExitCode))"
}

# Образы из библиотеки — в Docker «Кладезя»; потом панель перезапускается и сама ставит маршруты и ИИ
# (CopiedLibraryProvider). Не вышло с образом — не страшно: поставится по кнопке, когда будет интернет.
function Import-KladezFlashImages {
    param([Parameter(Mandatory)][string]$LibraryDir)
    $dir = Join-Path $LibraryDir $script:ImagesInLibrary
    if (-not (Test-Path -LiteralPath $dir -PathType Container)) { return 'no images' }
    $loaded = @()
    foreach ($f in @(Get-ChildItem -LiteralPath $dir -Filter '*.tar.zst' -File)) {
        $wsl = ConvertTo-KladezWslPath $f.FullName
        $r = Invoke-KladezWsl -Arguments @('-d', 'Kladez', '-u', 'root', '--', 'sh', '-c', "zstd -dc '$wsl' | docker load")
        if ($r.ExitCode -eq 0) { $loaded += $f.Name; Remove-Item -LiteralPath $f.FullName -Force }
    }
    if ($loaded.Count) {
        [void](Invoke-KladezWsl -Arguments @('-d', 'Kladez', '-u', 'root', '--', 'docker', 'restart', 'nomad_admin'))
    }
    if (-not @(Get-ChildItem -LiteralPath $dir -Force).Count) { Remove-Item -LiteralPath $dir -Force }
    "loaded: $($loaded -join ', ')"
}

Export-ModuleMember -Function Test-KladezRobocopyOk, Copy-KladezFlashLibrary, Import-KladezFlashImages
