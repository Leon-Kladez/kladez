# «Кладезъ»: создать проверочную ВМ и запустить автоматическую установку Windows (спек Б11, Задача 12).
# Запускать от администратора. Всё хранится в D:\ПРОЕКТЫ\Кладезъ\vm-images.
#   Start-KladezTestVm.ps1 -Name kladez-win11 -IsoPath ...\Windows11_....iso -Windows11
#   Start-KladezTestVm.ps1 -Name kladez-win10 -IsoPath ...\Windows10.iso
param(
    [Parameter(Mandatory)][ValidatePattern('^[A-Za-z0-9-]+$')][string]$Name,
    [Parameter(Mandatory)][string]$IsoPath,
    [switch]$Windows11,
    [string]$SwitchName = 'Default Switch',
    [string]$LogPath
)
$ErrorActionPreference = 'Stop'
if ($LogPath) { Start-Transcript -Path $LogPath -Force | Out-Null }
try {
    $here = Split-Path -Parent $MyInvocation.MyCommand.Path
    $vmRoot = 'D:\ПРОЕКТЫ\Кладезъ\vm-images\vms'
    $answerIso = Join-Path $vmRoot "$Name-answer.iso"

    # 1) Small ISO with autounattend.xml — Windows Setup reads it from the root of removable media.
    New-Item -ItemType Directory -Force -Path $vmRoot | Out-Null
    $stage = Join-Path $env:TEMP "kladez-answer-$Name"
    Remove-Item -Recurse -Force $stage -ErrorAction SilentlyContinue
    New-Item -ItemType Directory -Force -Path $stage | Out-Null
    Copy-Item (Join-Path $here 'autounattend.xml') (Join-Path $stage 'autounattend.xml')
    if (-not ('KladezIso' -as [type])) {
        Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;
using System.Runtime.InteropServices.ComTypes;
public static class KladezIso {
    public static void Write(string path, object stream, int blockSize, int totalBlocks) {
        IStream s = (IStream)stream;
        byte[] buf = new byte[blockSize];
        IntPtr pcb = Marshal.AllocHGlobal(4);
        try {
            using (var o = System.IO.File.Create(path)) {
                for (int n = 0; n < totalBlocks; n++) {
                    s.Read(buf, blockSize, pcb);
                    o.Write(buf, 0, Marshal.ReadInt32(pcb));
                }
            }
        } finally { Marshal.FreeHGlobal(pcb); }
    }
}
'@
    }
    $fsi = New-Object -ComObject IMAPI2FS.MsftFileSystemImage
    $fsi.FileSystemsToCreate = 3   # ISO9660 + Joliet
    $fsi.VolumeName = 'UNATTEND'
    $fsi.Root.AddTree($stage, $false)
    $img = $fsi.CreateResultImage()
    [KladezIso]::Write($answerIso, $img.ImageStream, $img.BlockSize, $img.TotalBlocks)
    Write-Output "Файл ответов: $answerIso"

    # 2) The VM itself (existing script; NAT 'Default Switch' — does not touch the host network adapter).
    $args2 = @{ Name = $Name; IsoPath = $IsoPath; SwitchName = $SwitchName }
    if ($Windows11) { $args2.Windows11 = $true }
    if (-not (Get-VM -Name $Name -ErrorAction SilentlyContinue)) {
        & (Join-Path $here 'New-KladezTestVm.ps1') @args2
    }
    if (-not (Get-VMDvdDrive -VMName $Name | Where-Object Path -eq $answerIso)) {
        Add-VMDvdDrive -VMName $Name -Path $answerIso
    }
    # Name is localized on non-English Windows («Интерфейс гостевой службы»): match by name in both languages.
    Get-VMIntegrationService -VMName $Name |
        Where-Object { $_.Name -match 'Guest Service|гостев' } |
        Enable-VMIntegrationService

    # 3) Start and press Enter for «Press any key to boot from CD or DVD».
    Start-VM -Name $Name
    $vm = Get-CimInstance -Namespace root\virtualization\v2 -ClassName Msvm_ComputerSystem -Filter "ElementName='$Name'"
    $kbd = Get-CimAssociatedInstance -InputObject $vm -ResultClassName Msvm_Keyboard
    for ($i = 0; $i -lt 20; $i++) {
        Start-Sleep -Milliseconds 700
        Invoke-CimMethod -InputObject $kbd -MethodName TypeKey -Arguments @{ keyCode = [uint32]0x0D } | Out-Null
    }
    Write-Output "ВМ $Name запущена, установка Windows идёт сама (20–40 минут)."
} catch {
    Write-Output "ОШИБКА: $($_.Exception.Message)"
    Write-Output $_.ScriptStackTrace
    exit 1
} finally {
    if ($LogPath) { Stop-Transcript | Out-Null }
}
