# «Кладезъ»: доступ телефонов в домашней сети (спек Б6, план Задача 7).
# WSL2 on Windows 10 is behind NAT, so phones need a firewall rule plus a portproxy from
# 0.0.0.0:<port> to the distro's current IP (it changes on every start).
Set-StrictMode -Version 3

$script:FirewallRuleName = 'Кладезъ — телефоны в доме'
$script:Ipv4 = '(?<![\d.])(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})(?![\d.])'

function Get-KladezWslIp {
    param([AllowEmptyString()][string]$HostnameOutput = '')
    foreach ($token in $HostnameOutput -split '\s+') {
        if ($token -match "^$script:Ipv4$") { return $token }
    }
    $null
}

function ConvertFrom-KladezPortProxyShow {
    param([AllowEmptyString()][string]$Text = '')
    foreach ($line in $Text -split "`r?`n") {
        $parts = @($line.Trim() -split '\s+')
        if ($parts.Count -eq 4 -and $parts[0] -match "^$script:Ipv4$" -and $parts[2] -match "^$script:Ipv4$" -and
            $parts[1] -match '^\d+$' -and $parts[3] -match '^\d+$') {
            [pscustomobject]@{ ListenAddress = $parts[0]; ListenPort = [int]$parts[1]
                ConnectAddress = $parts[2]; ConnectPort = [int]$parts[3] }
        }
    }
}

function Get-KladezPortProxyPlan {
    param(
        [Parameter(Mandatory)][string]$WslIp,
        [Parameter(Mandatory)][int[]]$Ports,
        [AllowEmptyCollection()][object[]]$Existing = @()
    )
    foreach ($port in $Ports) {
        $ours = @($Existing | Where-Object { $_.ListenAddress -eq '0.0.0.0' -and $_.ListenPort -eq $port })
        $current = $ours | Where-Object { $_.ConnectAddress -eq $WslIp -and $_.ConnectPort -eq $port }
        if ($current) { continue }
        if ($ours.Count -gt 0) {
            , @('interface', 'portproxy', 'delete', 'v4tov4', 'listenaddress=0.0.0.0', "listenport=$port")
        }
        , @('interface', 'portproxy', 'add', 'v4tov4', 'listenaddress=0.0.0.0', "listenport=$port",
            "connectaddress=$WslIp", "connectport=$port")
    }
}

function Get-KladezPortProxyRemovePlan {
    param(
        [Parameter(Mandatory)][int[]]$Ports,
        [AllowEmptyCollection()][object[]]$Existing = @()
    )
    foreach ($e in $Existing) {
        if ($e.ListenAddress -eq '0.0.0.0' -and $Ports -contains $e.ListenPort) {
            , @('interface', 'portproxy', 'delete', 'v4tov4', 'listenaddress=0.0.0.0', "listenport=$($e.ListenPort)")
        }
    }
}

function New-KladezFirewallRule {
    param([Parameter(Mandatory)][int[]]$Ports)
    $ports = [string[]]$Ports
    $existing = Get-NetFirewallRule -DisplayName $script:FirewallRuleName -ErrorAction SilentlyContinue
    if ($existing) {
        Set-NetFirewallRule -DisplayName $script:FirewallRuleName -LocalPort $ports -Protocol TCP -RemoteAddress LocalSubnet -Profile Any
    } else {
        New-NetFirewallRule -DisplayName $script:FirewallRuleName -Direction Inbound -Action Allow -Protocol TCP `
            -LocalPort $ports -Profile Any -RemoteAddress LocalSubnet | Out-Null
    }
}

function Remove-KladezFirewallRule {
    Remove-NetFirewallRule -DisplayName $script:FirewallRuleName -ErrorAction SilentlyContinue
}

Export-ModuleMember -Function Get-KladezWslIp, ConvertFrom-KladezPortProxyShow, Get-KladezPortProxyPlan,
    Get-KladezPortProxyRemovePlan, New-KladezFirewallRule, Remove-KladezFirewallRule
