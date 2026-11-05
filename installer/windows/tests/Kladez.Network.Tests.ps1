# Pester 5+: доступ телефонов — брандмауэр и portproxy (спек Б6, план Задача 7).
BeforeAll {
    Import-Module (Join-Path $PSScriptRoot '..\scripts\Kladez.Network.psm1') -Force
    function PP($la, $lp, $ca, $cp) { [pscustomobject]@{ ListenAddress = $la; ListenPort = $lp; ConnectAddress = $ca; ConnectPort = $cp } }
}

Describe 'Get-KladezWslIp' {
    It 'plain IPv4' { Get-KladezWslIp -HostnameOutput "172.22.240.5 `n" | Should -Be '172.22.240.5' }
    It 'skips IPv6' { Get-KladezWslIp -HostnameOutput 'fe80::1 172.22.240.5' | Should -Be '172.22.240.5' }
    It 'skips docker bridge addresses after the first' { Get-KladezWslIp -HostnameOutput '172.22.240.5 172.17.0.1' | Should -Be '172.22.240.5' }
    It 'empty → null' { Get-KladezWslIp -HostnameOutput '' | Should -BeNullOrEmpty }
}

Describe 'ConvertFrom-KladezPortProxyShow' {
    It 'parses English and localized netsh output' {
        $text = @"

Прослушивать ipv4:           Подключиться к ipv4:

Адрес           Порт        Адрес           Порт
--------------- ----------  --------------- ----------
0.0.0.0         8080        172.22.240.5    8080
192.168.1.10    3389        10.0.0.2        3389
"@
        $r = @(ConvertFrom-KladezPortProxyShow -Text $text)
        $r.Count | Should -Be 2
        $r[0].ListenAddress | Should -Be '0.0.0.0'; $r[0].ListenPort | Should -Be 8080
        $r[0].ConnectAddress | Should -Be '172.22.240.5'; $r[0].ConnectPort | Should -Be 8080
    }
}

Describe 'Get-KladezPortProxyPlan' {
    It 'nothing yet → two add commands' {
        $plan = @(Get-KladezPortProxyPlan -WslIp '172.22.240.5' -Ports @(8080, 8090) -Existing @())
        $plan.Count | Should -Be 2
        ($plan[0] -join ' ') | Should -BeExactly 'interface portproxy add v4tov4 listenaddress=0.0.0.0 listenport=8080 connectaddress=172.22.240.5 connectport=8080'
        ($plan[1] -join ' ') | Should -BeExactly 'interface portproxy add v4tov4 listenaddress=0.0.0.0 listenport=8090 connectaddress=172.22.240.5 connectport=8090'
    }
    It 'old WSL IP → delete then add for each port' {
        $ex = @((PP '0.0.0.0' 8080 '172.22.1.1' 8080), (PP '0.0.0.0' 8090 '172.22.1.1' 8090))
        $plan = @(Get-KladezPortProxyPlan -WslIp '172.22.240.5' -Ports @(8080, 8090) -Existing $ex) | ForEach-Object { $_ -join ' ' }
        $plan | Should -Be @(
            'interface portproxy delete v4tov4 listenaddress=0.0.0.0 listenport=8080',
            'interface portproxy add v4tov4 listenaddress=0.0.0.0 listenport=8080 connectaddress=172.22.240.5 connectport=8080',
            'interface portproxy delete v4tov4 listenaddress=0.0.0.0 listenport=8090',
            'interface portproxy add v4tov4 listenaddress=0.0.0.0 listenport=8090 connectaddress=172.22.240.5 connectport=8090')
    }
    It 'same IP → nothing to do' {
        $ex = @((PP '0.0.0.0' 8080 '172.22.240.5' 8080), (PP '0.0.0.0' 8090 '172.22.240.5' 8090))
        @(Get-KladezPortProxyPlan -WslIp '172.22.240.5' -Ports @(8080, 8090) -Existing $ex).Count | Should -Be 0
    }
    It 'foreign rules on other ports or addresses are left alone' {
        $ex = @((PP '192.168.1.10' 3389 '10.0.0.2' 3389), (PP '127.0.0.1' 8080 '10.0.0.3' 80))
        $plan = @(Get-KladezPortProxyPlan -WslIp '172.22.240.5' -Ports @(8080) -Existing $ex) | ForEach-Object { $_ -join ' ' }
        $plan | Should -Be @('interface portproxy add v4tov4 listenaddress=0.0.0.0 listenport=8080 connectaddress=172.22.240.5 connectport=8080')
    }
}

Describe 'Get-KladezPortProxyRemovePlan' {
    It 'removes only our 0.0.0.0 rules' {
        $ex = @((PP '0.0.0.0' 8080 '172.22.1.1' 8080), (PP '192.168.1.10' 3389 '10.0.0.2' 3389))
        @(Get-KladezPortProxyRemovePlan -Ports @(8080, 8090) -Existing $ex) | ForEach-Object { $_ -join ' ' } |
            Should -Be @('interface portproxy delete v4tov4 listenaddress=0.0.0.0 listenport=8080')
    }
}

Describe 'New-KladezFirewallRule' {
    It 'creates one rule with the agreed parameters' {
        Mock -ModuleName Kladez.Network Get-NetFirewallRule { $null }
        Mock -ModuleName Kladez.Network New-NetFirewallRule { }
        New-KladezFirewallRule -Ports @(8080, 8090)
        Should -Invoke -ModuleName Kladez.Network New-NetFirewallRule -Times 1 -Exactly -ParameterFilter {
            $DisplayName -eq 'Кладезъ — телефоны в доме' -and $Direction -eq 'Inbound' -and $Action -eq 'Allow' -and
            $Protocol -eq 'TCP' -and (($LocalPort -join ',') -eq '8080,8090') -and $Profile -eq 'Any' -and
            (($RemoteAddress -join ',') -eq 'LocalSubnet')
        }
    }
    It 'existing rule → updated, not duplicated' {
        Mock -ModuleName Kladez.Network Get-NetFirewallRule { [pscustomobject]@{ DisplayName = 'Кладезъ — телефоны в доме' } }
        Mock -ModuleName Kladez.Network New-NetFirewallRule { }
        Mock -ModuleName Kladez.Network Set-NetFirewallRule { }
        New-KladezFirewallRule -Ports @(8180, 8190)
        Should -Invoke -ModuleName Kladez.Network New-NetFirewallRule -Times 0 -Exactly
        Should -Invoke -ModuleName Kladez.Network Set-NetFirewallRule -Times 1 -Exactly -ParameterFilter { ($LocalPort -join ',') -eq '8180,8190' }
    }
}
