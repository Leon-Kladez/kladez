# «Кладезъ»: полная проверка установщика на чистых ВМ Windows 11 и Windows 10 (спек Б11, Задача 12).
# Запускать от администратора. Отчёт: D:\ПРОЕКТЫ\Кладезъ\vm-images\test-report.txt
#   -ShutdownWhenDone  — выключить этот компьютер в конце (по просьбе автора).
param(
    [string]$InstallerZipGlob = 'D:\Загрузки\kladez-installer*.zip',
    [switch]$ShutdownWhenDone
)
$ErrorActionPreference = 'Stop'
$root = 'D:\ПРОЕКТЫ\Кладезъ'
$here = Join-Path $root 'installer\vm'
$images = Join-Path $root 'vm-images'
$report = Join-Path $images 'test-report.txt'
Start-Transcript -Path (Join-Path $images 'test-run.log') -Force | Out-Null
$pw = ConvertTo-SecureString 'Kladez-test-2026' -AsPlainText -Force   # test account inside the test VM only
$cred = New-Object System.Management.Automation.PSCredential('tester', $pw)

function Say($m) { $line = "[$(Get-Date -Format 'HH:mm:ss')] $m"; Write-Output $line; Add-Content -Path $report -Value $line -Encoding UTF8 }

function Wait-Guest($vm, [int]$minutes = 60) {
    $until = (Get-Date).AddMinutes($minutes)
    while ((Get-Date) -lt $until) {
        try { $r = Invoke-Command -VMName $vm -Credential $cred -ScriptBlock { 'ok' } -ErrorAction Stop; if ($r -eq 'ok') { return $true } } catch {}
        Start-Sleep 20
    }
    return $false
}

function Save-Screenshot($vm, $file) {
    try {
        $svc = Get-CimInstance -Namespace root\virtualization\v2 -ClassName Msvm_VirtualSystemManagementService
        $set = Get-CimInstance -Namespace root\virtualization\v2 -ClassName Msvm_VirtualSystemSettingData -Filter "ElementName='$vm' AND VirtualSystemType='Microsoft:Hyper-V:System:Realized'"
        $w = 1280; $h = 800
        $res = Invoke-CimMethod -InputObject $svc -MethodName GetVirtualSystemThumbnailImage -Arguments @{ TargetSystem = $set; WidthPixels = [uint16]$w; HeightPixels = [uint16]$h }
        Add-Type -AssemblyName System.Drawing
        $bmp = New-Object System.Drawing.Bitmap($w, $h, [System.Drawing.Imaging.PixelFormat]::Format16bppRgb565)
        $rect = New-Object System.Drawing.Rectangle(0, 0, $w, $h)
        $data = $bmp.LockBits($rect, [System.Drawing.Imaging.ImageLockMode]::WriteOnly, $bmp.PixelFormat)
        [System.Runtime.InteropServices.Marshal]::Copy([byte[]]$res.ImageData, 0, $data.Scan0, $res.ImageData.Length)
        $bmp.UnlockBits($data); $bmp.Save($file, [System.Drawing.Imaging.ImageFormat]::Png); $bmp.Dispose()
        Say "Снимок экрана: $file"
    } catch { Say "Снимок экрана не получился: $($_.Exception.Message)" }
}

function Run-AsTester($vm, $cmdLine, $taskName) {
    # Start a program in tester's interactive desktop session, elevated — like a person double-clicking it.
    Invoke-Command -VMName $vm -Credential $cred -ArgumentList $cmdLine, $taskName -ScriptBlock {
        param($cmdLine, $taskName)
        $a = New-ScheduledTaskAction -Execute 'cmd.exe' -Argument "/c $cmdLine"
        $p = New-ScheduledTaskPrincipal -UserId 'tester' -LogonType Interactive -RunLevel Highest
        Register-ScheduledTask -TaskName $taskName -Action $a -Principal $p -Force | Out-Null
        Start-ScheduledTask -TaskName $taskName
    }
}

function Wait-NoSetup($vm, [int]$minutes) {
    $until = (Get-Date).AddMinutes($minutes)
    Start-Sleep 30
    while ((Get-Date) -lt $until) {
        try {
            $n = Invoke-Command -VMName $vm -Credential $cred -ScriptBlock {
                @(Get-Process | Where-Object { $_.Path -like 'C:\Kladez-test\*' -or $_.Path -like '*\is-*.tmp\*' }).Count
            } -ErrorAction Stop
            if ($n -eq 0) { return $true }
        } catch {}
        Start-Sleep 30
    }
    return $false
}

