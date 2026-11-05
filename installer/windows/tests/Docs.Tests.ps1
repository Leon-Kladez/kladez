# Pester 5+: инструкции с картинками (спек Б10, план Задача 10).
BeforeDiscovery {
    $docs = @(
        @{ name = 'bios'; path = (Join-Path $PSScriptRoot '..\docs\bios\index.html') },
        @{ name = 'smartscreen'; path = (Join-Path $PSScriptRoot '..\docs\smartscreen\index.html') }
    )
}

Describe 'instruction page <name>' -ForEach $docs {
    BeforeAll {
        $html = [IO.File]::ReadAllText($path, [Text.Encoding]::UTF8)
        $dir = Split-Path $path
    }
    It 'exists and is in Russian' {
        $html | Should -Match '<html lang="ru"'
        $html | Should -Match '<meta charset="utf-8">'
    }
    It 'loads nothing from the internet (works offline)' {
        $html | Should -Not -Match '(src|href)\s*=\s*"https?://'
        $html | Should -Not -Match '@import\s+url\(\s*["'']?https?://'
    }
    It 'every <img> exists next to the page and has alt text' {
        foreach ($m in [regex]::Matches($html, '<img\b[^>]*>')) {
            $m.Value | Should -Match 'alt="[^"]+"'
            $src = [regex]::Match($m.Value, 'src="([^"]+)"').Groups[1].Value
            Test-Path (Join-Path $dir $src) | Should -BeTrue -Because $src
        }
    }
    It 'every inline picture is labelled for screen readers' {
        $svgs = [regex]::Matches($html, '<svg\b[^>]*>')
        $svgs.Count | Should -BeGreaterThan 2
        foreach ($s in $svgs) { $s.Value | Should -Match 'role="img"'; $s.Value | Should -Match 'aria-label="[^"]+"' }
    }
    It 'prints on A4' {
        $html | Should -Match '@page\s*\{[^}]*size:\s*A4'
    }
}

Describe 'BIOS page content' {
    BeforeAll { $html = [IO.File]::ReadAllText((Join-Path $PSScriptRoot '..\docs\bios\index.html'), [Text.Encoding]::UTF8) }
    It 'is a single self-contained file (the installer copies only this file)' {
        [regex]::Matches($html, '<(img|link|script)\b[^>]*(src|href)="[^"#]').Count | Should -Be 0
    }
    It 'names the keys and the Intel and AMD settings' {
        foreach ($k in 'Del', 'F2', 'F10', 'F1', 'Esc', 'F12') { $html | Should -Match "<kbd>$k</kbd>" }
        $html | Should -Match 'Intel Virtualization Technology'
        $html | Should -Match 'VT-x'
        $html | Should -Match 'SVM Mode'
        $html | Should -Match 'AMD-V'
        $html | Should -Match 'запустите установщик ещё раз'
    }
}

Describe 'SmartScreen page content' {
    BeforeAll { $html = [IO.File]::ReadAllText((Join-Path $PSScriptRoot '..\docs\smartscreen\index.html'), [Text.Encoding]::UTF8) }
    It 'walks through «Подробнее» → «Выполнить в любом случае»' {
        $html | Should -Match 'Подробнее'
        $html | Should -Match 'Выполнить в любом случае'
    }
    It 'covers Edge, Chrome, Yandex Browser and Defender' {
        foreach ($b in 'Edge', 'Chrome', 'Яндекс Браузер', 'Защитник Windows') { $html | Should -Match $b }
    }
    It 'explains how to check SHA-256 with certutil' {
        $html | Should -Match 'certutil -hashfile'
        $html | Should -Match 'SHA256'
    }
}
