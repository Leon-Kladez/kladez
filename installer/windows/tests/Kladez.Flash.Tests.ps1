# Pester 5+: установка с флешки («Копия на флешку»).
BeforeAll {
    Import-Module (Join-Path $PSScriptRoot '..\scripts\Kladez.Flash.psm1') -Force
}

Describe 'Test-KladezRobocopyOk' {
    It '0–7 — успех' { 0, 1, 2, 3, 7 | ForEach-Object { Test-KladezRobocopyOk -ExitCode $_ | Should -BeTrue } }
    It '8 и больше — ошибка' { 8, 16 | ForEach-Object { Test-KladezRobocopyOk -ExitCode $_ | Should -BeFalse } }
}

Describe 'Copy-KladezFlashLibrary' {
    It 'переносит библиотеку и образы, пропускает недокачанное' {
        $root = Join-Path ([IO.Path]::GetTempPath()) ("kladez-flash-" + [guid]::NewGuid())
        $src = Join-Path $root 'Кладезъ'
        $lib = Join-Path $root 'library'
        New-Item -ItemType Directory -Force -Path (Join-Path $src 'библиотека\maps\pmtiles'), (Join-Path $src 'образы') | Out-Null
        try {
            Set-Content -LiteralPath (Join-Path $src 'библиотека\maps\pmtiles\by_2026-11.pmtiles') -Value 'map'
            Set-Content -LiteralPath (Join-Path $src 'библиотека\maps\pmtiles\x.pmtiles.part') -Value 'half'
            Set-Content -LiteralPath (Join-Path $src 'образы\valhalla.tar.zst') -Value 'img'
            Copy-KladezFlashLibrary -SourceDir $src -LibraryDir $lib | Should -Match '^copied'
            Test-Path (Join-Path $lib 'maps\pmtiles\by_2026-11.pmtiles') | Should -BeTrue
            Test-Path (Join-Path $lib 'maps\pmtiles\x.pmtiles.part') | Should -BeFalse
            Test-Path (Join-Path $lib '.kladez-images\valhalla.tar.zst') | Should -BeTrue
        } finally { Remove-Item -Recurse -Force $root }
    }
    It 'нет папки «библиотека» — понятная ошибка' {
        { Copy-KladezFlashLibrary -SourceDir 'C:\нет-такой-папки' -LibraryDir 'C:\x' } | Should -Throw '*библиотека*'
    }
}
