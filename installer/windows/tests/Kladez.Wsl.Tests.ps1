# Pester 5+: WSL и дистрибутив Kladez (спек Б4 п.3–7, план Задача 6).
BeforeAll {
    Import-Module (Join-Path $PSScriptRoot '..\scripts\Kladez.Checks.psm1') -Force
    Import-Module (Join-Path $PSScriptRoot '..\scripts\Kladez.Wsl.psm1') -Force
    $listText = "Ubuntu`r`nKladez`r`n"
    # Real `wsl -l -q` output on Windows 10 22H2 (checked 2026-11-05): UTF-16LE, no BOM.
    $utf16NoBom = [Text.Encoding]::Unicode.GetBytes($listText)
    $utf16Bom = [byte[]](0xFF, 0xFE) + $utf16NoBom
    $utf8 = [Text.Encoding]::UTF8.GetBytes($listText)
}

Describe 'ConvertFrom-WslOutput' {
    It 'decodes <name>' -ForEach @(@{ name = 'utf16-no-bom' }, @{ name = 'utf16-bom' }, @{ name = 'utf8' }) {
        $bytes = switch ($name) { 'utf16-no-bom' { $utf16NoBom } 'utf16-bom' { $utf16Bom } 'utf8' { $utf8 } }
        $text = ConvertFrom-WslOutput -Bytes $bytes
        $text | Should -BeExactly $listText
        $text.Contains([string][char]0) | Should -BeFalse
    }
    It 'decodes Cyrillic UTF-16 output' {
        ConvertFrom-WslOutput -Bytes ([Text.Encoding]::Unicode.GetBytes('Версия WSL: 2.3.26.0')) |
            Should -BeExactly 'Версия WSL: 2.3.26.0'
    }
    It 'empty output → empty string' { ConvertFrom-WslOutput -Bytes @() | Should -BeExactly '' }
}

Describe 'Get-KladezWslVersion' {
    It 'English' { Get-KladezWslVersion -VersionText "WSL version: 2.3.26.0`r`nKernel version: 5.15.167.4-1`r`n" | Should -Be ([version]'2.3.26.0') }
    It 'Russian' { Get-KladezWslVersion -VersionText "Версия WSL: 2.3.26.0`r`nВерсия ядра: 5.15.167.4-1" | Should -Be ([version]'2.3.26.0') }
    It 'error text → null' { Get-KladezWslVersion -VersionText 'Invalid command line option: --version' | Should -BeNullOrEmpty }
}

Describe 'Get-KladezInstallAction' {
    It 'features off → enable-features' {
        Get-KladezInstallAction -Path modern -FeaturesEnabled $false -WslVersion $null | Should -Be 'enable-features'
    }
    It 'modern, no WSL package → install-wsl-msi' {
        Get-KladezInstallAction -Path modern -FeaturesEnabled $true -WslVersion $null | Should -Be 'install-wsl-msi'
    }
    It 'modern, old WSL 1.2 → install-wsl-msi' {
        Get-KladezInstallAction -Path modern -FeaturesEnabled $true -WslVersion ([version]'1.2.5') | Should -Be 'install-wsl-msi'
    }
    It 'modern, WSL 2.3 → ready' {
        Get-KladezInstallAction -Path modern -FeaturesEnabled $true -WslVersion ([version]'2.3.26.0') | Should -Be 'ready'
    }
    It 'legacy with features → install-legacy-kernel' {
        Get-KladezInstallAction -Path legacy -FeaturesEnabled $true -WslVersion $null | Should -Be 'install-legacy-kernel'
    }
}

Describe 'Test-KladezDistroExists' {
    It 'Kladez in list' { Test-KladezDistroExists -ListText $listText | Should -BeTrue }
    It 'case-insensitive' { Test-KladezDistroExists -ListText "kladez`r`n" | Should -BeTrue }
    It 'Kladez-old and Ubuntu do not count' { Test-KladezDistroExists -ListText "Kladez-old`r`nUbuntu`r`n" | Should -BeFalse }
}

Describe 'ConvertTo-KladezArgumentString' {
    It 'quotes arguments with spaces and Cyrillic' {
        ConvertTo-KladezArgumentString -Arguments @('--import', 'Kladez', 'E:\Мои файлы\Kladez\system', 'x.tar.gz') |
            Should -BeExactly '--import Kladez "E:\Мои файлы\Kladez\system" x.tar.gz'
    }
    It 'escapes embedded quotes' {
        ConvertTo-KladezArgumentString -Arguments @('a"b') | Should -BeExactly '"a\"b"'
    }
}

