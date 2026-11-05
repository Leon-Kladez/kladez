; «Кладезъ» — установщик для Windows 10 (2004+) и 11 (спек Б4, план Задача 9).
; Inno Setup 6.3+. Сборка: installer\build.ps1 (передаёт AppVersion, RepoRoot, Dist, Vendor, UpdateOnly).
; Тонкий слой: вся логика — в PowerShell-модулях installer\windows\scripts (покрыты тестами Pester).

#define AppIdGuid "{{4144DCC6-736C-4B79-B6A7-D0992AF26718}"
#define AppIdRaw "{4144DCC6-736C-4B79-B6A7-D0992AF26718}"
#ifndef AppVersion
  #define AppVersion "0.1.0"
#endif
#ifndef RepoRoot
  #define RepoRoot "..\.."
#endif
#ifndef Dist
  #define Dist RepoRoot + "\dist"
#endif
#ifndef Vendor
  #define Vendor RepoRoot + "\vendor"
#endif
#define WslMsi "wsl.3.0.3.0.x64.msi"
#define LegacyMsi "wsl_update_x64.msi"

[Setup]
AppId={#AppIdGuid}
AppName=Кладезъ
AppVersion={#AppVersion}
AppVerName=Кладезъ {#AppVersion}
AppPublisher=Проект «Кладезъ» (основано на Project NOMAD, Crosstalk Solutions)
DefaultDirName={autopf}\Kladez
DisableDirPage=yes
DisableProgramGroupPage=yes
PrivilegesRequired=admin
ArchitecturesAllowed=x64compatible
ArchitecturesInstallIn64BitMode=x64compatible
MinVersion=10.0.19041
WizardStyle=modern
SetupIconFile={#RepoRoot}\installer\windows\launcher\kladez.ico
UninstallDisplayIcon={app}\Kladez.exe
UninstallDisplayName=Кладезъ
InfoBeforeFile={#RepoRoot}\installer\windows\about-ru.txt
OutputDir={#Dist}
#ifdef UpdateOnly
OutputBaseFilename=Кладезъ-обновление-{#AppVersion}
#else
OutputBaseFilename=Кладезъ-установка-{#AppVersion}
#endif
; Образы и rootfs уже сжаты (zstd/gzip) — сильное сжатие только замедлит сборку.
Compression=lzma2/fast
SolidCompression=no
CloseApplications=yes

[Languages]
Name: "ru"; MessagesFile: "compiler:Languages\Russian.isl"

[Dirs]
; Steps that run as the original (non-elevated) user write to the same log folder.
Name: "{commonappdata}\Kladez\logs"; Permissions: users-modify

[Files]
Source: "{#Dist}\Kladez.exe"; DestDir: "{app}"; Flags: ignoreversion
Source: "{#RepoRoot}\installer\windows\scripts\*"; DestDir: "{app}\scripts"; Flags: ignoreversion
Source: "{#RepoRoot}\installer\windows\scripts\*"; DestDir: "{tmp}\scripts"; Flags: dontcopy
Source: "{#RepoRoot}\installer\windows\docs\*"; DestDir: "{app}\docs"; Flags: ignoreversion recursesubdirs
Source: "{#RepoRoot}\installer\windows\docs\bios\index.html"; DestDir: "{tmp}\bios"; Flags: dontcopy
Source: "{#RepoRoot}\LICENSE"; DestDir: "{app}"; DestName: "LICENSE.txt"; Flags: ignoreversion
Source: "{#RepoRoot}\NOTICE"; DestDir: "{app}"; DestName: "NOTICE.txt"; Flags: ignoreversion
Source: "{#Dist}\kladez-images.tar.zst"; DestDir: "{app}\payload"; Flags: ignoreversion deleteafterinstall
; New scripts and image list: on upgrade they replace the copies baked into the first rootfs.
Source: "{#RepoRoot}\installer\linux\kladez-start"; DestDir: "{app}\payload\linux"; Flags: ignoreversion deleteafterinstall
Source: "{#RepoRoot}\installer\linux\kladez-lib.sh"; DestDir: "{app}\payload\linux"; Flags: ignoreversion deleteafterinstall
Source: "{#RepoRoot}\installer\linux\images.lock"; DestDir: "{app}\payload\linux"; Flags: ignoreversion deleteafterinstall
Source: "{#RepoRoot}\installer\linux\compose.template.yaml"; DestDir: "{app}\payload\linux"; Flags: ignoreversion deleteafterinstall
#ifndef UpdateOnly
Source: "{#Dist}\kladez-rootfs.tar.gz"; DestDir: "{app}\payload"; Flags: ignoreversion deleteafterinstall
Source: "{#Vendor}\{#WslMsi}"; DestDir: "{app}\payload"; Flags: ignoreversion deleteafterinstall
Source: "{#Vendor}\{#LegacyMsi}"; DestDir: "{app}\payload"; Flags: ignoreversion deleteafterinstall
#endif

[Icons]
Name: "{autodesktop}\Кладезъ"; Filename: "{app}\Kladez.exe"
Name: "{autoprograms}\Кладезъ\Кладезъ"; Filename: "{app}\Kladez.exe"
Name: "{autoprograms}\Кладезъ\Сведения о программе"; Filename: "{app}\NOTICE.txt"
Name: "{autoprograms}\Кладезъ\Как пройти предупреждение Windows"; Filename: "{app}\docs\smartscreen\index.html"
Name: "{autoprograms}\Кладезъ\Как включить виртуализацию в BIOS"; Filename: "{app}\docs\bios\index.html"
Name: "{autoprograms}\Кладезъ\Собрать сведения для помощи"; Filename: "{app}\Kladez.exe"; Parameters: "--collect-logs"

[Run]
Filename: "{app}\Kladez.exe"; Description: "Открыть «Кладезъ» сейчас"; Flags: postinstall nowait runasoriginaluser skipifsilent; Check: SetupFinished

[UninstallDelete]
Type: filesandordirs; Name: "{commonappdata}\Kladez"
Type: dirifempty; Name: "{app}\payload\linux"
Type: dirifempty; Name: "{app}\payload"

[Code]
const
  RunOnceKey = 'Software\Microsoft\Windows\CurrentVersion\RunOnce';

var
  DrivePage: TInputOptionWizardPage;
  DriveLetters: TArrayOfString;
  DriveFits: TArrayOfString;
  DriveDefault: Integer;
  WindowsPathKind, AdminPort, KiwixPort, ResumeDrive: String;
  IsUpgrade, IsResume, NeedsReboot, Finished, InstallFailed, RemoveLibraryChoice: Boolean;

function HasParam(const Name: String): Boolean;
var
  I: Integer;
begin
  Result := False;
  for I := 1 to ParamCount do
    if CompareText(ParamStr(I), Name) = 0 then
      Result := True;
end;

function Field(const S: String; Index: Integer): String;
var
  I, N: Integer;
begin
  N := 0;
  Result := '';
  for I := 1 to Length(S) do
  begin
    if S[I] = '|' then
    begin
      if N = Index then
        Exit;
      N := N + 1;
      Result := '';
    end
    else
      Result := Result + S[I];
  end;
  if N <> Index then
    Result := '';
end;

function PowerShellExe: String;
begin
  Result := ExpandConstant('{sys}\WindowsPowerShell\v1.0\powershell.exe');
end;

function ScriptParams(const Script, Params: String): String;
begin
  Result := '-NoProfile -ExecutionPolicy Bypass -File "' + Script + '" ' + Params;
end;

{ AsOriginalUser: WSL distros belong to a user, so import/first run/upgrade must run as the person
  who started the installer, not as the elevated administrator account. }
function RunScript(const Script, Params: String; AsOriginalUser: Boolean): Integer;
var
  Code: Integer;
  Ok: Boolean;
begin
  if AsOriginalUser then
    Ok := ExecAsOriginalUser(PowerShellExe, ScriptParams(Script, Params), '', SW_HIDE, ewWaitUntilTerminated, Code)
  else
    Ok := Exec(PowerShellExe, ScriptParams(Script, Params), '', SW_HIDE, ewWaitUntilTerminated, Code);
  if Ok then
    Result := Code
  else
    Result := 1;
end;

function LogPath: String;
begin
  Result := ExpandConstant('{commonappdata}\Kladez\logs\setup.log');
end;

function IniPath: String;
begin
  Result := ExpandConstant('{commonappdata}\Kladez\kladez.ini');
end;

function IniValue(const Key: String): String;
var
  Lines: TArrayOfString;
  I: Integer;
begin
  Result := '';
  if LoadStringsFromFile(IniPath, Lines) then
    for I := 0 to GetArrayLength(Lines) - 1 do
      if Pos(Key + '=', Lines[I]) = 1 then
        Result := Copy(Lines[I], Length(Key) + 2, MaxInt);
end;

procedure ShowBiosHelp;
var
  Target: String;
  Code: Integer;
begin
  ExtractTemporaryFile('index.html');
  ForceDirectories(ExpandConstant('{commonappdata}\Kladez'));
  Target := ExpandConstant('{commonappdata}\Kladez\Как включить виртуализацию.html');
  FileCopy(ExpandConstant('{tmp}\index.html'), Target, False);
  ShellExec('open', Target, '', '', SW_SHOWNORMAL, ewNoWait, Code);
end;

function InitializeSetup: Boolean;
var
  Lines: TArrayOfString;
  I, Code, N: Integer;
  Kind: String;
begin
  Result := False;
  IsResume := HasParam('/RESUME');
  ResumeDrive := ExpandConstant('{param:DRIVE|}');
  { Not the uninstall key: Inno writes it before the steps run, so an interrupted first install
    would look like an upgrade. Installed=1 is written only after the first run succeeded. }
  IsUpgrade := IniValue('Installed') = '1';
#ifdef UpdateOnly
  if not IsUpgrade then
  begin
    MsgBox('«Кладезъ» ещё не установлен на этом компьютере.' + #13#10 +
      'Сначала установите «Кладезъ» полным установщиком, а этот файл обновления запустите потом.', mbError, MB_OK);
    Exit;
  end;
#endif

  ExtractTemporaryFiles('{tmp}\scripts\*');
  Code := RunScript(ExpandConstant('{tmp}\scripts\checks.ps1'),
    '-OutFile "' + ExpandConstant('{tmp}\kladez-checks.txt') + '"', False);
  if (Code <> 0) or not LoadStringsFromFile(ExpandConstant('{tmp}\kladez-checks.txt'), Lines) then
  begin
    MsgBox('Не удалось проверить компьютер перед установкой. Перезагрузите компьютер и запустите установку ещё раз.', mbError, MB_OK);
    Exit;
  end;

  N := 0;
  SetArrayLength(DriveLetters, GetArrayLength(Lines));
  SetArrayLength(DriveFits, GetArrayLength(Lines));
  DriveDefault := 0;
  for I := 0 to GetArrayLength(Lines) - 1 do
  begin
    Kind := Field(Lines[I], 0);
    if Kind = 'build' then
    begin
      if Field(Lines[I], 1) <> 'ok' then
      begin
        MsgBox(Field(Lines[I], 3), mbError, MB_OK);
        Exit;
      end;
      WindowsPathKind := Field(Lines[I], 2);
    end
    else if Kind = 'memory' then
    begin
      if Field(Lines[I], 1) = 'fail' then
      begin
        MsgBox(Field(Lines[I], 2), mbError, MB_OK);
        Exit;
      end;
      if (Field(Lines[I], 1) = 'warn') and not IsResume then
        if MsgBox(Field(Lines[I], 2) + #13#10#13#10 + 'Продолжить установку?', mbConfirmation, MB_YESNO) = IDNO then
          Exit;
    end
    else if Kind = 'virt' then
    begin
      if Field(Lines[I], 1) <> 'ok' then
      begin
        ShowBiosHelp;
        MsgBox('Чтобы «Кладезъ» работал, нужно включить виртуализацию в настройках компьютера (BIOS).' + #13#10#13#10 +
          'Мы открыли пошаговую инструкцию с картинками. Включите виртуализацию по ней, ' +
          'а потом запустите этот установщик ещё раз.', mbInformation, MB_OK);
        Exit;
      end;
    end
    else if Kind = 'ports' then
    begin
      AdminPort := Field(Lines[I], 1);
      KiwixPort := Field(Lines[I], 2);
      { After an interrupted install our own half-started Кладезъ may hold the ports. }
      if (AdminPort = '') and not FileExists(IniPath) then
      begin
        MsgBox('Нужные «Кладезъ» порты заняты другой программой: ' + Field(Lines[I], 3) + '.' + #13#10 +
          'Возможно, работает Project NOMAD или похожая программа. Закройте её и запустите установку ещё раз.', mbError, MB_OK);
        Exit;
      end;
    end
    else if Kind = 'drive' then
    begin
      DriveLetters[N] := Field(Lines[I], 1);
      DriveFits[N] := Field(Lines[I], 4);
      if Field(Lines[I], 5) = 'default' then
        DriveDefault := N;
      N := N + 1;
    end;
  end;
  SetArrayLength(DriveLetters, N);
  SetArrayLength(DriveFits, N);
  if FileExists(IniPath) and (IniValue('AdminPort') <> '') then
  begin
    AdminPort := IniValue('AdminPort');
    KiwixPort := IniValue('KiwixPort');
  end;
  Result := True;
end;

function FitsText(const Fits: String): String;
begin
  Result := '';
  if Pos('aptechka', Fits) > 0 then Result := 'Аптечка';
  if Pos('biblioteka', Fits) > 0 then Result := Result + ', Библиотека';
  if Pos('vse', Fits) > 0 then Result := Result + ', Всё';
  if Result = '' then
    Result := 'места не хватит'
  else
    Result := 'хватит на: ' + Result;
end;

procedure InitializeWizard;
var
  I, Selected: Integer;
  Lines: TArrayOfString;
  Label_, Free: String;
begin
  if IsUpgrade then
    Exit;
  DrivePage := CreateInputOptionPage(wpInfoBefore, 'Где хранить библиотеку',
    'Выберите диск для статей, карт и книг',
    'Библиотеке нужно много места. Рядом с каждым диском написано, какие наборы на нём поместятся: ' +
    '«Аптечка» (около 5 ГБ), «Библиотека» (около 25 ГБ), «Всё» (70 ГБ и больше).', True, False);
  LoadStringsFromFile(ExpandConstant('{tmp}\kladez-checks.txt'), Lines);
  for I := 0 to GetArrayLength(Lines) - 1 do
    if Field(Lines[I], 0) = 'drive' then
    begin
      Label_ := Field(Lines[I], 2);
      Free := Field(Lines[I], 3);
      DrivePage.Add(Field(Lines[I], 1) + ':  ' + Label_ + ' — свободно ' + Free + ' ГБ — ' + FitsText(Field(Lines[I], 4)));
    end;
  Selected := DriveDefault;
  for I := 0 to GetArrayLength(DriveLetters) - 1 do
  begin
    if DriveFits[I] = '' then
      DrivePage.CheckListBox.ItemEnabled[I] := False;
    if DirExists(DriveLetters[I] + ':\Kladez\library') then
      Selected := I;
    if (ResumeDrive <> '') and (CompareText(DriveLetters[I], ResumeDrive) = 0) then
      Selected := I;
  end;
  if GetArrayLength(DriveLetters) > 0 then
    DrivePage.SelectedValueIndex := Selected;
end;

function ShouldSkipPage(PageID: Integer): Boolean;
begin
  Result := (DrivePage <> nil) and (PageID = DrivePage.ID) and (IsUpgrade or (IsResume and (ResumeDrive <> '')));
end;

function NextButtonClick(CurPageID: Integer): Boolean;
begin
  Result := True;
  if (DrivePage <> nil) and (CurPageID = DrivePage.ID) then
    if (DrivePage.SelectedValueIndex < 0) or (DriveFits[DrivePage.SelectedValueIndex] = '') then
    begin
      MsgBox('На этом диске не хватит места даже для «Аптечки». Выберите другой диск.', mbError, MB_OK);
      Result := False;
    end;
end;

function SelectedDrive: String;
begin
  if (ResumeDrive <> '') and IsResume then
    Result := ResumeDrive
  else
    Result := DriveLetters[DrivePage.SelectedValueIndex];
end;

function OriginalUser: String;
var
  Lines: TArrayOfString;
  Code: Integer;
  F: String;
begin
  Result := '';
  F := ExpandConstant('{tmp}\kladez-user.txt');
  ExecAsOriginalUser(PowerShellExe, '-NoProfile -Command "[Security.Principal.WindowsIdentity]::GetCurrent().Name | Out-File -Encoding utf8 -FilePath ''' + F + '''"',
    '', SW_HIDE, ewWaitUntilTerminated, Code);
  if LoadStringsFromFile(F, Lines) and (GetArrayLength(Lines) > 0) then
    Result := Trim(Lines[0]);
end;

procedure SetStatus(const Text: String);
begin
  WizardForm.StatusLabel.Caption := Text;
  WizardForm.FilenameLabel.Caption := '';
end;

procedure Fail(const What: String);
begin
  InstallFailed := True;
  MsgBox(What + #13#10#13#10 + 'Перезагрузите компьютер и запустите установку ещё раз.' + #13#10 +
    'Если не поможет, отправьте помощнику файл журнала:' + #13#10 + LogPath, mbError, MB_OK);
end;

procedure ScheduleResume(const Drive: String);
begin
  { The original setup file is started again after the reboot; nothing is copied (it is ~1.5 GB). }
  RegWriteStringValue(HKLM, RunOnceKey, 'KladezSetup', '"' + ExpandConstant('{srcexe}') + '" /RESUME /DRIVE=' + Drive);
  NeedsReboot := True;
end;

function Step(const Name, Params: String; AsOriginalUser: Boolean): Integer;
begin
  Result := RunScript(ExpandConstant('{app}\scripts\setup-step.ps1'), '-Step ' + Name + ' ' + Params, AsOriginalUser);
end;

procedure MarkInstalled;
var
  Lines: TArrayOfString;
  N: Integer;
begin
  if not LoadStringsFromFile(IniPath, Lines) then
    Exit;
  N := GetArrayLength(Lines);
  SetArrayLength(Lines, N + 1);
  Lines[N] := 'Installed=1';
  SaveStringsToUTF8File(IniPath, Lines, False);
end;

procedure WriteSettings(const Drive: String);
var
  Lines: TArrayOfString;
begin
  ForceDirectories(ExpandConstant('{commonappdata}\Kladez\logs'));
  { First line is a header: if a BOM survives reading, it lands here and not on a key. }
  SetArrayLength(Lines, 5);
  Lines[0] := '[Kladez]';
  Lines[1] := 'AdminPort=' + AdminPort;
  Lines[2] := 'KiwixPort=' + KiwixPort;
  Lines[3] := 'LibraryDir=' + Drive + ':\Kladez\library';
  Lines[4] := 'SystemDir=' + Drive + ':\Kladez\system';
  SaveStringsToUTF8File(IniPath, Lines, False);

  ForceDirectories(Drive + ':\Kladez\library');
  SetArrayLength(Lines, 3);
  Lines[0] := 'Здесь хранится программа «Кладезъ» и её библиотека (статьи, карты, книги).';
  Lines[1] := 'Не удаляйте и не переносите эти папки вручную.';
  Lines[2] := 'Чтобы удалить программу, откройте «Параметры → Приложения → Кладезъ → Удалить».';
  SaveStringsToUTF8File(Drive + ':\Kladez\Что это за папка.txt', Lines, False);
end;

procedure RunInstallSteps;
var
  Payload, Drive, Lib, Sys: String;
  Code: Integer;
begin
  Payload := ExpandConstant('{app}\payload');
  WizardForm.ProgressGauge.Style := npbstMarquee;

  if IsUpgrade then
  begin
    SetStatus('Обновляю программы «Кладезъ»…');
    if Step('upgrade', '-BundlePath "' + Payload + '\kladez-images.tar.zst" -LinuxDir "' + Payload + '\linux"', True) <> 0 then
      Fail('Не удалось обновить «Кладезъ».')
    else
      Finished := True;
    Exit;
  end;

#ifndef UpdateOnly
  Drive := SelectedDrive;
  Lib := Drive + ':\Kladez\library';
  Sys := Drive + ':\Kladez\system';

  SetStatus('Включаю компоненты Windows…');
  Code := Step('features', '', False);
  if Code = 3010 then begin ScheduleResume(Drive); Exit; end;
  if Code <> 0 then begin Fail('Не удалось включить компоненты Windows.'); Exit; end;

  SetStatus('Устанавливаю WSL…');
  Code := Step('wsl', '-WindowsPathKind ' + WindowsPathKind + ' -WslMsi "' + Payload + '\{#WslMsi}" -LegacyKernelMsi "' +
    Payload + '\{#LegacyMsi}"', False);
  if Code = 3010 then begin ScheduleResume(Drive); Exit; end;
  if Code <> 0 then begin Fail('Не удалось установить WSL.'); Exit; end;

  WriteSettings(Drive);

  SetStatus('Настраиваю автозапуск и доступ для телефонов…');
  if Step('integrate', '-LauncherPath "' + ExpandConstant('{app}\Kladez.exe') + '" -NetScriptPath "' +
    ExpandConstant('{app}\scripts\kladez-net.ps1') + '" -UserId "' + OriginalUser + '" -AdminPort ' + AdminPort +
    ' -KiwixPort ' + KiwixPort, False) <> 0 then
  begin
    Fail('Не удалось настроить автозапуск и доступ для телефонов.');
    Exit;
  end;

  SetStatus('Устанавливаю системный модуль «Кладезъ»…');
  if Step('distro', '-SystemDir "' + Sys + '" -RootfsPath "' + Payload + '\kladez-rootfs.tar.gz"', True) <> 0 then
  begin
    Fail('Не удалось установить системный модуль «Кладезъ».');
    Exit;
  end;

  SetStatus('Распаковываю программу. Это займёт 3–7 минут…');
  if Step('firstrun', '-BundlePath "' + Payload + '\kladez-images.tar.zst" -LibraryDir "' + Lib + '" -AdminPort ' +
    AdminPort + ' -KiwixPort ' + KiwixPort, True) <> 0 then
  begin
    Fail('Не удалось запустить «Кладезъ» в первый раз.');
    Exit;
  end;
  MarkInstalled;
  Finished := True;
#endif
end;

procedure CurStepChanged(CurStep: TSetupStep);
begin
  if CurStep = ssPostInstall then
    RunInstallSteps;
end;

procedure CurPageChanged(CurPageID: Integer);
begin
  if (CurPageID = wpFinished) and InstallFailed then
  begin
    WizardForm.FinishedHeadingLabel.Caption := 'Установка не завершена';
    WizardForm.FinishedLabel.Caption := 'Установка «Кладезъ» не закончилась. Перезагрузите компьютер и запустите ' +
      'установщик ещё раз — он продолжит с того места, где остановился.' + #13#10#13#10 +
      'Журнал для помощника: ' + LogPath;
  end;
end;

function NeedRestart: Boolean;
begin
  Result := NeedsReboot;
end;

function SetupFinished: Boolean;
begin
  Result := Finished;
end;

function InitializeUninstall: Boolean;
var
  Lib: String;
begin
  Lib := IniValue('LibraryDir');
  RemoveLibraryChoice := MsgBox('Удалить также скачанную библиотеку (статьи, карты, книги)?' + #13#10 + Lib + #13#10#13#10 +
    'Если оставить её, при повторной установке ничего не придётся скачивать заново.',
    mbConfirmation, MB_YESNO or MB_DEFBUTTON2) = IDYES;
  Result := True;
end;

procedure CurUninstallStepChanged(CurUninstallStep: TUninstallStep);
var
  Code: Integer;
  Flag: String;
begin
  if CurUninstallStep = usUninstall then
  begin
    if RemoveLibraryChoice then Flag := '1' else Flag := '0';
    Exec(PowerShellExe, ScriptParams(ExpandConstant('{app}\scripts\uninstall.ps1'), '-RemoveLibrary ' + Flag),
      '', SW_HIDE, ewWaitUntilTerminated, Code);
  end;
end;
