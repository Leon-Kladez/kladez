# «Кладезъ»: нажать клавишу в проверочной ВМ (как человек с клавиатуры) и сделать снимок экрана.
#   Send-KladezVmKey.ps1 -Name kladez-win11 -Key Enter -Shot D:\...\screen.png
param(
    [Parameter(Mandatory)][string]$Name,
    [ValidateSet('Enter', 'Tab', 'Space', 'Esc', 'Left', 'Right', 'Up', 'Down', 'None')][string]$Key = 'None',
    [int]$Times = 1,
    [int]$WaitSeconds = 3,
    [string]$Shot
)
$ErrorActionPreference = 'Stop'
$codes = @{ Enter = 0x0D; Tab = 0x09; Space = 0x20; Esc = 0x1B; Left = 0x25; Up = 0x26; Right = 0x27; Down = 0x28 }
$id = (Get-VM -Name $Name).Id.Guid.ToUpper()
$kbd = Get-CimInstance -Namespace root\virtualization\v2 -ClassName Msvm_Keyboard | Where-Object { $_.SystemName -eq $id }
if ($Key -ne 'None') {
    for ($i = 0; $i -lt $Times; $i++) {
        Invoke-CimMethod -InputObject $kbd -MethodName TypeKey -Arguments @{ keyCode = [uint32]$codes[$Key] } | Out-Null
        Start-Sleep -Milliseconds 400
    }
}
Start-Sleep $WaitSeconds
if ($Shot) { & (Join-Path (Split-Path -Parent $MyInvocation.MyCommand.Path) 'Save-KladezVmScreen.ps1') -Name $Name -Path $Shot }
