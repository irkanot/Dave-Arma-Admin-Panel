param(
  [string]$ArmaPath = "",
  [string]$SteamCmdInstallPath = "",
  [string]$HostAddress = "0.0.0.0",
  [int]$Port = 3000,
  [string]$Game = "arma3_x64",
  [ValidateSet("windows", "linux", "wine")]
  [string]$Type = "windows",
  [string]$SteamBaseUrl = "",
  [switch]$InstallService,
  [switch]$OpenFirewall,
  [switch]$ForceNpmInstall,
  [switch]$NonInteractive
)

$ErrorActionPreference = "Stop"

function ConvertTo-StringLiteral($Value) {
  return ConvertTo-Json -Compress ([string]$Value)
}

function Refresh-Path {
  $machinePath = [Environment]::GetEnvironmentVariable("Path", "Machine")
  $userPath = [Environment]::GetEnvironmentVariable("Path", "User")
  $env:Path = "$machinePath;$userPath"
}

function Get-CommandOrNull($Name) {
  return Get-Command $Name -ErrorAction SilentlyContinue
}

function Assert-Command($Name) {
  if (-not (Get-CommandOrNull $Name)) {
    throw "$Name is required but was not found in PATH."
  }
}

function Read-RequiredValue($Prompt, $CurrentValue = "") {
  while ($true) {
    $suffix = if ($CurrentValue) { " [$CurrentValue]" } else { "" }
    $value = Read-Host "$Prompt$suffix"
    if (-not $value) { $value = $CurrentValue }
    if ($value) { return $value.Trim().Trim('"') }
    Write-Host "Il valore e obbligatorio." -ForegroundColor Yellow
  }
}

function Read-PasswordValue($Prompt) {
  $secure = Read-Host $Prompt -AsSecureString
  $pointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
  try {
    return [Runtime.InteropServices.Marshal]::PtrToStringBSTR($pointer)
  } finally {
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($pointer)
  }
}

function Test-ArmaServerPath($Path) {
  if (-not (Test-Path -LiteralPath $Path -PathType Container)) { return $false }
  return (Test-Path -LiteralPath (Join-Path $Path "arma3server_x64.exe")) -or
    (Test-Path -LiteralPath (Join-Path $Path "arma3server.exe"))
}

function Install-BundledNode {
  if (Get-CommandOrNull "node") {
    Write-Host "Node.js already installed: $(node -v)"
    return
  }

  $nodeInstaller = Get-ChildItem -LiteralPath (Join-Path $ProjectRoot "installers\node") -Filter "*.msi" | Select-Object -First 1
  if (-not $nodeInstaller) {
    throw "Node.js is not installed and no bundled MSI was found in installers\node."
  }

  Write-Host "Installing bundled Node.js: $($nodeInstaller.Name)"
  $process = Start-Process -FilePath "msiexec.exe" -ArgumentList @("/i", $nodeInstaller.FullName, "/qn", "/norestart") -Wait -PassThru
  if ($process.ExitCode -ne 0) {
    throw "Node.js installer failed with exit code $($process.ExitCode)."
  }

  Refresh-Path
  Assert-Command "node"
  Assert-Command "npm"
  Write-Host "Node.js installed: $(node -v)"
}

function Install-BundledSteamCmd {
  $steamExe = Join-Path $SteamCmdInstallPath "steamcmd.exe"
  if (Test-Path -LiteralPath $steamExe) {
    Write-Host "SteamCMD already installed: $steamExe"
    return $steamExe
  }

  $steamZip = Join-Path $ProjectRoot "installers\steamcmd\steamcmd.zip"
  if (-not (Test-Path -LiteralPath $steamZip)) {
    throw "Bundled SteamCMD archive not found: $steamZip"
  }

  Write-Host "Installing SteamCMD to $SteamCmdInstallPath"
  New-Item -ItemType Directory -Path $SteamCmdInstallPath -Force | Out-Null
  Expand-Archive -LiteralPath $steamZip -DestinationPath $SteamCmdInstallPath -Force

  if (-not (Test-Path -LiteralPath $steamExe)) {
    throw "SteamCMD extraction completed but steamcmd.exe was not found."
  }

  Write-Host "Running first SteamCMD self-update"
  $process = Start-Process -FilePath $steamExe -ArgumentList "+quit" -Wait -PassThru
  if ($process.ExitCode -ne 0) {
    Write-Host "SteamCMD self-update exited with code $($process.ExitCode). You can retry later from Admin -> Settings."
  }

  return $steamExe
}

function Find-ArmaServerPath {
  if ($ArmaPath -and (Test-ArmaServerPath $ArmaPath)) {
    return (Resolve-Path -LiteralPath $ArmaPath).Path
  }

  $candidates = @(
    "C:\Arma3Server",
    "C:\Arma 3 Server",
    "C:\Arma 3\Arma 3 server tool",
    "C:\Program Files (x86)\Steam\steamapps\common\Arma 3 Server",
    "C:\Program Files\Steam\steamapps\common\Arma 3 Server"
  )

  foreach ($candidate in $candidates) {
    if (Test-ArmaServerPath $candidate) {
      return (Resolve-Path -LiteralPath $candidate).Path
    }
  }

  return ""
}

