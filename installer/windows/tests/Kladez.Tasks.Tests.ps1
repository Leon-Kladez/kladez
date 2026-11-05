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
        New-Item -ItemType Directory -Force (Join-Path $lib 'zim') | Out-Null
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
}
