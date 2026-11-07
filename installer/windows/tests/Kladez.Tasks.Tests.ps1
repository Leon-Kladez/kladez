# Pester 5+: задачи Планировщика и удаление (спек Б7–Б8, план Задача 7).
BeforeAll {
    Import-Module (Join-Path $PSScriptRoot '..\scripts\Kladez.Tasks.psm1') -Force
}

Describe 'Register-KladezTasks' {
    BeforeEach {
        $script:registered = @{}
        Mock -ModuleName Kladez.Tasks Register-ScheduledTask { $script:registered[$TaskName] = @{ Action = $Action; Principal = $Principal; Trigger = $Trigger } }
    }
    It 'registers «Кладезъ» at logon of this user with --background' {
        Register-KladezTasks -LauncherPath 'C:\Program Files\Kladez\Kladez.exe' -NetScriptPath 'C:\Program Files\Kladez\scripts\kladez-net.ps1' -UserId 'PC\Пётр Иванович'
        $t = $script:registered['Кладезъ']
        $t | Should -Not -BeNullOrEmpty
        $t.Action.Execute | Should -Be 'C:\Program Files\Kladez\Kladez.exe'
        $t.Action.Arguments | Should -Be '--background'
        $t.Trigger.UserId | Should -Be 'PC\Пётр Иванович'
        $t.Principal.RunLevel | Should -Be 'Limited'
    }
    It 'registers «Кладезъ — сеть» elevated, without trigger, script path quoted' {
        Register-KladezTasks -LauncherPath 'C:\Program Files\Kladez\Kladez.exe' -NetScriptPath 'C:\Program Files\Kladez\scripts\kladez-net.ps1' -UserId 'PC\Пётр Иванович'
        $t = $script:registered['Кладезъ — сеть']
        $t | Should -Not -BeNullOrEmpty
        $t.Principal.RunLevel | Should -Be 'Highest'
        $t.Trigger | Should -BeNullOrEmpty
        $t.Action.Execute | Should -Be 'powershell.exe'
        $t.Action.Arguments | Should -BeLike '*-File "C:\Program Files\Kladez\scripts\kladez-net.ps1"*'
        $t.Action.Arguments | Should -BeLike '*-WindowStyle Hidden*'
    }
}

