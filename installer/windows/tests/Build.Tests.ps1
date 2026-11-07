# Pester 5+: сборка установщика (план Задача 9). Компиляция ISCC здесь не запускается.
BeforeAll {
    Import-Module (Join-Path $PSScriptRoot '..\..\Kladez.Build.psm1') -Force
    $iss = Get-Content (Join-Path $PSScriptRoot '..\kladez.iss') -Raw -Encoding UTF8
    function New-Fake([string]$path, [string]$content) {
        New-Item -ItemType Directory -Force -Path (Split-Path $path) | Out-Null
        [IO.File]::WriteAllText($path, $content)
        (Get-FileHash $path -Algorithm SHA256).Hash.ToLowerInvariant()
    }
}

Describe 'Read-KladezVendorLock' {
    It 'parses name, url and sha256' {
        $lock = Join-Path $TestDrive 'vendor.lock'
        Set-Content $lock "# comment`nwsl.msi https://example.org/wsl.msi sha256:abc123`n" -Encoding UTF8
        $v = @(Read-KladezVendorLock -Path $lock)
        $v.Count | Should -Be 1
        $v[0].Name | Should -Be 'wsl.msi'; $v[0].Url | Should -Be 'https://example.org/wsl.msi'; $v[0].Sha256 | Should -Be 'abc123'
    }
    It 'the real vendor.lock pins the WSL package by sha256' {
        $v = @(Read-KladezVendorLock -Path (Join-Path $PSScriptRoot '..\vendor.lock'))
        ($v | Where-Object Name -like 'wsl.*.x64.msi').Sha256 | Should -Match '^[0-9a-f]{64}$'
    }
}

Describe 'Get-KladezBuildInputs' {
    It 'full installer needs rootfs, images, launcher and both WSL packages' {
        $names = (Get-KladezBuildInputs -DistDir 'D' -VendorDir 'V' -Vendor @([pscustomobject]@{ Name = 'wsl.3.0.3.0.x64.msi' }, [pscustomobject]@{ Name = 'wsl_update_x64.msi' })).Name
        $names | Should -Contain 'kladez-rootfs.tar.gz'
        $names | Should -Contain 'kladez-images.tar.zst'
        $names | Should -Contain 'Kladez.exe'
        $names | Should -Contain 'wsl.3.0.3.0.x64.msi'
        $names | Should -Contain 'wsl_update_x64.msi'
    }
    It 'offline update file needs neither rootfs nor msi' {
        $names = (Get-KladezBuildInputs -DistDir 'D' -VendorDir 'V' -UpdateOnly -Vendor @([pscustomobject]@{ Name = 'wsl.3.0.3.0.x64.msi' })).Name
        $names | Should -Not -Contain 'kladez-rootfs.tar.gz'
        ($names | Where-Object { $_ -like '*.msi' }) | Should -BeNullOrEmpty
        $names | Should -Contain 'kladez-images.tar.zst'
    }
}

Describe 'Test-KladezBuildInputs' {
    It 'passes when every file exists and every hash matches' {
        $f = Join-Path $TestDrive 'ok\a.bin'; $h = New-Fake $f 'hello'
        { Test-KladezBuildInputs -Inputs @([pscustomobject]@{ Name = 'a.bin'; Path = $f; Sha256 = $h }) } | Should -Not -Throw
    }
    It 'missing file → clear Russian error' {
        { Test-KladezBuildInputs -Inputs @([pscustomobject]@{ Name = 'x.bin'; Path = (Join-Path $TestDrive 'nope\x.bin'); Sha256 = $null }) } |
            Should -Throw '*Нет файла*x.bin*'
    }
    It 'wrong hash → clear Russian error' {
        $f = Join-Path $TestDrive 'bad\b.bin'; [void](New-Fake $f 'hello')
        { Test-KladezBuildInputs -Inputs @([pscustomobject]@{ Name = 'b.bin'; Path = $f; Sha256 = ('0' * 64) }) } |
            Should -Throw '*Контрольная сумма*b.bin*'
    }
    It 'hash from a .sha256 sidecar (sha256sum format) is used when given' {
        $f = Join-Path $TestDrive 'side\c.tar.gz'; $h = New-Fake $f 'data'
        Set-Content (Join-Path $TestDrive 'side\c.sha256') "$h  c.tar.gz" -Encoding ASCII
        (Get-KladezSidecarHash -Path $f) | Should -Be $h
    }
}