function Read-YesNo($Prompt, [bool]$Default = $false) {
  $defaultLabel = if ($Default) { "S/n" } else { "s/N" }
  $answer = Read-Host "$Prompt [$defaultLabel]"
  if (-not $answer) { return $Default }
  return $answer.Trim().ToLowerInvariant() -in @('s', 'si', 'sì', 'y', 'yes')
}

$ProjectRoot = Split-Path -Parent $PSScriptRoot
Set-Location $ProjectRoot

Write-Host ""
Write-Host "====================================================" -ForegroundColor Cyan
Write-Host " Arma Server Web Admin - Configurazione iniziale" -ForegroundColor Cyan
Write-Host "====================================================" -ForegroundColor Cyan
Write-Host ""

$detectedArmaPath = Find-ArmaServerPath
if ($NonInteractive) {
  if (-not $detectedArmaPath) {
    throw "Percorso Arma Server non valido. Specificare -ArmaPath con la cartella che contiene arma3server_x64.exe."
  }
  if (-not $SteamCmdInstallPath) { $SteamCmdInstallPath = "C:\SteamCMD" }
  if (-not $SteamBaseUrl) { $SteamBaseUrl = "http://localhost:$Port" }
} else {
  if ($detectedArmaPath) {
    Write-Host "Arma Server rilevato: $detectedArmaPath" -ForegroundColor Green
  }

  while ($true) {
    $ArmaPath = Read-RequiredValue "Cartella Arma 3 Server (contiene arma3server_x64.exe)" $detectedArmaPath
    if (Test-ArmaServerPath $ArmaPath) { break }
    Write-Host "Percorso non valido: arma3server_x64.exe/arma3server.exe non trovato." -ForegroundColor Red
    $detectedArmaPath = ""
  }

  $useX64 = Read-YesNo "Usare Arma 3 Server x64?" $true
  $Game = if ($useX64) { "arma3_x64" } else { "arma3" }
  $selectedExecutable = if ($useX64) { "arma3server_x64.exe" } else { "arma3server.exe" }
  if (-not (Test-Path -LiteralPath (Join-Path $ArmaPath $selectedExecutable))) {
    throw "La modalita selezionata richiede $selectedExecutable, ma il file non esiste nella cartella Arma scelta."
  }
  $SteamCmdInstallPath = Read-RequiredValue "Cartella di installazione SteamCMD" $(if ($SteamCmdInstallPath) { $SteamCmdInstallPath } else { "C:\SteamCMD" })
  $Port = [int](Read-RequiredValue "Porta del pannello web" ([string]$Port))
  $SteamBaseUrl = Read-RequiredValue "URL usato per aprire il pannello (callback Steam)" $(if ($SteamBaseUrl) { $SteamBaseUrl } else { "http://localhost:$Port" })

  if (-not $PSBoundParameters.ContainsKey('OpenFirewall')) {
    $OpenFirewall = Read-YesNo "Aprire la porta TCP $Port nel Windows Firewall?" $true
  }
  if (-not $PSBoundParameters.ContainsKey('InstallService')) {
    $InstallService = Read-YesNo "Installare il pannello come servizio Windows?" $true
  }
}

Install-BundledNode
Assert-Command "npm"

$resolvedArmaPath = Find-ArmaServerPath
$ArmaPath = $resolvedArmaPath
$steamExe = Install-BundledSteamCmd

$armaPathLiteral = ConvertTo-StringLiteral $resolvedArmaPath
$steamCmdPathLiteral = ConvertTo-StringLiteral $SteamCmdInstallPath
$hostLiteral = ConvertTo-StringLiteral $HostAddress
$steamBaseUrlLiteral = ConvertTo-StringLiteral $SteamBaseUrl.TrimEnd('/')
$updateFeedUrlLiteral = ConvertTo-StringLiteral 'https://github.com/irkanot/Dave-Arma-Admin-Panel/releases/latest/download/latest.json'
$sessionSecret = [Guid]::NewGuid().ToString('N') + [Guid]::NewGuid().ToString('N')
$sessionSecretLiteral = ConvertTo-StringLiteral $sessionSecret

$configPath = Join-Path $ProjectRoot "config.js"
if (Test-Path -LiteralPath $configPath) {
  Copy-Item -LiteralPath $configPath -Destination "$configPath.bak" -Force
  Write-Host "Backup configurazione precedente: config.js.bak"
}

  @"