Describe 'Test-KladezLibrarySafeToDelete' {
    It 'only known subfolders and marker files → safe' {
        $lib = Join-Path $TestDrive 'lib1'
        'zim', 'maps', 'ollama', 'logs', 'kb_uploads' | ForEach-Object { New-Item -ItemType Directory -Force (Join-Path $lib $_) | Out-Null }
        Set-Content (Join-Path $lib 'nomad-disk-info.json') '{}'
        Set-Content (Join-Path $lib '.nomad-gpu-type') 'nvidia'
        Test-KladezLibrarySafeToDelete -LibraryDir $lib | Should -BeTrue
    }
    It 'anything else (user files, whole drive) → not safe' {
        $lib = Join-Path $TestDrive 'lib2'
        New-Item -ItemType Directory -Force (Join-Path $lib 'zim') | Out-Null
        Set-Content (Join-Path $lib 'Фото с дачи.jpg') 'x'
        Test-KladezLibrarySafeToDelete -LibraryDir $lib | Should -BeFalse
    }
    It 'drive root is never safe' { Test-KladezLibrarySafeToDelete -LibraryDir 'D:\' | Should -BeFalse }
}

Describe 'Invoke-KladezUninstall' {
    BeforeEach {
        $script:wsl = New-Object System.Collections.Generic.List[string]
        $script:netsh = New-Object System.Collections.Generic.List[string]
        Mock -ModuleName Kladez.Tasks Invoke-KladezNative {
            $a = $Arguments -join ' '
            if ($FilePath -eq 'wsl.exe') { $script:wsl.Add($a) }
            if ($FilePath -eq 'netsh.exe') {
                if ($a -like '*show*') { return [pscustomobject]@{ ExitCode = 0; Output = "0.0.0.0         8080        172.22.240.5    8080`r`n192.168.1.10    3389        10.0.0.2        3389`r`n" } }
                $script:netsh.Add($a)
            }
            [pscustomobject]@{ ExitCode = 0; Output = '' }
        }
        Mock -ModuleName Kladez.Tasks Unregister-KladezTasks { }
        Mock -ModuleName Kladez.Tasks Remove-KladezFirewallRule { }
        $lib = Join-Path $TestDrive ('lib' + [guid]::NewGuid())
        New-Item -ItemType Directory -Force (Join-Path $lib 'zim') | Out-Null; Set-Content (Join-Path $lib 'zim/wikipedia_ru.zim') 'zim'
    }
    It 'keeps the library by default and leaves a note how to restore it' {
        Invoke-KladezUninstall -LibraryDir $lib -Ports @(8080, 8090) -RemoveLibrary $false
        $script:wsl | Should -Be @('--terminate Kladez', '--unregister Kladez')
        Test-Path (Join-Path $lib 'zim') | Should -BeTrue
        Test-Path (Join-Path $lib 'Как вернуть библиотеку.txt') | Should -BeTrue
        Should -Invoke -ModuleName Kladez.Tasks Unregister-KladezTasks -Times 1 -Exactly
        Should -Invoke -ModuleName Kladez.Tasks Remove-KladezFirewallRule -Times 1 -Exactly
    }
    It 'removes only our portproxy rules and never disables Windows features' {
        Invoke-KladezUninstall -LibraryDir $lib -Ports @(8080, 8090) -RemoveLibrary $false
        $script:netsh | Should -Be @('interface portproxy delete v4tov4 listenaddress=0.0.0.0 listenport=8080')
        Should -Invoke -ModuleName Kladez.Tasks Invoke-KladezNative -Times 0 -ParameterFilter { $FilePath -eq 'dism.exe' }
    }
    It 'RemoveLibrary deletes a safe library' {
        Invoke-KladezUninstall -LibraryDir $lib -Ports @(8080) -RemoveLibrary $true
        Test-Path $lib | Should -BeFalse
    }
    It 'RemoveLibrary keeps a library with foreign files and says so' {
        Set-Content (Join-Path $lib 'мой документ.docx') 'x'
        $r = Invoke-KladezUninstall -LibraryDir $lib -Ports @(8080) -RemoveLibrary $true
        Test-Path (Join-Path $lib 'мой документ.docx') | Should -BeTrue
        $r | Should -Match 'не удалена'
    }
    It 'unknown library location (no kladez.ini) still removes the program' {
        { Invoke-KladezUninstall -LibraryDir '' -Ports @(8080) -RemoveLibrary $true } | Should -Not -Throw
        $script:wsl | Should -Contain '--unregister Kladez'
    }

    # ── Leftover folders after uninstall (author's PC: empty <drive>:\Kladez and «Что это за папка.txt») ──
    Context 'leftovers in the drive Kladez folder' {
        BeforeEach {
            $root = Join-Path $TestDrive ('Kladez' + [guid]::NewGuid())
            $sys = Join-Path $root 'system'
            $rootLib = Join-Path $root 'library'
            New-Item -ItemType Directory -Force $sys, $rootLib | Out-Null
            Set-Content (Join-Path $root 'Что это за папка.txt') 'x'
        }
        It 'library removed → system folder, note and the whole Kladez folder are gone' {
            New-Item -ItemType Directory (Join-Path $rootLib 'zim') | Out-Null
            Invoke-KladezUninstall -LibraryDir $rootLib -SystemDir $sys -Ports @(8080) -RemoveLibrary $true
            Test-Path $root | Should -BeFalse
        }
        It 'empty library is not kept (nothing to re-use) → Kladez folder gone even when keeping was chosen' {
            Invoke-KladezUninstall -LibraryDir $rootLib -SystemDir $sys -Ports @(8080) -RemoveLibrary $false
            Test-Path $root | Should -BeFalse
        }
        It 'kept library stays with its «how to restore» note; the system folder and the old note are removed' {
            New-Item -ItemType Directory (Join-Path $rootLib 'zim') | Out-Null; Set-Content (Join-Path $rootLib 'zim/wikipedia_ru.zim') 'zim'
            Invoke-KladezUninstall -LibraryDir $rootLib -SystemDir $sys -Ports @(8080) -RemoveLibrary $false
            Test-Path (Join-Path $rootLib 'zim') | Should -BeTrue
            Test-Path (Join-Path $rootLib 'Как вернуть библиотеку.txt') | Should -BeTrue
            Test-Path $sys | Should -BeFalse
            Test-Path (Join-Path $root 'Что это за папка.txt') | Should -BeFalse
        }
        It 'never removes anything that is not ours: a non-empty system folder and other files in Kladez stay' {
            Set-Content (Join-Path $sys 'ext4.vhdx') 'still here'
            Set-Content (Join-Path $root 'мои заметки.txt') 'x'
            Invoke-KladezUninstall -LibraryDir $rootLib -SystemDir $sys -Ports @(8080) -RemoveLibrary $true
            Test-Path (Join-Path $sys 'ext4.vhdx') | Should -BeTrue
            Test-Path (Join-Path $root 'мои заметки.txt') | Should -BeTrue
        }
        It 'the program folder inside Kladez (still holding files at this moment) keeps Kladez for Inno to remove later' {
            Set-Content (Join-Path $root 'Kladez.exe') 'x'
            Invoke-KladezUninstall -LibraryDir $rootLib -SystemDir $sys -Ports @(8080) -RemoveLibrary $true
            Test-Path (Join-Path $root 'Kladez.exe') | Should -BeTrue
            Test-Path (Join-Path $root 'Что это за папка.txt') | Should -BeFalse
        }
    }
}

Describe 'Resolve-KladezTaskUser (who gets the autostart task)' {
    BeforeAll {
        $owners = @(
            [pscustomobject]@{ SessionId = 0; Owner = 'NT AUTHORITY\SYSTEM' },
            [pscustomobject]@{ SessionId = 1; Owner = 'PC\Пётр Иванович' },
            [pscustomobject]@{ SessionId = 2; Owner = 'PC\Гость' }
        )
    }
    It 'name from the installer (original user) wins' {
        Resolve-KladezTaskUser -UserId 'PC\Пётр Иванович' -ExplorerOwners $owners -SessionId 2 -Fallback 'PC\Admin' | Should -Be 'PC\Пётр Иванович'
    }
    It 'empty name → owner of explorer.exe in this session (the person sitting at the computer)' {
        Resolve-KladezTaskUser -UserId '' -ExplorerOwners $owners -SessionId 1 -Fallback 'PC\Admin' | Should -Be 'PC\Пётр Иванович'
    }
    It 'no explorer in this session → fallback name' {
        Resolve-KladezTaskUser -UserId '  ' -ExplorerOwners $owners -SessionId 5 -Fallback 'PC\Admin' | Should -Be 'PC\Admin'
    }
    It 'nothing at all → empty (the step then stops with a clear message)' {
        Resolve-KladezTaskUser -UserId '' -ExplorerOwners @() -SessionId 1 -Fallback '\' | Should -BeNullOrEmpty
    }
}