Describe 'kladez.iss' {
    It 'is in Russian and asks for admin rights' {
        $iss | Should -Match 'compiler:Languages\\Russian\.isl'
        $iss | Should -Match '(?m)^PrivilegesRequired=admin'
        $iss | Should -Match '(?m)^MinVersion=10\.0\.19041'
        $iss | Should -Match '(?m)^ArchitecturesAllowed=x64compatible'
    }
    It 'has a fixed AppId (upgrade detection depends on it)' {
        $iss | Should -Match '(?m)^#define AppIdGuid "\{\{[0-9A-F-]{36}\}"'
    }
    It 'asks whether to delete the library with «No» as default' {
        $iss | Should -Match 'MB_DEFBUTTON2'
    }
    It 'never changes the user''s other WSL settings' {
        $iss | Should -Not -Match '--set-default'
        $iss | Should -Not -Match '\.wslconfig'
    }
    It 'ships LICENSE and NOTICE' {
        $iss | Should -Match 'Source: "\{#RepoRoot\}\\LICENSE"'
        $iss | Should -Match 'Source: "\{#RepoRoot\}\\NOTICE"'
    }
    It 'creates the «Кладезъ» shortcut on the desktop' {
        $iss | Should -Match 'Name: "\{autodesktop\}\\Кладезъ"'
    }
    It 'resumes after reboot through RunOnce' {
        $iss | Should -Match 'RunOnce'
        $iss | Should -Match '/RESUME'
    }
    It 'lets non-elevated steps write the shared log folder (review C1)' {
        $iss | Should -Match '(?m)^Name: "\{commonappdata\}\\Kladez\\logs"; Permissions: users-modify'
    }
    It 'decides «upgrade» by a completion marker, not by the uninstall key Inno writes before the steps run (review C2)' {
        $iss | Should -Not -Match 'IsUpgrade := RegKeyExists'
        $iss | Should -Match "IsUpgrade := IniValue\('Installed'\) = '1'"
        $iss | Should -Match "'Installed=1'"
    }
    It 'tells the truth on the last page when a step failed (review C2)' {
        $iss | Should -Match 'FinishedLabel\.Caption'
        $iss | Should -Match 'InstallFailed'
    }
    It 'ships the Linux scripts and image list and passes them to the upgrade step (review I1)' {
        foreach ($f in 'kladez-start', 'kladez-lib.sh', 'images.lock', 'compose.template.yaml') {
            $iss | Should -Match ('Source: "\{#RepoRoot\}\\installer\\linux\\' + [regex]::Escape($f) + '"; DestDir: "\{app\}\\payload\\linux"')
        }
        $iss | Should -Match '-LinuxDir "'
    }

    # ── 0.1.4: замечания автора и ошибка на его ПК ──────────────────────────────
    It 'gets the original user without the protected {tmp} folder (0.1.4 bug: integrate failed on a real PC)' {
        $iss | Should -Not -Match '\{tmp\}\\kladez-user'
        $iss | Should -Match '\{commonappdata\}\\Kladez\\logs\\kladez-user\.txt'
        $iss | Should -Match '-FallbackUserId "'
    }
    It 'no step that runs as the original user writes into {tmp}' {
        foreach ($m in [regex]::Matches($iss, "Step\('(distro|firstrun|upgrade)',[^;]*")) { $m.Value | Should -Not -Match '\{tmp\}' }
    }
    It 'lets the person choose the program folder with «Обзор…», default on the roomiest drive' {
        $iss | Should -Match '(?m)^DisableDirPage=auto'
        $iss | Should -Match '(?m)^DefaultDirName=\{code:DefaultAppDir\}'
        $iss | Should -Match 'function DefaultAppDir\(Param: String\): String;'
    }
    It 'lets the person choose the library FOLDER with «Обзор…» and shows free space for it' {
        $iss | Should -Match 'CreateInputDirPage\('
        $iss | Should -Match 'OnChange := @LibDirChanged'
        $iss | Should -Match 'хватит на'
    }
    It 'resumes after reboot with the full library path and program folder' {
        $iss | Should -Match "/LIBDIR="
        $iss | Should -Match "/DIR="
        $iss | Should -Match "\{param:LIBDIR\|\}"
    }
    It 'shows the terms as an agreement that can be accepted only after scrolling to the end' {
        $iss | Should -Match '(?m)^LicenseFile=.*agreement-ru\.txt'
        $iss | Should -Not -Match '(?m)^InfoBeforeFile='
        $iss | Should -Match 'LicenseAcceptedRadio\.Enabled := '
        $iss | Should -Match "external 'GetScrollInfo@user32\.dll stdcall'"
        $iss | Should -Match "external 'SetTimer@user32\.dll stdcall'"
    }
    It 'skips the agreement, folder pages and «ready» page when continuing after the reboot' {
        $iss | Should -Match '\(PageID = wpLicense\) and \(IsResume or IsUpgrade\)'
        $iss | Should -Match '\(PageID = wpReady\) and IsResume'
        $iss | Should -Match '\(PageID = wpSelectDir\) and IsResume'
    }
    It 'shows percentages while unpacking and «Шаг N из M» with overall percent during the steps' {
        $iss | Should -Match 'procedure CurInstallProgressChanged\(CurProgress, MaxProgress: Integer\);'
        $iss | Should -Match "'Распаковка файлов… '"
        $iss | Should -Match "'Шаг ' \+ IntToStr\("
        $iss | Should -Match 'компьютер не завис'
    }
}

