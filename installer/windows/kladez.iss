; «Кладезъ» — установщик для Windows 10 (2004+) и 11 (спек Б4, план Задача 9; правки 0.1.4).
; Inno Setup 6.3+ (CI: 6.7). Сборка: installer\build.ps1 (передаёт AppVersion, RepoRoot, Dist, Vendor, UpdateOnly).
; Тонкий слой: вся логика шагов — в PowerShell-модулях installer\windows\scripts (покрыты тестами Pester).
; Pascal Script: каждая процедура объявлена выше места вызова (это проверяет тест Build.Tests.ps1).

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
; Папку программы выбирает человек («Обзор…»); по умолчанию — на диске с наибольшим свободным местом.
; auto: страница показывается при первой установке и скрывается при обновлении (папка уже известна).
DefaultDirName={code:DefaultAppDir}
DisableDirPage=auto
DirExistsWarning=no
DisableProgramGroupPage=yes
PrivilegesRequired=admin
ArchitecturesAllowed=x64compatible
ArchitecturesInstallIn64BitMode=x64compatible
MinVersion=10.0.19041
WizardStyle=modern
SetupIconFile={#RepoRoot}\installer\windows\launcher\kladez.ico
UninstallDisplayIcon={app}\Kladez.exe
UninstallDisplayName=Кладезъ
; Соглашение: «Я принимаю» становится доступным только после прокрутки текста до конца (см. [Code]).
LicenseFile={#RepoRoot}\installer\windows\agreement-ru.txt
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
type
  { user32 SCROLLINFO; all fields are 32-bit (Setup itself is a 32-bit process). }
  TKladezScrollInfo = record
    cbSize: LongWord;
    fMask: LongWord;
    nMin: Integer;
    nMax: Integer;
    nPage: LongWord;
    nPos: Integer;
    nTrackPos: Integer;
  end;

const
  RunOnceKey = 'Software\Microsoft\Windows\CurrentVersion\RunOnce';
  KZ_SB_VERT = 1;
  KZ_SIF_ALL = 23;            { SIF_RANGE or SIF_PAGE or SIF_POS or SIF_TRACKPOS }
  KZ_SCROLLINFO_SIZE = 28;
  { Free space needed: system 10 GB + set (same numbers as Kladez.Checks.psm1). }
  KZ_SET_APTECHKA_GB = 15;
  KZ_SET_BIBLIOTEKA_GB = 35;
  KZ_SET_VSE_GB = 80;

var
  LibPage: TInputDirWizardPage;
  LibInfo: TNewStaticText;
  LibTouched: Boolean;
  DriveLetters, DriveFits, DriveFree: TArrayOfString;
  DriveDefault: Integer;
  WindowsPathKind, AdminPort, KiwixPort, ResumeLibDir, ExistingLibDir: String;
  IsUpgrade, IsResume, NeedsReboot, Finished, InstallFailed, RemoveLibraryChoice: Boolean;
  LicenseTimer, StepTimer: LongWord;
  StepNumber, StepTotal, StepStartPct, StepWeight, StepExpectedSec: Integer;
  StepStartTick: LongWord;
  StepText, StepHint: String;

function KzGetScrollInfo(Wnd: HWND; BarFlag: Integer; var ScrollInfo: TKladezScrollInfo): BOOL;
  external 'GetScrollInfo@user32.dll stdcall';
function KzSetTimer(Wnd: LongWord; nIDEvent, uElapse: LongWord; lpTimerFunc: LongWord): LongWord;
  external 'SetTimer@user32.dll stdcall';
function KzKillTimer(Wnd: LongWord; uIDEvent: LongWord): BOOL;
  external 'KillTimer@user32.dll stdcall';
function KzGetTickCount: LongWord;
  external 'GetTickCount@kernel32.dll stdcall';

{ ── Small helpers ─────────────────────────────────────────────────────────── }

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
  who started the installer, not as the elevated administrator account. Such a process cannot write
  into Setup's protected temporary folder: anything it writes goes to ProgramData\Kladez\logs (users-modify). }
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

function LogDir: String;
begin
  Result := ExpandConstant('{commonappdata}\Kladez\logs');
end;

function LogPath: String;
begin
  Result := LogDir + '\setup.log';
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

{ ── Drives and folders ───────────────────────────────────────────────────── }

function DriveIndex(const Letter: String): Integer;
var
  I: Integer;
begin
  Result := -1;
  for I := 0 to GetArrayLength(DriveLetters) - 1 do
    if CompareText(DriveLetters[I], Letter) = 0 then
      Result := I;
end;

{ 'D:\Мои файлы\library' → 'D'; '' when the path does not start with a drive letter. }
function PathDrive(const Path: String): String;
begin
  Result := '';
  if (Length(Path) >= 3) and (Path[2] = ':') and (Path[3] = '\') then
    Result := Uppercase(Copy(Path, 1, 1));
end;

function FitsText(const Fits: String): String;
begin
  Result := '';
  if Pos('aptechka', Fits) > 0 then Result := '«Аптечка»';
  if Pos('biblioteka', Fits) > 0 then Result := Result + ', «Библиотека»';
  if Pos('vse', Fits) > 0 then Result := Result + ', «Всё»';
  if Result = '' then
    Result := 'места не хватит даже для «Аптечки» (нужно ' + IntToStr(KZ_SET_APTECHKA_GB) + ' ГБ)'
  else
    Result := 'хватит на: ' + Result;
end;

function LibDriveInfo(const Path: String): String;
var
  I: Integer;
begin
  I := DriveIndex(PathDrive(Path));
  if PathDrive(Path) = '' then
    Result := 'Укажите полный путь к папке, например D:\Kladez\library.'
  else if I < 0 then
    Result := 'Этот диск не подходит: нужен встроенный диск компьютера (не флешка и не внешний диск) ' +
      'с файловой системой NTFS.'
  else
    Result := 'Диск ' + DriveLetters[I] + ': — свободно ' + DriveFree[I] + ' ГБ — ' + FitsText(DriveFits[I]) + '.' + #13#10 +
      'Наборы: «Аптечка» около 5 ГБ, «Библиотека» около 25 ГБ, «Всё» 70 ГБ и больше. ' +
      'Служебная часть программы (около 10 ГБ) будет на этом же диске.';
end;

{ [Setup] DefaultDirName: the roomiest suitable drive, or the drive of an existing library. }
function DefaultAppDir(Param: String): String;
begin
  if GetArrayLength(DriveLetters) > 0 then
    Result := DriveLetters[DriveDefault] + ':\Kladez'
  else
    Result := ExpandConstant('{autopf}\Kladez');
end;

function DefaultLibDir: String;
var
  D: String;
begin
  if ExistingLibDir <> '' then
  begin
    Result := ExistingLibDir;
    Exit;
  end;
  D := PathDrive(WizardDirValue);
  if (D = '') or (DriveIndex(D) < 0) then
  begin
    if GetArrayLength(DriveLetters) > 0 then
      D := DriveLetters[DriveDefault]
    else
      D := 'C';
  end;
  Result := D + ':\Kladez\library';
end;

function SelectedLibDir: String;
begin
  if IsResume and (ResumeLibDir <> '') then
    Result := ResumeLibDir
  else
    Result := Trim(LibPage.Values[0]);
  while (Length(Result) > 3) and (Result[Length(Result)] = '\') do
    Result := Copy(Result, 1, Length(Result) - 1);
end;

procedure LibDirChanged(Sender: TObject);
begin
  LibTouched := True;
  LibInfo.Caption := LibDriveInfo(Trim(LibPage.Values[0]));
end;

{ ── Setup start: checks ───────────────────────────────────────────────────── }

function InitializeSetup: Boolean;
var
  Lines: TArrayOfString;
  I, Code, N: Integer;
  Kind, D: String;
begin
  Result := False;
  IsResume := HasParam('/RESUME');
  ResumeLibDir := ExpandConstant('{param:LIBDIR|}');
  { Older 0.1.x RunOnce entries passed only the drive letter. }
  D := ExpandConstant('{param:DRIVE|}');
  if (ResumeLibDir = '') and (D <> '') then
    ResumeLibDir := D + ':\Kladez\library';
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
  SetArrayLength(DriveFree, GetArrayLength(Lines));
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
      if (Field(Lines[I], 1) = 'warn') and not IsResume and not WizardSilent then
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
      DriveFree[N] := Field(Lines[I], 3);
      DriveFits[N] := Field(Lines[I], 4);
      if Field(Lines[I], 5) = 'default' then
        DriveDefault := N;
      N := N + 1;
    end;
  end;
  SetArrayLength(DriveLetters, N);
  SetArrayLength(DriveFits, N);
  SetArrayLength(DriveFree, N);

  { A library left by an earlier install (or uninstall that kept it) is offered again. }
  ExistingLibDir := IniValue('LibraryDir');
  if (ExistingLibDir <> '') and not DirExists(ExistingLibDir) then
    ExistingLibDir := '';
  for I := 0 to N - 1 do
    if (ExistingLibDir = '') and DirExists(DriveLetters[I] + ':\Kladez\library') then
      ExistingLibDir := DriveLetters[I] + ':\Kladez\library';
  if (ExistingLibDir <> '') and (DriveIndex(PathDrive(ExistingLibDir)) >= 0) then
    DriveDefault := DriveIndex(PathDrive(ExistingLibDir));

  if FileExists(IniPath) and (IniValue('AdminPort') <> '') then
  begin
    AdminPort := IniValue('AdminPort');
    KiwixPort := IniValue('KiwixPort');
  end;
  Result := True;
end;

{ ── Agreement: «Я принимаю» only after scrolling to the end ───────────────── }

function LicenseScrolledToEnd: Boolean;
var
  Info: TKladezScrollInfo;
begin
  Info.cbSize := KZ_SCROLLINFO_SIZE;
  Info.fMask := KZ_SIF_ALL;
  { No scroll bar (the text fits) → nothing to scroll, accept right away. }
  if not KzGetScrollInfo(WizardForm.LicenseMemo.Handle, KZ_SB_VERT, Info) then
    Result := True
  else if (Info.nPage = 0) or (Info.nMax <= Integer(Info.nPage)) then
    Result := True
  else
    Result := Info.nPos + Integer(Info.nPage) + 1 >= Info.nMax;
end;

procedure StopLicenseTimer;
begin
  if LicenseTimer <> 0 then
  begin
    KzKillTimer(0, LicenseTimer);
    LicenseTimer := 0;
  end;
end;

procedure LicenseTimerProc(Wnd: LongWord; Msg: LongWord; IdEvent: LongWord; Time: LongWord);
begin
  if LicenseScrolledToEnd then
  begin
    WizardForm.LicenseAcceptedRadio.Enabled := True;
    StopLicenseTimer;
  end;
end;

procedure StartLicenseTimer;
begin
  WizardForm.LicenseAcceptedRadio.Enabled := False;
  WizardForm.LicenseNotAcceptedRadio.Checked := True;
  if LicenseTimer = 0 then
    LicenseTimer := KzSetTimer(0, 0, 300, CreateCallback(@LicenseTimerProc));
end;

{ ── Progress: percent while unpacking, «Шаг N из M» and overall percent during the steps ── }

procedure SetStatus(const Text: String);
begin
  WizardForm.StatusLabel.Caption := Text;
  WizardForm.FilenameLabel.Caption := '';
end;

function ElapsedText(Seconds: Integer): String;
begin
  if Seconds < 60 then
    Result := IntToStr(Seconds) + ' с'
  else
    Result := IntToStr(Seconds div 60) + ' мин ' + IntToStr(Seconds mod 60) + ' с';
end;

procedure UpdateStepProgress;
var
  Elapsed, Inside, Pct: Integer;
begin
  Elapsed := (KzGetTickCount - StepStartTick) div 1000;
  { Estimate inside the step by time, never reaching its end before the step really finishes. }
  if StepExpectedSec > 0 then
    Inside := (StepWeight * Elapsed) div StepExpectedSec
  else
    Inside := 0;
  if Inside > StepWeight - 1 then
    Inside := StepWeight - 1;
  Pct := StepStartPct + Inside;
  WizardForm.ProgressGauge.Position := Pct;
  WizardForm.FilenameLabel.Caption := StepHint + 'Прошло ' + ElapsedText(Elapsed) + '. Всего готово: ' + IntToStr(Pct) + ' %';
end;

procedure StepTimerProc(Wnd: LongWord; Msg: LongWord; IdEvent: LongWord; Time: LongWord);
begin
  UpdateStepProgress;
end;

procedure StopStepTimer;
begin
  if StepTimer <> 0 then
  begin
    KzKillTimer(0, StepTimer);
    StepTimer := 0;
  end;
end;

{ Weights add up to 100 (features 5, WSL 15, integrate 3, distro 12, first run 65). }
procedure BeginStep(Number, Total, StartPct, Weight, ExpectedSec: Integer; const Text, Hint: String);
begin
  StopStepTimer;
  StepNumber := Number;
  StepTotal := Total;
  StepStartPct := StartPct;
  StepWeight := Weight;
  StepExpectedSec := ExpectedSec;
  StepText := Text;
  StepHint := Hint;
  StepStartTick := KzGetTickCount;
  WizardForm.ProgressGauge.Style := npbstNormal;
  WizardForm.ProgressGauge.Min := 0;
  WizardForm.ProgressGauge.Max := 100;
  WizardForm.StatusLabel.Caption := 'Шаг ' + IntToStr(StepNumber) + ' из ' + IntToStr(StepTotal) + ': ' + StepText;
  UpdateStepProgress;
  { Exec keeps processing window messages while it waits, so the timer ticks during long steps. }
  StepTimer := KzSetTimer(0, 0, 1000, CreateCallback(@StepTimerProc));
end;

procedure EndStep;
begin
  StopStepTimer;
  WizardForm.ProgressGauge.Position := StepStartPct + StepWeight;
end;

procedure CurInstallProgressChanged(CurProgress, MaxProgress: Integer);
var
  Pct: Integer;
begin
  if MaxProgress <= 0 then
    Exit;
  Pct := Trunc(CurProgress / MaxProgress * 100);
  WizardForm.StatusLabel.Caption := 'Распаковка файлов… ' + IntToStr(Pct) + ' %';
end;

{ ── Wizard pages ──────────────────────────────────────────────────────────── }

procedure InitializeWizard;
begin
  WizardForm.LicenseLabel1.Caption := 'Прочитайте соглашение. Прокрутите текст до конца — ' +
    'тогда станет доступно «Я принимаю условия соглашения».';
  if IsUpgrade then
    Exit;
  LibPage := CreateInputDirPage(wpSelectDir, 'Где хранить библиотеку',
    'Выберите папку для статей, карт и книг',
    'Библиотеке нужно много места. Нажмите «Обзор…», чтобы выбрать другую папку. ' +
    'Подходят встроенные диски компьютера (не флешки и не внешние диски).', False, '');
  LibPage.Add('');
  LibPage.Values[0] := DefaultLibDir;
  LibInfo := TNewStaticText.Create(LibPage);
  LibInfo.Parent := LibPage.Surface;
  LibInfo.AutoSize := False;
  LibInfo.WordWrap := True;
  LibInfo.Left := 0;
  LibInfo.Top := LibPage.Edits[0].Top + LibPage.Edits[0].Height + ScaleY(16);
  LibInfo.Width := LibPage.SurfaceWidth;
  LibInfo.Height := ScaleY(80);
  LibInfo.Caption := LibDriveInfo(LibPage.Values[0]);
  LibPage.Edits[0].OnChange := @LibDirChanged;
  LibTouched := False;
end;

function ShouldSkipPage(PageID: Integer): Boolean;
begin
  Result := False;
  { After the reboot the person already agreed and chose the folders: continue straight away. }
  if (PageID = wpLicense) and (IsResume or IsUpgrade) then
    Result := True
  else if (PageID = wpSelectDir) and IsResume then
    Result := True
  else if (PageID = wpReady) and IsResume then
    Result := True
  else if (LibPage <> nil) and (PageID = LibPage.ID) and (IsUpgrade or (IsResume and (ResumeLibDir <> ''))) then
    Result := True;
end;

procedure CurPageChanged(CurPageID: Integer);
begin
  if CurPageID = wpLicense then
    StartLicenseTimer
  else
    StopLicenseTimer;

  { The library follows the program folder's drive until the person edits it. }
  if (LibPage <> nil) and (CurPageID = LibPage.ID) then
  begin
    if not LibTouched then
    begin
      LibPage.Values[0] := DefaultLibDir;
      LibTouched := False;
    end;
    LibInfo.Caption := LibDriveInfo(Trim(LibPage.Values[0]));
  end;

  if (CurPageID = wpFinished) and InstallFailed then
  begin
    WizardForm.FinishedHeadingLabel.Caption := 'Установка не завершена';
    WizardForm.FinishedLabel.Caption := 'Установка «Кладезъ» не закончилась. Перезагрузите компьютер и запустите ' +
      'установщик ещё раз — он продолжит с того места, где остановился.' + #13#10#13#10 +
      'Журнал для помощника: ' + LogPath;
  end
  else if (CurPageID = wpFinished) and NeedsReboot then
  begin
    WizardForm.FinishedHeadingLabel.Caption := 'Нужна перезагрузка';
    WizardForm.FinishedLabel.Caption := 'Windows включила компоненты, нужные «Кладезъ». Чтобы закончить установку, ' +
      'компьютер нужно перезагрузить.' + #13#10#13#10 +
      'Сохраните открытые документы и нажмите «Завершить» — компьютер перезагрузится, ' +
      'а установка продолжится сама после входа в Windows.';
  end;
end;

function NextButtonClick(CurPageID: Integer): Boolean;
var
  P: String;
  I: Integer;
begin
  Result := True;
  if (LibPage <> nil) and (CurPageID = LibPage.ID) then
  begin
    P := SelectedLibDir;
    I := DriveIndex(PathDrive(P));
    if (PathDrive(P) = '') or (Length(P) <= 3) then
    begin
      MsgBox('Выберите папку для библиотеки (не весь диск целиком), например ' + DefaultLibDir + '.', mbError, MB_OK);
      Result := False;
    end
    else if I < 0 then
    begin
      MsgBox('Этот диск не подходит для библиотеки: нужен встроенный диск компьютера (не флешка и не внешний диск) ' +
        'с файловой системой NTFS. Выберите папку на другом диске.', mbError, MB_OK);
      Result := False;
    end
    else if DriveFits[I] = '' then
    begin
      MsgBox('На диске ' + DriveLetters[I] + ': не хватит места даже для «Аптечки». Выберите папку на другом диске.', mbError, MB_OK);
      Result := False;
    end;
  end;
end;

{ ── Install steps ─────────────────────────────────────────────────────────── }

{ The original (non-elevated) user, for the autostart task. Written to ProgramData\Kladez\logs:
  Setup's temporary folder is protected: a non-elevated process cannot write to (0.1.3 bug). }
function OriginalUser: String;
var
  Lines: TArrayOfString;
  Code: Integer;
  F: String;
begin
  Result := '';
  ForceDirectories(LogDir);
  F := ExpandConstant('{commonappdata}\Kladez\logs\kladez-user.txt');
  DeleteFile(F);
  ExecAsOriginalUser(PowerShellExe, '-NoProfile -Command "[Security.Principal.WindowsIdentity]::GetCurrent().Name | Out-File -Encoding utf8 -FilePath ''' + F + '''"',
    '', SW_HIDE, ewWaitUntilTerminated, Code);
  if LoadStringsFromFile(F, Lines) and (GetArrayLength(Lines) > 0) then
    Result := Trim(Lines[0]);
  DeleteFile(F);
end;

procedure Fail(const What: String);
begin
  StopStepTimer;
  InstallFailed := True;
  MsgBox(What + #13#10#13#10 + 'Перезагрузите компьютер и запустите установку ещё раз.' + #13#10 +
    'Если не поможет, отправьте помощнику файл журнала:' + #13#10 + LogPath, mbError, MB_OK);
end;

procedure ScheduleResume(const Lib: String);
begin
  StopStepTimer;
  { The original setup file is started again after the reboot; nothing is copied (it is ~1.5 GB). }
  RegWriteStringValue(HKLM, RunOnceKey, 'KladezSetup', '"' + ExpandConstant('{srcexe}') + '" /RESUME /LIBDIR="' + Lib +
    '" /DIR="' + WizardDirValue + '"');
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

procedure WriteSettings(const Lib, Sys: String);
var
  Lines: TArrayOfString;
  Root: String;
begin
  ForceDirectories(LogDir);
  { First line is a header: if a BOM survives reading, it lands here and not on a key. }
  SetArrayLength(Lines, 5);
  Lines[0] := '[Kladez]';
  Lines[1] := 'AdminPort=' + AdminPort;
  Lines[2] := 'KiwixPort=' + KiwixPort;
  Lines[3] := 'LibraryDir=' + Lib;
  Lines[4] := 'SystemDir=' + Sys;
  SaveStringsToUTF8File(IniPath, Lines, False);

  ForceDirectories(Lib);
  Root := ExtractFileDir(Sys);
  ForceDirectories(Root);
  SetArrayLength(Lines, 4);
  Lines[0] := 'Здесь хранится служебная часть программы «Кладезъ».';
  Lines[1] := 'Библиотека (статьи, карты, книги): ' + Lib;
  Lines[2] := 'Не удаляйте и не переносите эти папки вручную.';
  Lines[3] := 'Чтобы удалить программу, откройте «Параметры → Приложения → Кладезъ → Удалить».';
  SaveStringsToUTF8File(Root + '\Что это за папка.txt', Lines, False);
end;

procedure RunInstallSteps;
var
  Payload, Lib, Sys: String;
  Code: Integer;
begin
  Payload := ExpandConstant('{app}\payload');

  if IsUpgrade then
  begin
    BeginStep(1, 1, 0, 100, 240, 'Обновляю программы «Кладезъ»…', 'Это займёт несколько минут — компьютер не завис. ');
    if Step('upgrade', '-BundlePath "' + Payload + '\kladez-images.tar.zst" -LinuxDir "' + Payload + '\linux"', True) <> 0 then
      Fail('Не удалось обновить «Кладезъ».')
    else
    begin
      EndStep;
      Finished := True;
    end;
    Exit;
  end;

#ifndef UpdateOnly
  Lib := SelectedLibDir;
  { The system part (WSL disk) lives on the library's drive. }
  Sys := PathDrive(Lib) + ':\Kladez\system';

  BeginStep(1, 5, 0, 5, 30, 'Включаю компоненты Windows…', '');
  Code := Step('features', '', False);
  if Code = 3010 then begin ScheduleResume(Lib); Exit; end;
  if Code <> 0 then begin Fail('Не удалось включить компоненты Windows.'); Exit; end;
  EndStep;

  BeginStep(2, 5, 5, 15, 120, 'Устанавливаю WSL…', '');
  Code := Step('wsl', '-WindowsPathKind ' + WindowsPathKind + ' -WslMsi "' + Payload + '\{#WslMsi}" -LegacyKernelMsi "' +
    Payload + '\{#LegacyMsi}"', False);
  if Code = 3010 then begin ScheduleResume(Lib); Exit; end;
  if Code <> 0 then begin Fail('Не удалось установить WSL.'); Exit; end;
  EndStep;

  WriteSettings(Lib, Sys);

  BeginStep(3, 5, 20, 3, 15, 'Настраиваю автозапуск и доступ для телефонов…', '');
  if Step('integrate', '-LauncherPath "' + ExpandConstant('{app}\Kladez.exe') + '" -NetScriptPath "' +
    ExpandConstant('{app}\scripts\kladez-net.ps1') + '" -UserId "' + OriginalUser + '" -FallbackUserId "' +
    ExpandConstant('{computername}\{username}') + '" -AdminPort ' + AdminPort + ' -KiwixPort ' + KiwixPort, False) <> 0 then
  begin
    Fail('Не удалось настроить автозапуск и доступ для телефонов.');
    Exit;
  end;
  EndStep;

  BeginStep(4, 5, 23, 12, 60, 'Устанавливаю системный модуль «Кладезъ»…', '');
  if Step('distro', '-SystemDir "' + Sys + '" -RootfsPath "' + Payload + '\kladez-rootfs.tar.gz"', True) <> 0 then
  begin
    Fail('Не удалось установить системный модуль «Кладезъ».');
    Exit;
  end;
  EndStep;

  BeginStep(5, 5, 35, 65, 480, 'Распаковываю и запускаю программу…',
    'Это займёт до 8 минут — компьютер не завис. ');
  if Step('firstrun', '-BundlePath "' + Payload + '\kladez-images.tar.zst" -LibraryDir "' + Lib + '" -AdminPort ' +
    AdminPort + ' -KiwixPort ' + KiwixPort, True) <> 0 then
  begin
    Fail('Не удалось запустить «Кладезъ» в первый раз.');
    Exit;
  end;
  EndStep;
  SetStatus('Готово: всего 100 %');
  MarkInstalled;
  Finished := True;
#endif
end;

procedure CurStepChanged(CurStep: TSetupStep);
begin
  if CurStep = ssPostInstall then
    RunInstallSteps;
end;

{ Inno asks NeedRestart before ssPostInstall, where our steps find out a reboot is needed, so its own
  restart prompt never appears. We restart ourselves when the person presses «Завершить». }
function NeedRestart: Boolean;
begin
  Result := NeedsReboot;
end;

procedure DeinitializeSetup;
var
  Code: Integer;
begin
  StopLicenseTimer;
  StopStepTimer;
  if NeedsReboot and not InstallFailed and not WizardSilent then
    Exec(ExpandConstant('{sys}\shutdown.exe'), '/r /t 5 /c "Кладезъ: перезагрузка для завершения установки"',
      '', SW_HIDE, ewNoWait, Code);
end;

function SetupFinished: Boolean;
begin
  Result := Finished;
end;

{ ── Uninstall ─────────────────────────────────────────────────────────────── }

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
