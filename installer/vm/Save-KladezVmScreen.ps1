# «Кладезъ»: снимок экрана проверочной ВМ в PNG (1024×768 — больше Hyper-V не отдаёт, код 32775).
param([Parameter(Mandatory)][string]$Name, [Parameter(Mandatory)][string]$Path)
$ErrorActionPreference = 'Stop'
$w = 1024; $h = 768
$svc = Get-WmiObject -Namespace root\virtualization\v2 -Class Msvm_VirtualSystemManagementService
$cs = Get-WmiObject -Namespace root\virtualization\v2 -Class Msvm_ComputerSystem -Filter "ElementName='$Name'"
$set = $cs.GetRelated('Msvm_VirtualSystemSettingData') | Where-Object { $_.VirtualSystemType -eq 'Microsoft:Hyper-V:System:Realized' } | Select-Object -First 1
$r = $svc.GetVirtualSystemThumbnailImage($set, $w, $h)
if ($r.ReturnValue -ne 0 -or -not $r.ImageData) { throw "Hyper-V не отдал кадр (код $($r.ReturnValue))" }
Add-Type -AssemblyName System.Drawing
$bmp = New-Object System.Drawing.Bitmap($w, $h, [System.Drawing.Imaging.PixelFormat]::Format16bppRgb565)
$data = $bmp.LockBits((New-Object System.Drawing.Rectangle(0, 0, $w, $h)), [System.Drawing.Imaging.ImageLockMode]::WriteOnly, $bmp.PixelFormat)
[System.Runtime.InteropServices.Marshal]::Copy([byte[]]$r.ImageData, 0, $data.Scan0, [Math]::Min($r.ImageData.Length, $data.Stride * $h))
$bmp.UnlockBits($data); $bmp.Save($Path, [System.Drawing.Imaging.ImageFormat]::Png); $bmp.Dispose()
$Path
