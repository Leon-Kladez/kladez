# «Кладезъ»: задачи Планировщика и удаление программы (спек Б7–Б8, план Задача 7).
Set-StrictMode -Version 3
Import-Module (Join-Path $PSScriptRoot 'Kladez.Wsl.psm1')       # Invoke-KladezNative
Import-Module (Join-Path $PSScriptRoot 'Kladez.Network.psm1')   # portproxy, firewall

$script:AutostartTask = 'Кладезъ'
$script:NetworkTask = 'Кладезъ — сеть'

# Folders and files the program itself creates in the library (admin/database/seeders/
# service_seeder.ts binds + admin storage paths). Anything else belongs to the person.
$script:KnownLibraryEntries = @(
    'zim', 'maps', 'pmtiles', 'books', 'media', 'logs', 'kb_uploads', 'drug-data', 'ollama', 'qdrant',
    'calibreweb', 'filebrowser', 'flatnotes', 'homebox', 'jellyfin', 'kolibri', 'kolibri-gen2',
    'meshcore-web', 'stirling-pdf', 'translate', 'vaultwarden',
    'nomad-disk-info.json', 'nomad-disk-info.json.tmp', '.nomad-gpu-type', '.nomad-amd-gfx',
    'Как вернуть библиотеку.txt', 'Что это за папка.txt'
)

function Register-KladezTasks {
    param(
        [Parameter(Mandatory)][string]$LauncherPath,
        [Parameter(Mandatory)][string]$NetScriptPath,
        [Parameter(Mandatory)][string]$UserId
    )
    $autostart = New-ScheduledTaskAction -Execute $LauncherPath -Argument '--background'
    $logon = New-ScheduledTaskTrigger -AtLogOn -User $UserId
    $user = New-ScheduledTaskPrincipal -UserId $UserId -LogonType Interactive -RunLevel Limited
    $settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -ExecutionTimeLimit ([TimeSpan]::Zero)
    Register-ScheduledTask -TaskName $script:AutostartTask -Action $autostart -Trigger $logon -Principal $user -Settings $settings -Force | Out-Null

    $netArgs = "-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$NetScriptPath`""
    $net = New-ScheduledTaskAction -Execute 'powershell.exe' -Argument $netArgs
    $admin = New-ScheduledTaskPrincipal -UserId $UserId -LogonType Interactive -RunLevel Highest
    Register-ScheduledTask -TaskName $script:NetworkTask -Action $net -Principal $admin -Settings $settings -Force | Out-Null
}

function Unregister-KladezTasks {
    foreach ($t in $script:AutostartTask, $script:NetworkTask) {
        Unregister-ScheduledTask -TaskName $t -Confirm:$false -ErrorAction SilentlyContinue
    }
}

function Test-KladezLibrarySafeToDelete {
    param([Parameter(Mandatory)][string]$LibraryDir)
    if ($LibraryDir -match '^[A-Za-z]:\\?$') { return $false }
    if (-not (Test-Path -LiteralPath $LibraryDir -PathType Container)) { return $false }
    foreach ($item in Get-ChildItem -LiteralPath $LibraryDir -Force) {
        if ($script:KnownLibraryEntries -notcontains $item.Name) { return $false }
    }
    $true
}

function Invoke-KladezUninstall {
    param(
        [Parameter(Mandatory)][AllowEmptyString()][string]$LibraryDir,
        [Parameter(Mandatory)][int[]]$Ports,
        [Parameter(Mandatory)][bool]$RemoveLibrary
    )
    [void](Invoke-KladezNative -FilePath 'wsl.exe' -Arguments @('--terminate', 'Kladez'))
    [void](Invoke-KladezNative -FilePath 'wsl.exe' -Arguments @('--unregister', 'Kladez'))
    Unregister-KladezTasks
    Remove-KladezFirewallRule
    $show = Invoke-KladezNative -FilePath 'netsh.exe' -Arguments @('interface', 'portproxy', 'show', 'v4tov4')
    $existing = @(ConvertFrom-KladezPortProxyShow -Text $show.Output)
    foreach ($cmd in @(Get-KladezPortProxyRemovePlan -Ports $Ports -Existing $existing)) {
        [void](Invoke-KladezNative -FilePath 'netsh.exe' -Arguments $cmd)
    }

    if (-not $LibraryDir) { return 'Программа удалена. Где лежит библиотека, неизвестно — она не тронута.' }
    if ($RemoveLibrary -and (Test-KladezLibrarySafeToDelete -LibraryDir $LibraryDir)) {
        Remove-Item -LiteralPath $LibraryDir -Recurse -Force
        return 'Программа и библиотека удалены.'
    }
    if (Test-Path -LiteralPath $LibraryDir -PathType Container) {
        $note = @(
            'Здесь лежит библиотека программы «Кладезъ»: статьи, карты и другие скачанные материалы.',
            'Программа удалена, а библиотека оставлена, чтобы её не пришлось скачивать заново.',
            '',
            'Как вернуть: установите «Кладезъ» снова и выберите тот же диск — установщик найдёт эту папку сам.',
            'Если библиотека больше не нужна, эту папку можно просто удалить.'
        ) -join "`r`n"
        [IO.File]::WriteAllText((Join-Path $LibraryDir 'Как вернуть библиотеку.txt'), $note, (New-Object System.Text.UTF8Encoding($true)))
    }
    if ($RemoveLibrary) {
        return "Программа удалена. Библиотека в $LibraryDir не удалена: в папке есть чужие файлы. Удалите её вручную, если она не нужна."
    }
    'Программа удалена. Библиотека оставлена.'
}

Export-ModuleMember -Function Register-KladezTasks, Unregister-KladezTasks, Test-KladezLibrarySafeToDelete, Invoke-KladezUninstall