Describe 'kladez.iss Pascal Script: every routine is declared above its first use (ISCC is not available locally)' {
    BeforeAll {
        $src = $iss.Substring([regex]::Match($iss, '(?m)^\[Code\]').Index)
        # Character-level scan like the Pascal Script lexer: strings '…' ('' inside), comments { … }
        # (not nested: the first } closes — a «{tmp}» inside a comment ends it early!), (* … *) and //.
        # Comments and strings become spaces; newlines are kept so line numbers stay right.
        $sb = New-Object System.Text.StringBuilder
        $script:unclosed = $null
        $i = 0; $n = $src.Length; $line = 1
        while ($i -lt $n) {
            $c = $src[$i]
            if ($c -eq "`n") { $line++ }
            if ($c -eq "'") {
                $j = $i + 1
                while ($j -lt $n) { if ($src[$j] -eq "'") { if ($j + 1 -lt $n -and $src[$j + 1] -eq "'") { $j += 2; continue } else { break } }; if ($src[$j] -eq "`n") { break }; $j++ }
                [void]$sb.Append("''"); $i = $j + 1; continue
            }
            if ($c -eq '{' -and -not ($i + 1 -lt $n -and $src[$i + 1] -eq '#')) {
                $j = $src.IndexOf('}', $i + 1)
                if ($j -lt 0) { $script:unclosed = "comment opened on line $line is never closed"; break }
                $body = $src.Substring($i, $j - $i + 1)
                [void]$sb.Append(("`n" * ($body.Split("`n").Count - 1))); $line += $body.Split("`n").Count - 1; $i = $j + 1; continue
            }
            if ($c -eq '(' -and $i + 1 -lt $n -and $src[$i + 1] -eq '*') {
                $j = $src.IndexOf('*)', $i + 2); if ($j -lt 0) { $script:unclosed = "(* on line $line"; break }
                $body = $src.Substring($i, $j - $i + 2)
                [void]$sb.Append(("`n" * ($body.Split("`n").Count - 1))); $line += $body.Split("`n").Count - 1; $i = $j + 2; continue
            }
            if ($c -eq '/' -and $i + 1 -lt $n -and $src[$i + 1] -eq '/') {
                $j = $src.IndexOf("`n", $i); if ($j -lt 0) { $j = $n }; $i = $j; continue
            }
            [void]$sb.Append($c); $i++
        }
        $code = $sb.ToString()
        $script:codeText = $code
        $lines = $code -split "`n"
        $decl = @{}
        for ($i = 0; $i -lt $lines.Count; $i++) {
            if ($lines[$i] -match '^\s*(function|procedure)\s+([A-Za-z_]\w*)') {
                if (-not $decl.ContainsKey($Matches[2])) { $decl[$Matches[2]] = $i }
            }
        }
        $script:violations = foreach ($name in $decl.Keys) {
            for ($i = 0; $i -lt $decl[$name]; $i++) {
                if ($lines[$i] -match "(?<![\w.])@?$name\b") { "$name used on line $($i + 1) before its declaration on line $($decl[$name] + 1)"; break }
            }
        }
    }
    It 'every comment is closed' { $script:unclosed | Should -BeNullOrEmpty }
    It 'finds the routines' { $decl.Count | Should -BeGreaterThan 20 }
    It 'has no use-before-declaration' { $script:violations | Should -BeNullOrEmpty }
    It 'no comment text leaked into code (a comment closed early by an inner brace)' {
        # Russian or English prose words that only appear in our comments must not survive the scan.
        $script:codeText | Should -Not -Match '(?m)^\s*(into|folder|anything|Setup''s|Такой)\b'
        $script:codeText | Should -Not -Match '[А-Яа-яЁё]{3,}'
    }
}

