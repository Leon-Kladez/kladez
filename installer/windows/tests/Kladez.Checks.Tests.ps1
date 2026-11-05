# Pester 5+: проверки компьютера (спек Б4, план Задача 5).
BeforeAll {
    Import-Module (Join-Path $PSScriptRoot '..\scripts\Kladez.Checks.psm1') -Force
    $GB = [long]1GB
}

Describe 'Test-KladezWindowsBuild' {
    It 'build <b> → <path>' -ForEach @(
        @{ b = 19040; path = 'unsupported' }, @{ b = 19041; path = 'legacy' }, @{ b = 19043; path = 'legacy' },
        @{ b = 19044; path = 'modern' }, @{ b = 19045; path = 'modern' }, @{ b = 22631; path = 'modern' },
        @{ b = 26100; path = 'modern' }
    ) {
        $r = Test-KladezWindowsBuild -Build $b
        $r.Path | Should -Be $path
        $r.Ok | Should -Be ($path -ne 'unsupported')
        $r.Message | Should -Not -BeNullOrEmpty
    }
}

Describe 'Test-KladezMemory' {
    It '3.9 GB → fail' { (Test-KladezMemory -TotalBytes ([long](3.9 * $GB))).Level | Should -Be 'fail' }
    It '4 GB → warn'   { (Test-KladezMemory -TotalBytes (4 * $GB)).Level | Should -Be 'warn' }
    It '7.9 GB → warn' { (Test-KladezMemory -TotalBytes ([long](7.9 * $GB))).Level | Should -Be 'warn' }
    It '8 GB → ok'     { (Test-KladezMemory -TotalBytes (8 * $GB)).Level | Should -Be 'ok' }
    It 'warn message mentions slowness and AI' {
        (Test-KladezMemory -TotalBytes (6 * $GB)).Message | Should -Match 'медленно.*ИИ'
    }
}

Describe 'Test-KladezVirtualization' {
    It 'hypervisor present → ok, whatever firmware reports' {
        Test-KladezVirtualization -HypervisorPresent $true -FirmwareEnabled $false -Slat $false | Should -Be 'ok'
    }
    It 'firmware off → bios-off' {
        Test-KladezVirtualization -HypervisorPresent $false -FirmwareEnabled $false -Slat $true | Should -Be 'bios-off'
    }
    It 'firmware on, no SLAT → no-slat' {
        Test-KladezVirtualization -HypervisorPresent $false -FirmwareEnabled $true -Slat $false | Should -Be 'no-slat'
    }
    It 'firmware on with SLAT → ok' {
        Test-KladezVirtualization -HypervisorPresent $false -FirmwareEnabled $true -Slat $true | Should -Be 'ok'
    }
}

Describe 'Get-KladezDriveChoices' {
    BeforeAll {
        function D($l, $label, $free, $type = 3, $sys = $false) {
            [pscustomobject]@{ Letter = $l; Label = $label; FreeBytes = [long]($free * 1GB); DriveType = $type; IsSystem = $sys }
        }
    }
    It 'fits by free space: 14 none, 15 aptechka, 35 +biblioteka, 80 +vse' {
        $r = Get-KladezDriveChoices -Drives @((D 'C' 'S' 14 3 $true), (D 'D' 'a' 15), (D 'E' 'b' 35), (D 'F' 'c' 80))
        ($r | Where-Object Letter -eq 'C').Fits | Should -BeNullOrEmpty
        ($r | Where-Object Letter -eq 'D').Fits | Should -Be @('aptechka')
        ($r | Where-Object Letter -eq 'E').Fits | Should -Be @('aptechka', 'biblioteka')
        ($r | Where-Object Letter -eq 'F').Fits | Should -Be @('aptechka', 'biblioteka', 'vse')
    }
    It 'drops removable, network and CD drives' {
        $r = Get-KladezDriveChoices -Drives @((D 'C' 'S' 100 3 $true), (D 'G' 'usb' 500 2), (D 'N' 'net' 500 4), (D 'R' 'cd' 1 5))
        $r.Letter | Should -Be @('C')
    }
    It 'default is the non-system drive with most free space' {
        $r = Get-KladezDriveChoices -Drives @((D 'C' 'S' 900 3 $true), (D 'D' 'a' 100), (D 'E' 'b' 300))
        ($r | Where-Object IsDefault).Letter | Should -Be 'E'
        @($r | Where-Object IsDefault).Count | Should -Be 1
    }
    It 'system drive is default when it is the only one' {
        $r = Get-KladezDriveChoices -Drives @((D 'C' 'S' 100 3 $true))
        ($r | Where-Object IsDefault).Letter | Should -Be 'C'
    }
    It 'reports FreeGB rounded down' {
        (Get-KladezDriveChoices -Drives @((D 'D' 'a' 412.9))).FreeGB | Should -Be 412
    }
}

Describe 'Get-KladezPortPlan' {
    It 'free ports → 8080/8090' {
        $p = Get-KladezPortPlan -ListeningPorts @(135, 445)
        $p.AdminPort | Should -Be 8080; $p.KiwixPort | Should -Be 8090; $p.Busy | Should -BeNullOrEmpty
    }
    It '8080 busy → 8180/8190 and Busy lists it' {
        $p = Get-KladezPortPlan -ListeningPorts @(8080)
        $p.AdminPort | Should -Be 8180; $p.KiwixPort | Should -Be 8190; $p.Busy | Should -Be @(8080)
    }
    It 'main and spare ports busy → no admin port' {
        $p = Get-KladezPortPlan -ListeningPorts @(8080, 8180)
        $p.AdminPort | Should -BeNullOrEmpty
        $p.Busy | Should -Contain 8080; $p.Busy | Should -Contain 8180
    }
}

Describe 'ConvertTo-KladezWslPath' {
    It 'D:\Kladez\library → /mnt/d/Kladez/library' {
        ConvertTo-KladezWslPath 'D:\Kladez\library' | Should -Be '/mnt/d/Kladez/library'
    }
    It 'keeps Cyrillic and spaces' {
        ConvertTo-KladezWslPath 'E:\Мои файлы\Kladez\library' | Should -Be '/mnt/e/Мои файлы/Kladez/library'
    }
    It 'rejects paths without a drive letter' {
        { ConvertTo-KladezWslPath '\server\share\x' } | Should -Throw
    }
}

Describe 'checks.ps1 output file' {
    It 'writes UTF-8 without BOM, Cyrillic drive label intact' {
        $out = Join-Path $TestDrive 'checks.txt'
        $facts = [pscustomobject]@{
            Build = 19045; TotalMemoryBytes = [long](16GB)
            HypervisorPresent = $true; FirmwareEnabled = $false; Slat = $true
            ListeningPorts = @(135)
            Drives = @([pscustomobject]@{ Letter = 'D'; Label = 'Данные'; FreeBytes = [long](412GB); DriveType = 3; IsSystem = $false })
        }
        & (Join-Path $PSScriptRoot '..\scripts\checks.ps1') -OutFile $out -Facts $facts
        $bytes = [IO.File]::ReadAllBytes($out)
        ($bytes[0] -eq 0xEF -and $bytes[1] -eq 0xBB) | Should -BeFalse
        $text = [Text.Encoding]::UTF8.GetString($bytes)
        $text | Should -Match '(?m)^build\|ok\|modern\|'
        $text | Should -Match '(?m)^memory\|ok\|'
        $text | Should -Match '(?m)^virt\|ok?$'
        $text | Should -Match '(?m)^ports\|8080\|8090\|?$'
        $text | Should -Match '(?m)^drive\|D\|Данные\|412\|aptechka,biblioteka,vse\|default?$'
    }
}