function Test-Installer($vm, $iso, [switch]$Win11, $setupExe) {
    Say "=== ${vm}: создаю чистую машину ==="
    $old = Get-VM -Name $vm -ErrorAction SilentlyContinue
    if ($old) { Stop-VM -Name $vm -TurnOff -Force -ErrorAction SilentlyContinue; Remove-VM -Name $vm -Force; Remove-Item -Recurse -Force (Join-Path $images "vms\$vm") -ErrorAction SilentlyContinue }
    $a = @{ Name = $vm; IsoPath = $iso }; if ($Win11) { $a.Windows11 = $true }
    & (Join-Path $here 'Start-KladezTestVm.ps1') @a | ForEach-Object { Say $_ }
    if (-not (Wait-Guest $vm 75)) { Say "ПРОВАЛ: Windows в $vm не установилась за 75 минут"; Save-Screenshot $vm (Join-Path $images "$vm-fail.png"); return }
    Say "Windows установлена, тестовый пользователь вошёл"
    Start-Sleep 60   # let first logon finish (desktop, FirstLogonCommands)
    Checkpoint-VM -Name $vm -SnapshotName 'чистая'

    Say "Копирую установщик в машину"
    Copy-VMFile -Name $vm -SourcePath $setupExe -DestinationPath 'C:\Kladez-test\setup.exe' -CreateFullPath -FileSource Host -Force

    $start = Get-Date
    Say "Запускаю установщик (как человек: на рабочем столе, с правами администратора; без вопросов — /SILENT)"
    Run-AsTester $vm 'C:\Kladez-test\setup.exe /SILENT /SUPPRESSMSGBOXES /NORESTART /LOG=C:\Kladez-test\setup-1.log' 'KladezSetup1'
    for ($round = 1; $round -le 3; $round++) {
        if (-not (Wait-NoSetup $vm 90)) { Say "ПРОВАЛ: установщик работает дольше 90 минут"; break }
        $resume = Invoke-Command -VMName $vm -Credential $cred -ScriptBlock {
            (Get-ItemProperty 'HKLM:\Software\Microsoft\Windows\CurrentVersion\RunOnce' -ErrorAction SilentlyContinue).KladezSetup
        }
        if (-not $resume) { break }
        $n = $round + 1
        Say "Установщик попросил перезагрузку (этап $round). Перезагружаю; после входа он продолжит сам."
        Invoke-Command -VMName $vm -Credential $cred -ArgumentList $resume, $n -ScriptBlock {
            param($resume, $n)
            Set-ItemProperty 'HKLM:\Software\Microsoft\Windows\CurrentVersion\RunOnce' -Name KladezSetup -Value "$resume /SILENT /SUPPRESSMSGBOXES /NORESTART /LOG=C:\Kladez-test\setup-$n.log"
        }
        Restart-VM -Name $vm -Force
        Start-Sleep 60
        if (-not (Wait-Guest $vm 20)) { Say "ПРОВАЛ: машина не загрузилась после перезагрузки"; return }
    }
    $mins = [math]::Round(((Get-Date) - $start).TotalMinutes)
    Say "Установщик закончил работу за $mins мин."

    $check = Invoke-Command -VMName $vm -Credential $cred -ScriptBlock {
        $o = [ordered]@{}
        $links = @(Get-ChildItem 'C:\Users\Public\Desktop', 'C:\Users\tester\Desktop' -Filter '*.lnk' -ErrorAction SilentlyContinue | Select-Object -Expand Name)
        $o['Ярлыки на рабочем столе'] = ($links -join ', ')
        $o['Ярлык «Кладезъ» есть'] = [bool]($links | Where-Object { $_ -like '*Кладез*' })
        $ok = $false; $title = ''
        for ($i = 0; $i -lt 30 -and -not $ok; $i++) {
            try { $r = Invoke-WebRequest 'http://localhost:8080/' -UseBasicParsing -TimeoutSec 10; $ok = $r.StatusCode -eq 200; if ($r.Content -match '<title>([^<]*)') { $title = $Matches[1] } } catch { Start-Sleep 20 }
        }
        $o['Панель http://localhost:8080 отвечает'] = $ok
        $o['Заголовок страницы'] = $title
        $o['Журналы установщика'] = (Get-ChildItem 'C:\Kladez-test\setup-*.log' | ForEach-Object { $_.Name + ' (' + [math]::Round($_.Length / 1KB) + ' КБ)' }) -join ', '
        $o['Последние строки журнала'] = (Get-ChildItem 'C:\Kladez-test\setup-*.log' | Sort-Object LastWriteTime | Select-Object -Last 1 | Get-Content -Tail 15) -join "`n    "
        $o
    }
    foreach ($k in $check.Keys) { Say "  ${k}: $($check[$k])" }
    try {
        $logs = Invoke-Command -VMName $vm -Credential $cred -ScriptBlock { Get-ChildItem 'C:\Kladez-test\*.log' | ForEach-Object { @{ n = $_.Name; t = (Get-Content $_.FullName -Raw) } } }
        foreach ($l in $logs) { Set-Content -Path (Join-Path $images "$vm-$($l.n)") -Value $l.t -Encoding UTF8 }
    } catch {}
    Run-AsTester $vm 'start "" "http://localhost:8080/"' 'KladezOpen'
    Start-Sleep 40
    Save-Screenshot $vm (Join-Path $images "$vm-result.png")
    if ($check['Панель http://localhost:8080 отвечает'] -and $check['Ярлык «Кладезъ» есть']) { Say "ИТОГ ${vm}: УСПЕХ" } else { Say "ИТОГ ${vm}: ЕСТЬ ПРОБЛЕМЫ — см. журналы" }
    Stop-VM -Name $vm -Force -ErrorAction SilentlyContinue
}