Describe 'kladez.iss: оформление «Кладезъ», мелодия и подсказки' {
    BeforeAll {
        $assets = Join-Path $PSScriptRoot '..\assets'
        function Get-BmpSize([string]$path) {
            $b = [IO.File]::ReadAllBytes($path)
            [pscustomobject]@{ Ok = ($b[0] -eq 0x42 -and $b[1] -eq 0x4D); W = [BitConverter]::ToInt32($b, 18); H = [Math]::Abs([BitConverter]::ToInt32($b, 22)) }
        }
    }
    It 'uses the logo pictures for 100/125/150/200 % and every referenced picture exists with the size in its name' {
        foreach ($key in 'WizardImageFile', 'WizardSmallImageFile') {
            $line = [regex]::Match($iss, "(?m)^$key=(.+)$").Groups[1].Value.Trim()
            $files = $line -split ',' | ForEach-Object { $_.Trim() -replace '^\{#RepoRoot\}\\installer\\windows\\assets\\', '' }
            $files.Count | Should -Be 4 -Because $key
            foreach ($f in $files) {
                $p = Join-Path $assets $f
                Test-Path $p | Should -BeTrue -Because $f
                $s = Get-BmpSize $p
                $s.Ok | Should -BeTrue
                "$($s.W)x$($s.H)" | Should -Be ([regex]::Match($f, '(\d+x\d+)').Groups[1].Value)
            }
        }
    }
    It 'pictures use the logo colours (#f6efe0 background, #5a3b12 ink)' {
        Add-Type -AssemblyName System.Drawing
        $bmp = [Drawing.Bitmap]::new((Join-Path $assets 'wizard-164x314.bmp'))
        try {
            $bmp.GetPixel(2, 2).ToArgb() -band 0xFFFFFF | Should -Be 0xF6EFE0
            $inks = 0
            for ($x = 0; $x -lt $bmp.Width; $x += 2) { for ($y = 0; $y -lt $bmp.Height; $y += 2) { if (($bmp.GetPixel($x, $y).ToArgb() -band 0xFFFFFF) -eq 0x5A3B12) { $inks++ } } }
            $inks | Should -BeGreaterThan 100
        } finally { $bmp.Dispose() }
    }
    It 'plays the melody in a loop through winmm, quietly, and never in silent mode' {
        $iss | Should -Match 'Source: "\{#RepoRoot\}\\installer\\windows\\assets\\kladez-melody\.mp3"; DestDir: "\{tmp\}"; Flags: dontcopy'
        $iss | Should -Match "external 'mciSendStringW@winmm\.dll stdcall'"
        $iss | Should -Match "'play kzmusic repeat'"
        $iss | Should -Match "volume to 350"
        $iss | Should -Match 'if WizardSilent then'
        $iss | Should -Match "'close kzmusic'"
    }
    It 'has a visible «Звук» button and remembers the choice (also after the reboot)' {
        $iss | Should -Match "'♪ Звук: вкл'"
        $iss | Should -Match "'♪ Звук: выкл'"
        $iss | Should -Match "'Software\\Kladez', 'InstallerMute'"
    }
    It 'shows changing tips about Кладезъ during long steps, every 12 seconds' {
        ([regex]::Matches($iss, "Tips\[\d+\] := '")).Count | Should -BeGreaterOrEqual 6
        $iss | Should -Match 'KzSetTimer\(0, 0, 12000, CreateCallback\(@TipTimerProc\)\)'
        $iss | Should -Match 'ничего не сообщает о вас'
    }
}
