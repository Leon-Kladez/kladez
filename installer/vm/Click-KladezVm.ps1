# «Кладезъ»: щёлкнуть мышью в проверочной ВМ (координаты на снимке 1024×768) и сделать снимок экрана.
#   Click-KladezVm.ps1 -Name kladez-win11 -X 668 -Y 566 -WaitSeconds 4 -Shot D:\...\screen.png
param(
    [Parameter(Mandatory)][string]$Name,
    [int]$X = -1, [int]$Y = -1,
    [int]$WaitSeconds = 3,
    [string]$Shot
)
$ErrorActionPreference = 'Stop'
$id = (Get-VM -Name $Name).Id.Guid.ToUpper()
$m = Get-CimInstance -Namespace root\virtualization\v2 -ClassName Msvm_SyntheticMouse | Where-Object { $_.SystemName -eq $id }
if ($X -ge 0) {
    Invoke-CimMethod -InputObject $m -MethodName SetAbsolutePosition -Arguments @{ horizontalPosition = [int32]$X; verticalPosition = [int32]$Y } | Out-Null
    Start-Sleep -Milliseconds 700
    Invoke-CimMethod -InputObject $m -MethodName ClickButton -Arguments @{ buttonIndex = [uint32]1 } | Out-Null
}
Start-Sleep $WaitSeconds
if ($Shot) { & (Join-Path (Split-Path -Parent $MyInvocation.MyCommand.Path) 'Save-KladezVmScreen.ps1') -Name $Name -Path $Shot | Out-Null; $Shot }