module.exports = {
  game: '$Game',
  path: $armaPathLiteral,
  port: $Port,
  host: $hostLiteral,
  type: '$Type',
  additionalConfigurationOptions: '',
  parameters: [
    '-noSound',
    '-world=empty'
  ],
  serverMods: [],
  admins: [],
  security: {
    enabled: true,
    usersFilePath: 'users.json',
    rolesFilePath: 'roles.json',
    users: [],
    roles: {
      admin: ['*'],
      operator: [
        'missions.view',
        'missions.upload'
      ],
      user: [
        'servers.view',
        'servers.start'
      ]
    },
    defaultRoles: ['user']
  },
  audit: {
    filePath: 'audit.json'
  },
  jobs: {
    filePath: 'jobs.json'
  },
  steamAuth: {
    enabled: true,
    baseUrl: $steamBaseUrlLiteral,
    sessionSecret: $sessionSecretLiteral,
    apiKey: ''
  },
  steamCmd: {
    executable: $steamCmdPathLiteral,
    downloadPath: '',
    username: 'anonymous',
    password: '',
    steamGuardCode: ''
  },
  updates: {
    feedUrl: $updateFeedUrlLiteral,
    releaseDirectory: 'Releases'
  },
  prefix: '',
  suffix: '',
  logFormat: 'dev',
  settingsFilePath: 'settings.json'
}
"@ | Set-Content -LiteralPath $configPath -Encoding ASCII
Write-Host "Configurazione salvata in config.js"

$settingsPath = Join-Path $ProjectRoot "settings.json"
if (Test-Path -LiteralPath $settingsPath) {
  Copy-Item -LiteralPath $settingsPath -Destination "$settingsPath.bak" -Force
}
@"
{
  "game": "$Game",
  "path": $armaPathLiteral,
  "type": "$Type",
  "prefix": "",
  "steamAuthEnabled": true,
  "steamAuth": {
    "enabled": true,
    "baseUrl": $steamBaseUrlLiteral,
    "sessionSecretConfigured": true,
    "apiKeyConfigured": false,
    "sessionSecret": $sessionSecretLiteral
  },
  "steamCmd": {
    "executable": $steamCmdPathLiteral,
    "downloadPath": "",
    "username": "anonymous",
    "passwordConfigured": false
  },
  "updates": {
    "feedUrl": $updateFeedUrlLiteral
  }
}
"@ | Set-Content -LiteralPath $settingsPath -Encoding UTF8
Write-Host "Impostazioni pannello salvate in settings.json"

foreach ($runtimeFile in @("servers.json", "roles.json", "jobs.json", "audit.json")) {
  $path = Join-Path $ProjectRoot $runtimeFile
  if (-not (Test-Path -LiteralPath $path)) {
    if ($runtimeFile -eq "roles.json") {
      @"
{
  "admin": [
    "*"
  ],
  "operator": [
    "missions.view",
    "missions.upload"
  ],
  "user": [
    "servers.view",
    "servers.start"
  ]
}
"@ | Set-Content -LiteralPath $path -Encoding ASCII
    } else {
      "[]" | Set-Content -LiteralPath $path -Encoding ASCII
    }
    Write-Host "Created $runtimeFile"
  }
}

$usersPath = Join-Path $ProjectRoot "users.json"
if (Test-Path -LiteralPath $usersPath) {
  Copy-Item -LiteralPath $usersPath -Destination "$usersPath.bak" -Force
}
"[]" | Set-Content -LiteralPath $usersPath -Encoding ASCII
Write-Host "Archivio utenti inizializzato: il primo account Steam autenticato diventera amministratore."

if ((-not (Test-Path -LiteralPath (Join-Path $ProjectRoot "node_modules"))) -or $ForceNpmInstall) {
  Write-Host "Installing npm dependencies"
  npm ci
} else {
  Write-Host "Bundled node_modules found; skipping npm ci"
}

if (-not (Test-Path -LiteralPath (Join-Path $ProjectRoot "assets\bundle.js"))) {
  npm run build
} else {
  Write-Host "Bundled assets found; skipping build"
}

if ($OpenFirewall) {
  $ruleName = "Arma Server Web Admin $Port"
  if (-not (Get-NetFirewallRule -DisplayName $ruleName -ErrorAction SilentlyContinue)) {
    New-NetFirewallRule -DisplayName $ruleName -Direction Inbound -Action Allow -Protocol TCP -LocalPort $Port | Out-Null
    Write-Host "Opened Windows Firewall TCP port $Port"
  }
}

if ($InstallService) {
  npm run install-windows-service
}

Write-Host ""
Write-Host "Install complete."
Write-Host "Arma path: $resolvedArmaPath"
Write-Host "SteamCMD: $steamExe"
Write-Host "Accesso: esclusivamente tramite Steam OpenID"
Write-Host "Primo accesso Steam: assegna automaticamente il ruolo admin"
Write-Host "Start with: npm start"
Write-Host "Open: http://$HostAddress`:$Port"
