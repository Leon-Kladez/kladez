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

# --- Адрес компьютера для QR-кода «Открыть на телефоне» (часть 4) ---
# Панель живёт в Docker внутри WSL и адресов Windows не видит. При каждом запуске пишем их
# в файл в папке библиотеки (она же /app/storage панели): .kladez-network.json.
$script:NetworkFileName = '.kladez-network.json'
# Виртуальные адаптеры и VPN: с телефона по ним не достучаться.
$script:VirtualAdapter = 'Hyper-V|vEthernet|WSL|Docker|VirtualBox|VMware|VPN|TAP-|Wintun|WireGuard|OpenVPN|Tailscale|ZeroTier|Fortinet|AnyConnect|Juniper|Loopback|Bluetooth'

function Test-KladezPrivateIPv4 {
    param([AllowEmptyString()][string]$Ip = '')
    if ($Ip -notmatch "^$script:Ipv4$") { return $false }
    $b = @($Ip.Split('.') | ForEach-Object { [int]$_ })
    if (@($b | Where-Object { $_ -gt 255 }).Count) { return $false }
    ($b[0] -eq 10) -or ($b[0] -eq 172 -and $b[1] -ge 16 -and $b[1] -le 31) -or ($b[0] -eq 192 -and $b[1] -eq 168)
}

# $Adapters — как у Get-NetAdapter -Physical (ifIndex, Name, Status, PhysicalMediaType, InterfaceDescription);
# $Addresses — как у Get-NetIPAddress -AddressFamily IPv4 (InterfaceIndex, IPAddress, AddressState).
# Возвращает подходящие адреса: сначала Wi-Fi, потом кабель.
function Get-KladezLanAddress {
    param(
        [AllowEmptyCollection()][object[]]$Adapters = @(),
        [AllowEmptyCollection()][object[]]$Addresses = @()
    )
    $found = foreach ($a in $Adapters) {
        if ("$($a.Status)" -ne 'Up') { continue }
        if ("$($a.InterfaceDescription) $($a.Name)" -match $script:VirtualAdapter) { continue }
        $media = "$($a.PhysicalMediaType)"
        $kind = if ($media -match '802\.11|Wireless') { 'wifi' } elseif ($media -match '802\.3') { 'ethernet' } else { 'other' }
        foreach ($ip in @($Addresses | Where-Object { $_.InterfaceIndex -eq $a.ifIndex })) {
            if ($ip.AddressState -and "$($ip.AddressState)" -ne 'Preferred') { continue }
            if (-not (Test-KladezPrivateIPv4 -Ip "$($ip.IPAddress)")) { continue }
            [pscustomobject]@{ ip = "$($ip.IPAddress)"; kind = $kind; name = "$($a.Name)" }
        }
    }
    $order = @{ wifi = 0; ethernet = 1; other = 2 }
    @($found | Sort-Object -Property @{ Expression = { $order[$_.kind] } }, ip -Unique)
}

function ConvertTo-KladezNetworkJson {
    param(
        [AllowEmptyCollection()][object[]]$Addresses = @(),
        [Parameter(Mandatory)][int]$AdminPort,
        [datetime]$Now = (Get-Date),
        # Память и диски самого компьютера: панель в WSL видит только свою долю (обычно половину памяти)
        # и виртуальный диск отсека, а человеку нужно то, что показывает Windows.
        [long]$MemoryBytes = 0,
        [AllowEmptyCollection()][object[]]$Disks = @()
    )
    $data = [ordered]@{
        adminPort = $AdminPort
        updatedAt = $Now.ToUniversalTime().ToString('yyyy-MM-ddTHH:mm:ssZ')
        addresses = @($Addresses)
    }
    if ($MemoryBytes -gt 0) { $data.memoryBytes = $MemoryBytes }
    if (@($Disks).Count) { $data.disks = @($Disks) }
    ConvertTo-Json -Depth 4 -InputObject $data
}

# Локальные диски Windows (как в «Этот компьютер»): буква, объём, свободно.
function Get-KladezHostDisk {
    param([AllowEmptyCollection()][object[]]$LogicalDisks = @())
    @($LogicalDisks | Where-Object { [int]$_.DriveType -eq 3 -and [long]$_.Size -gt 0 } | ForEach-Object {
        [pscustomobject]@{ name = "$($_.DeviceID)"; sizeBytes = [long]$_.Size; freeBytes = [long]$_.FreeSpace }
    } | Sort-Object name)
}

# Записать файл для панели (через временный файл, чтобы панель не прочла половину).
function Write-KladezNetworkFile {
    param([Parameter(Mandatory)][string]$LibraryDir, [Parameter(Mandatory)][string]$Json)
    $path = Join-Path $LibraryDir $script:NetworkFileName
    $tmp = "$path.tmp"
    [IO.File]::WriteAllText($tmp, $Json, (New-Object System.Text.UTF8Encoding($false)))
    Move-Item -LiteralPath $tmp -Destination $path -Force
    $path
}

Export-ModuleMember -Function Get-KladezWslIp, ConvertFrom-KladezPortProxyShow, Get-KladezPortProxyPlan,
    Get-KladezPortProxyRemovePlan, New-KladezFirewallRule, Remove-KladezFirewallRule,
    Test-KladezPrivateIPv4, Get-KladezLanAddress, ConvertTo-KladezNetworkJson, Write-KladezNetworkFile, Get-KladezHostDisk