Describe 'Install-KladezDistro' {
    BeforeEach { $script:calls = New-Object System.Collections.Generic.List[string] }
    It 'existing distro → no import (rerun-safe)' {
        Mock -ModuleName Kladez.Wsl Invoke-KladezNative {
            $script:calls.Add(($Arguments -join ' '))
            [pscustomobject]@{ ExitCode = 0; Output = "Ubuntu`r`nKladez`r`n" }
        }
        Install-KladezDistro -SystemDir 'D:\Kladez\system' -RootfsPath 'C:\t\kladez-rootfs.tar.gz' | Should -Be 'exists'
        ($script:calls | Where-Object { $_ -like '--import*' }) | Should -BeNullOrEmpty
    }
    It 'missing distro → exact import, then sparse; sparse failure is ignored' {
        Mock -ModuleName Kladez.Wsl Invoke-KladezNative {
            $a = $Arguments -join ' '
            $script:calls.Add($a)
            if ($a -eq '-l -q') { return [pscustomobject]@{ ExitCode = 0; Output = "Ubuntu`r`n" } }
            if ($a -like '--manage*') { return [pscustomobject]@{ ExitCode = 1; Output = 'unknown option' } }
            [pscustomobject]@{ ExitCode = 0; Output = '' }
        }
        Install-KladezDistro -SystemDir 'E:\Мои файлы\Kladez\system' -RootfsPath 'C:\t\kladez-rootfs.tar.gz' | Should -Be 'imported'
        $script:calls | Should -Contain '--import Kladez E:\Мои файлы\Kladez\system C:\t\kladez-rootfs.tar.gz --version 2'
        $script:calls | Should -Contain '--manage Kladez --set-sparse true'
    }
    It 'import failure throws a Russian message' {
        Mock -ModuleName Kladez.Wsl Invoke-KladezNative {
            if (($Arguments -join ' ') -eq '-l -q') { return [pscustomobject]@{ ExitCode = 0; Output = '' } }
            [pscustomobject]@{ ExitCode = 1; Output = 'WslRegisterDistribution failed' }
        }
        { Install-KladezDistro -SystemDir 'D:\Kladez\system' -RootfsPath 'C:\t\r.tar.gz' } | Should -Throw '*Не удалось*'
    }
}

Describe 'Invoke-KladezFirstRun and Invoke-KladezUpgrade' {
    BeforeEach {
        $script:last = $null
        Mock -ModuleName Kladez.Wsl Invoke-KladezNative { $script:last = $Arguments; [pscustomobject]@{ ExitCode = 0; Output = '' } }
    }
    It 'first run passes WSL paths, each as one argument' {
        Invoke-KladezFirstRun -BundlePath 'C:\Program Files\Kladez\kladez-images.tar.zst' -LibraryDir 'E:\Мои файлы\Kladez\library' -AdminPort 8180 -KiwixPort 8190
        $script:last | Should -Be @('-d', 'Kladez', '-u', 'root', '--', '/usr/local/bin/kladez-start', '--first-run',
            '--bundle', '/mnt/c/Program Files/Kladez/kladez-images.tar.zst',
            '--library', '/mnt/e/Мои файлы/Kladez/library', '--admin-port', '8180', '--kiwix-port', '8190')
    }
    It 'upgrade passes only the bundle' {
        Invoke-KladezUpgrade -BundlePath 'C:\Program Files\Kladez\kladez-images.tar.zst'
        $script:last | Should -Be @('-d', 'Kladez', '-u', 'root', '--', '/usr/local/bin/kladez-start', '--upgrade',
            '--bundle', '/mnt/c/Program Files/Kladez/kladez-images.tar.zst')
    }
    It 'kladez-start failure throws with its message' {
        Mock -ModuleName Kladez.Wsl Invoke-KladezNative { [pscustomobject]@{ ExitCode = 1; Output = 'Не удалось запустить Docker' } }
        { Invoke-KladezUpgrade -BundlePath 'C:\x.tar.zst' } | Should -Throw '*Не удалось запустить Docker*'
    }
}

Describe 'Enable-KladezFeatures and Install-KladezWslPackage' {
    It 'DISM 3010 on any feature → reboot' {
        Mock -ModuleName Kladez.Wsl Invoke-KladezNative {
            [pscustomobject]@{ ExitCode = $(if (($Arguments -join ' ') -like '*VirtualMachinePlatform*') { 3010 } else { 0 }); Output = '' }
        }
        Enable-KladezFeatures | Should -Be 'reboot'
    }
    It 'both features already on → ok' {
        Mock -ModuleName Kladez.Wsl Invoke-KladezNative { [pscustomobject]@{ ExitCode = 0; Output = '' } }
        Enable-KladezFeatures | Should -Be 'ok'
    }
    It 'msiexec is quiet and never restarts by itself' {
        $script:last = $null
        Mock -ModuleName Kladez.Wsl Invoke-KladezNative { $script:last = @($FilePath) + $Arguments; [pscustomobject]@{ ExitCode = 0; Output = '' } }
        Install-KladezWslPackage -MsiPath 'C:\t\wsl.2.3.26.0.x64.msi' | Should -Be 'ok'
        $script:last | Should -Be @('msiexec.exe', '/i', 'C:\t\wsl.2.3.26.0.x64.msi', '/qn', '/norestart')
    }
}