try {
    Set-Content -Path $report -Value "Проверка установщика «Кладезъ» — $(Get-Date -Format 'yyyy-MM-dd HH:mm')" -Encoding UTF8
    Say "Жду, пока скачается установщик…"
    $zip = $null
    for ($i = 0; $i -lt 360 -and -not $zip; $i++) { $zip = Get-ChildItem $InstallerZipGlob -ErrorAction SilentlyContinue | Select-Object -First 1; if (-not $zip) { Start-Sleep 10 } }
    if (-not $zip) { throw 'Установщик так и не скачался за час.' }
    Start-Sleep 5
    $dest = Join-Path $root 'preview\installer'
    Remove-Item -Recurse -Force $dest -ErrorAction SilentlyContinue
    New-Item -ItemType Directory -Force $dest | Out-Null
    Move-Item $zip.FullName $dest
    Expand-Archive -Path (Join-Path $dest $zip.Name) -DestinationPath $dest -Force
    Remove-Item (Join-Path $dest $zip.Name)
    $exe = Get-ChildItem $dest -Recurse -Filter *.exe | Sort-Object Length -Descending | Select-Object -First 1
    Say "Установщик: $($exe.Name), $([math]::Round($exe.Length / 1MB)) МБ"
    $sums = Get-ChildItem $dest -Recurse -Filter 'SHA256SUMS*' | Select-Object -First 1
    if ($sums) {
        $want = (Get-Content $sums.FullName -Encoding UTF8 | Where-Object { $_ -match [regex]::Escape($exe.Name) }) -replace '\s.*$', ''
        $got = (Get-FileHash $exe.FullName -Algorithm SHA256).Hash
        Say "Контрольная сумма: $(if ($want -and $got -ieq $want) { 'совпадает' } else { "НЕ СОВПАДАЕТ или нет записи (ждали $want, получили $got)" })"
    }

    Test-Installer 'kladez-win11' (Get-ChildItem $images -Filter 'Windows11*.iso' | Select-Object -First 1).FullName -Win11 $exe.FullName
    Test-Installer 'kladez-win10' (Join-Path $images 'Windows10.iso') $exe.FullName
    Say 'Проверка закончена.'
} catch {
    Say "ОШИБКА СЦЕНАРИЯ: $($_.Exception.Message) — $($_.ScriptStackTrace)"
} finally {
    Stop-Transcript | Out-Null
    if ($ShutdownWhenDone) {
        Get-VM | Where-Object State -eq 'Running' | Stop-VM -Force -ErrorAction SilentlyContinue
        shutdown.exe /s /t 120 /c "Кладезъ: проверка установщика закончена, компьютер выключается (отмена: shutdown /a)"
    }
}
