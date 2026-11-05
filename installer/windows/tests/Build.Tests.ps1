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
}
