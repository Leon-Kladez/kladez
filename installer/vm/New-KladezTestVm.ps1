# «Кладезъ»: проверочная виртуальная машина Hyper-V для установщика (спек Б11, план Задача 12).
#
# Всё хранится внутри папки проекта (правило автора): диски и конфигурация ВМ —
# <VmRoot>\<Name>\, ISO — в vm-images\. Ничего не создаётся в папках Hyper-V по умолчанию на C:.
#
# Запускать от администратора, ТОЛЬКО когда автор сам включил Hyper-V.
#   New-KladezTestVm.ps1 -Name kladez-win10 -IsoPath D:\ПРОЕКТЫ\Кладезъ\vm-images\Win10_22H2_Russian_x64.iso
#   New-KladezTestVm.ps1 -Name kladez-win11 -IsoPath ...\Win11_Russian_x64.iso -Windows11
#   New-KladezTestVm.ps1 -Name kladez-nobios -IsoPath ... -NoNestedVirtualization   # «виртуализация выключена в BIOS»
#   New-KladezTestVm.ps1 -Name kladez-win10 -WhatIfOnly   # только показать, что будет сделано
param(
    [Parameter(Mandatory)][ValidatePattern('^[A-Za-z0-9-]+$')][string]$Name,
    [string]$IsoPath,
    [string]$VmRoot = 'D:\ПРОЕКТЫ\Кладезъ\vm-images\vms',
    [int64]$MemoryBytes = 8GB,
    [int]$ProcessorCount = 2,
    [int64]$DiskBytes = 80GB,
    [string]$SwitchName = 'Кладезъ — внешняя сеть',
    [switch]$Windows11,
    [switch]$NoNestedVirtualization,
    [switch]$WhatIfOnly
)
$ErrorActionPreference = 'Stop'
$projectRoot = 'D:\ПРОЕКТЫ\Кладезъ'
$vmDir = Join-Path $VmRoot $Name
$vhd = Join-Path $vmDir "$Name.vhdx"

# Guard: never write outside the project folder.
foreach ($p in @($VmRoot, $vmDir, $vhd)) {
    if (-not ([IO.Path]::GetFullPath($p)).StartsWith($projectRoot, [StringComparison]::OrdinalIgnoreCase)) {
        throw "Путь $p вне папки проекта $projectRoot — так нельзя (правило автора)."
    }
}

$plan = @(
    "ВМ:        $Name (поколение 2, $([math]::Round($MemoryBytes/1GB)) ГБ ОЗУ, $ProcessorCount ядра)",
    "Папка:     $vmDir",
    "Диск:      $vhd (динамический, до $([math]::Round($DiskBytes/1GB)) ГБ)",
    "ISO:       $(if ($IsoPath) { $IsoPath } else { '(не задан)' })",
    "Сеть:      $SwitchName (внешний коммутатор — чтобы телефон в той же сети видел ВМ)",
    "Вложенная виртуализация: $(if ($NoNestedVirtualization) { 'ВЫКЛ (имитация «выключено в BIOS»)' } else { 'вкл (нужна WSL2 внутри ВМ)' })",
    "Windows 11 (TPM): $(if ($Windows11) { 'да' } else { 'нет' })",
    "Снимок:    «чистая» — после установки Windows его нужно сделать вручную (Checkpoint-VM -Name $Name -SnapshotName чистая)"
)
$plan | ForEach-Object { Write-Output $_ }
if ($WhatIfOnly) { return }

if (-not (Get-Command New-VM -ErrorAction SilentlyContinue)) {
    throw 'Hyper-V не включён. Его включает автор сам (Панель управления → Компоненты Windows → Hyper-V), потом нужна перезагрузка.'
}
if (-not $IsoPath -or -not (Test-Path -LiteralPath $IsoPath)) { throw "Не найден образ Windows: $IsoPath" }
if (Get-VM -Name $Name -ErrorAction SilentlyContinue) { throw "ВМ $Name уже есть." }

if (-not (Get-VMSwitch -Name $SwitchName -ErrorAction SilentlyContinue)) {
    $nic = Get-NetAdapter -Physical | Where-Object Status -eq 'Up' | Sort-Object -Property LinkSpeed -Descending | Select-Object -First 1
    if (-not $nic) { throw 'Не найден подключённый сетевой адаптер для внешнего коммутатора.' }
    New-VMSwitch -Name $SwitchName -NetAdapterName $nic.Name -AllowManagementOS $true | Out-Null
}

New-Item -ItemType Directory -Force -Path $vmDir | Out-Null
New-VM -Name $Name -Generation 2 -MemoryStartupBytes $MemoryBytes -Path $VmRoot `
    -NewVHDPath $vhd -NewVHDSizeBytes $DiskBytes -SwitchName $SwitchName | Out-Null
Set-VM -Name $Name -ProcessorCount $ProcessorCount -StaticMemory -CheckpointType Standard `
    -SnapshotFileLocation $vmDir -SmartPagingFilePath $vmDir -AutomaticCheckpointsEnabled $false
# Nested virtualization needs static memory and MAC spoofing for WSL2 networking inside the VM.
if (-not $NoNestedVirtualization) {
    Set-VMProcessor -VMName $Name -ExposeVirtualizationExtensions $true
    Set-VMNetworkAdapter -VMName $Name -MacAddressSpoofing On
}
if ($Windows11) {
    Set-VMKeyProtector -VMName $Name -NewLocalKeyProtector
    Enable-VMTPM -VMName $Name
}
$dvd = Add-VMDvdDrive -VMName $Name -Path $IsoPath -Passthru
Set-VMFirmware -VMName $Name -FirstBootDevice $dvd
Write-Output "Готово. Запустите ВМ: Start-VM -Name $Name; vmconnect localhost $Name"
