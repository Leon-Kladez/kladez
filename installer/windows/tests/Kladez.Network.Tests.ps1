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

Describe 'Test-KladezPrivateIPv4' {
    It 'home ranges' {
        Test-KladezPrivateIPv4 -Ip '192.168.1.37' | Should -BeTrue
        Test-KladezPrivateIPv4 -Ip '10.0.0.5' | Should -BeTrue
        Test-KladezPrivateIPv4 -Ip '172.20.1.1' | Should -BeTrue
    }
    It 'not home' {
        Test-KladezPrivateIPv4 -Ip '8.8.8.8' | Should -BeFalse
        Test-KladezPrivateIPv4 -Ip '169.254.10.1' | Should -BeFalse
        Test-KladezPrivateIPv4 -Ip '172.32.0.1' | Should -BeFalse
        Test-KladezPrivateIPv4 -Ip '192.168.1.300' | Should -BeFalse
        Test-KladezPrivateIPv4 -Ip '' | Should -BeFalse
    }
}

Describe 'Get-KladezLanAddress' {
    BeforeAll {
        function NA($idx, $name, $media, $desc, $status = 'Up') {
            [pscustomobject]@{ ifIndex = $idx; Name = $name; Status = $status; PhysicalMediaType = $media; InterfaceDescription = $desc }
        }
        function IP($idx, $ip, $state = 'Preferred') { [pscustomobject]@{ InterfaceIndex = $idx; IPAddress = $ip; AddressState = $state } }
    }
    It 'Wi-Fi first, then cable; skips VPN, disconnected, APIPA and public' {
        $adapters = @(
            (NA 3 'Ethernet' '802.3' 'Realtek PCIe GbE Family Controller'),
            (NA 7 'Беспроводная сеть' 'Native 802.11' 'Intel(R) Wi-Fi 6 AX201'),
            (NA 9 'VPN' '802.3' 'TAP-Windows Adapter V9'),
            (NA 11 'Ethernet 2' '802.3' 'Intel(R) Ethernet' 'Disconnected')
        )
        $ips = @((IP 3 '192.168.0.105'), (IP 7 '192.168.1.37'), (IP 7 '169.254.3.3'), (IP 9 '10.8.0.2'),
            (IP 11 '192.168.5.5'), (IP 3 '85.1.2.3'), (IP 3 '192.168.0.106' 'Tentative'))
        $r = @(Get-KladezLanAddress -Adapters $adapters -Addresses $ips)
        $r.Count | Should -Be 2
        $r[0].ip | Should -Be '192.168.1.37'; $r[0].kind | Should -Be 'wifi'; $r[0].name | Should -Be 'Беспроводная сеть'
        $r[1].ip | Should -Be '192.168.0.105'; $r[1].kind | Should -Be 'ethernet'
    }
    It 'nothing → empty' { @(Get-KladezLanAddress -Adapters @() -Addresses @()).Count | Should -Be 0 }
}

Describe 'ConvertTo-KladezNetworkJson / Write-KladezNetworkFile' {
    It 'one address stays an array; file is UTF-8 without BOM' {
        $one = @([pscustomobject]@{ ip = '192.168.1.37'; kind = 'wifi'; name = 'Беспроводная сеть' })
        $json = ConvertTo-KladezNetworkJson -Addresses $one -AdminPort 8080 -Now ([datetime]'2026-11-07T10:00:00Z')
        $dir = Join-Path ([IO.Path]::GetTempPath()) ("kladez-net-" + [guid]::NewGuid())
        New-Item -ItemType Directory -Path $dir | Out-Null
        try {
            $path = Write-KladezNetworkFile -LibraryDir $dir -Json $json
            Split-Path -Leaf $path | Should -Be '.kladez-network.json'
            $bytes = [IO.File]::ReadAllBytes($path)
            $bytes[0] | Should -Not -Be 0xEF
            $data = [IO.File]::ReadAllText($path) | ConvertFrom-Json
            $data.adminPort | Should -Be 8080
            @($data.addresses).Count | Should -Be 1
            $data.addresses[0].name | Should -Be 'Беспроводная сеть'
            ([IO.File]::ReadAllText($path)) | Should -Match '"addresses":\s*\['
            Test-Path "$path.tmp" | Should -BeFalse
        } finally { Remove-Item -Recurse -Force $dir }
    }
    It 'no addresses → empty array' {
        (ConvertTo-KladezNetworkJson -Addresses @() -AdminPort 8080) | Should -Match '"addresses":\s*\[\s*\]'
    }
}
