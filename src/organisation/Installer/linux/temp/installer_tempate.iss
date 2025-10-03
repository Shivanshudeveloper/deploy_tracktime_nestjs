#define MyAppName "tracktimeInstaller"
#define MyAppVersion "1.0.1"
#define MyAppPublisher "Sortwind"
#define MyAppURL "https://organization-dashboard-tracker.vercel.app/"

[Setup]
AppId={{F65445F6-AF16-44F5-96B9-1DF9E02D057A}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
AppPublisher={#MyAppPublisher}
AppPublisherURL={#MyAppURL}
AppSupportURL={#MyAppURL}
AppUpdatesURL={#MyAppURL}
DefaultDirName={autopf}\{#MyAppName}
DisableProgramGroupPage=yes
; ENABLE directory selection
DisableDirPage=no
; Admin privileges
PrivilegesRequired=admin
OutputDir=tracktimeInstaller
OutputBaseFilename=tracktimeInstaller
SetupIconFile=D:\practise\SortWindDirectoryAndWork\rust_desktop\main.ico
Compression=lzma
SolidCompression=yes
WizardStyle=modern

[Files]
; USE CORRECT FILENAME - match your actual Rust executable
Source: "D:\practise\SortWindDirectoryAndWork\rust_desktop\trackTime.exe"; DestDir: "{app}"; Flags: ignoreversion
Source: "D:\practise\SortWindDirectoryAndWork\rust_desktop\CreateScheduledTask.ps1"; DestDir: "{app}"; Flags: ignoreversion
Source: "D:\practise\SortWindDirectoryAndWork\rust_desktop\dev_config.txt"; DestDir: "{app}"; Flags: ignoreversion

[Icons]
; Startup icon for auto-run on boot
Name: "{commonstartup}\{#MyAppName}"; Filename: "{app}\trackTime.exe"

[Run]
; Simple auto-run approach
Filename: "{app}\trackTime.exe"; Flags: nowait runhidden

[Code]
// Optional: Hide tasks page if not needed
function ShouldSkipPage(PageID: Integer): Boolean;
begin
  if PageID = wpSelectTasks then
    Result := True
  else
    Result := False;
end;