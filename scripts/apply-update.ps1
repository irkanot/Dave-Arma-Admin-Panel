param(
  [Parameter(Mandatory = $true)]
  [string]$Manifest,
  [Parameter(Mandatory = $true)]
  [string]$InstallRoot,
  [int]$ProcessId = 0,
  [switch]$RestartApplication
)

$ErrorActionPreference = "Stop"
$InstallRoot = [System.IO.Path]::GetFullPath($InstallRoot)
if (-not (Test-Path -LiteralPath (Join-Path $InstallRoot 'package.json'))) {
  throw "InstallRoot does not contain package.json: $InstallRoot"
}

$manifestPath = [System.IO.Path]::GetFullPath($Manifest)
$manifestData = Get-Content -Raw -LiteralPath $manifestPath | ConvertFrom-Json
if ($manifestData.schemaVersion -ne 1 -or -not $manifestData.version -or -not $manifestData.package -or -not $manifestData.sha256) {
  throw "Invalid update manifest."
}

$packagePath = Join-Path (Split-Path -Parent $manifestPath) $manifestData.package
if (-not (Test-Path -LiteralPath $packagePath)) { throw "Update package not found: $packagePath" }
$actualHash = (Get-FileHash -Algorithm SHA256 -LiteralPath $packagePath).Hash
if ($actualHash -ne $manifestData.sha256) { throw "SHA256 verification failed." }

$updateRoot = Join-Path $InstallRoot '.updates'
$statePath = Join-Path $updateRoot 'current.json'
$logPath = Join-Path $updateRoot 'update.log'
$backupRoot = Join-Path $updateRoot ("backups\" + $manifestData.version + '-' + (Get-Date -Format 'yyyyMMdd-HHmmss'))
$stage = Join-Path $updateRoot ("staging\" + [Guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Path $backupRoot,$stage -Force | Out-Null

function Write-UpdateState([string]$Status, [string]$Message) {
  [ordered]@{
    version = $manifestData.version
    status = $Status
    message = $Message
    updatedAt = (Get-Date).ToUniversalTime().ToString('o')
    package = $manifestData.package
  } | ConvertTo-Json | Set-Content -LiteralPath $statePath -Encoding UTF8
}

Add-Content -LiteralPath $logPath -Value "`r`n[$(Get-Date -Format o)] Starting update to $($manifestData.version) (PID $PID)"
Write-UpdateState 'running' 'Preparing backup and installation'

$runtimeFiles = @('config.js','settings.json','servers.json','users.json','roles.json','jobs.json','audit.json')
$service = Get-CimInstance Win32_Service | Where-Object { $_.PathName -and $_.PathName.IndexOf($InstallRoot, [System.StringComparison]::OrdinalIgnoreCase) -ge 0 } | Select-Object -First 1
if (-not $service) {
  try {
    $serviceName = (Get-Content -Raw -LiteralPath (Join-Path $InstallRoot 'package.json') | ConvertFrom-Json).name
    if ($serviceName) {
      $service = Get-CimInstance Win32_Service -Filter "Name='$serviceName'" -ErrorAction SilentlyContinue
    }
  } catch {}
}

try {
  robocopy $InstallRoot $backupRoot /E /XD node_modules .data .updates /XF *.log | Out-Null
  if ($LASTEXITCODE -ge 8) { throw "Backup failed (robocopy $LASTEXITCODE)." }

  if ($service -and $service.State -ne 'Stopped') {
    Stop-Service -Name $service.Name -Force
    (Get-Service -Name $service.Name).WaitForStatus('Stopped', [TimeSpan]::FromSeconds(30))
  }
  if (-not $service -and $ProcessId -gt 0 -and (Get-Process -Id $ProcessId -ErrorAction SilentlyContinue)) {
    Start-Sleep -Seconds 2
    Stop-Process -Id $ProcessId -Force
    Wait-Process -Id $ProcessId -ErrorAction SilentlyContinue
  }

  Expand-Archive -LiteralPath $packagePath -DestinationPath $stage -Force
  if (-not (Test-Path -LiteralPath (Join-Path $stage 'package.json'))) { throw "Package payload is invalid." }

  robocopy $stage $InstallRoot /E /XD .updates /XF $runtimeFiles | Out-Null
  if ($LASTEXITCODE -ge 8) { throw "Update copy failed (robocopy $LASTEXITCODE)." }

  Push-Location $InstallRoot
  try {
    npm ci
    if ($LASTEXITCODE -ne 0) { throw "npm ci failed." }
  } finally {
    Pop-Location
  }

  Write-UpdateState 'installed' 'Update installed successfully'

  if ($service) {
    Start-Service -Name $service.Name
  } elseif ($RestartApplication) {
    Start-Process -FilePath 'node.exe' -ArgumentList 'app.js' -WorkingDirectory $InstallRoot -WindowStyle Hidden
  }
  Write-Host "Update $($manifestData.version) installed successfully."
} catch {
  $failure = $_.Exception.Message
  Write-Host "Update failed; restoring backup." -ForegroundColor Red
  if (Test-Path -LiteralPath (Join-Path $backupRoot 'package.json')) {
    robocopy $backupRoot $InstallRoot /E /XD .updates /XF $runtimeFiles *.log | Out-Null
  }
  if ($service -and (Get-Service -Name $service.Name).Status -ne 'Running') { Start-Service -Name $service.Name }
  elseif (-not $service -and $RestartApplication) {
    Start-Process -FilePath 'node.exe' -ArgumentList 'app.js' -WorkingDirectory $InstallRoot -WindowStyle Hidden
  }
  Write-UpdateState 'failed' $failure
  throw
} finally {
  if (Test-Path -LiteralPath $stage) { Remove-Item -LiteralPath $stage -Recurse -Force }
}