Describe 'never touches the user''s other WSL settings' {
    It 'module source has no --set-default and no .wslconfig' {
        $src = Get-Content (Join-Path $PSScriptRoot '..\scripts\Kladez.Wsl.psm1') -Raw
        $src | Should -Not -Match '--set-default'
        $src | Should -Not -Match '\.wslconfig'
    }
}

Describe 'Update-KladezDistroFiles (upgrade copies new scripts and image list into the distro)' {
    It 'installs kladez-start, kladez-lib.sh, images.lock and the compose template' {
        $script:calls = New-Object System.Collections.Generic.List[string]
        Mock -ModuleName Kladez.Wsl Invoke-KladezNative { $script:calls.Add(($Arguments -join ' ')); [pscustomobject]@{ ExitCode = 0; Output = '' } }
        Update-KladezDistroFiles -LinuxDir 'C:\Program Files\Kladez\payload\linux'
        $src = '/mnt/c/Program Files/Kladez/payload/linux'
        $script:calls | Should -Contain "-d Kladez -u root -- install -m 0755 $src/kladez-start /usr/local/bin/kladez-start"
        $script:calls | Should -Contain "-d Kladez -u root -- install -D -m 0644 $src/kladez-lib.sh /usr/local/lib/kladez/kladez-lib.sh"
        $script:calls | Should -Contain "-d Kladez -u root -- install -m 0644 $src/images.lock /opt/project-nomad/images.lock"
        $script:calls | Should -Contain "-d Kladez -u root -- install -m 0644 $src/compose.template.yaml /opt/project-nomad/compose.template.yaml"
    }
    It 'a failed copy stops the upgrade with a Russian message' {
        Mock -ModuleName Kladez.Wsl Invoke-KladezNative { [pscustomobject]@{ ExitCode = 1; Output = 'No such file' } }
        { Update-KladezDistroFiles -LinuxDir 'C:\temp' } | Should -Throw '*Не удалось обновить*'
    }
}

Describe 'Set-KladezWslOobeDone (no «Welcome to WSL» window after install)' {
    It 'creates the key and sets OOBEComplete=1 (DWORD) — the value WSL checks before showing the window' {
        $key = 'TestRegistry:\Lxss'
        Set-KladezWslOobeDone -KeyPath $key
        (Get-ItemProperty -Path $key -Name OOBEComplete).OOBEComplete | Should -Be 1
        (Get-Item $key).GetValueKind('OOBEComplete') | Should -Be 'DWord'
    }
    It 'keeps other WSL values of the user' {
        $key = 'TestRegistry:\Lxss2'
        New-Item -Path $key -Force | Out-Null
        New-ItemProperty -Path $key -Name DefaultDistribution -Value '{abc}' | Out-Null
        Set-KladezWslOobeDone -KeyPath $key
        (Get-ItemProperty -Path $key).DefaultDistribution | Should -Be '{abc}'
    }
    It 'never fails an install step' {
        Mock -ModuleName Kladez.Wsl Set-ItemProperty { throw 'denied' }
        { Set-KladezWslOobeDone -KeyPath 'TestRegistry:\Lxss3' } | Should -Not -Throw
    }
}

Describe 'Get-KladezStartLogTail (why firstrun/upgrade failed, into setup.log)' {
    It 'returns the last lines of /var/log/kladez-start.log from the distro' {
        Mock -ModuleName Kladez.Wsl Invoke-KladezWsl { [pscustomobject]@{ ExitCode = 0; Output = "line 1`r`n`r`nNo such image: x:0.1.0`n" } } -ParameterFilter { ($Arguments -join ' ') -like '*tail -n 40 /var/log/kladez-start.log' }
        Get-KladezStartLogTail | Should -Be @('line 1', 'No such image: x:0.1.0')
    }
    It 'no distro or no log → nothing, never throws' {
        Mock -ModuleName Kladez.Wsl Invoke-KladezWsl { [pscustomobject]@{ ExitCode = 1; Output = 'There is no distribution' } }
        @(Get-KladezStartLogTail).Count | Should -Be 0
        Mock -ModuleName Kladez.Wsl Invoke-KladezWsl { throw 'wsl.exe missing' }
        { Get-KladezStartLogTail } | Should -Not -Throw
    }
}
