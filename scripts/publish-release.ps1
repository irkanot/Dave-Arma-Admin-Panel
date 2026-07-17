param(
  [Parameter(Mandatory = $true)]
  [ValidatePattern('^\d+\.\d+\.\d+$')]
  [string]$Version,
  [string]$ReleaseDirectory = "",
  [string]$Channel = "stable"
)

$ErrorActionPreference = "Stop"
$ProjectRoot = Split-Path -Parent $PSScriptRoot
if (-not $ReleaseDirectory) {
  $ReleaseDirectory = Join-Path (Split-Path -Parent $ProjectRoot) "Releases"
}
$ReleaseDirectory = [System.IO.Path]::GetFullPath($ReleaseDirectory)
New-Item -ItemType Directory -Path $ReleaseDirectory -Force | Out-Null

Push-Location $ProjectRoot
try {
  npm run check
  if ($LASTEXITCODE -ne 0) { throw "Validation failed." }
} finally {
  Pop-Location
}

$stage = Join-Path $ReleaseDirectory (".staging-" + [Guid]::NewGuid().ToString('N'))
$payload = Join-Path $stage "payload"
$archiveName = "arma3-admin-panel-$Version.zip"
$archivePath = Join-Path $ReleaseDirectory $archiveName
New-Item -ItemType Directory -Path $payload -Force | Out-Null

try {
  robocopy $ProjectRoot $payload /E /XD .git node_modules installers Releases .data .updates /XF config.js settings.json servers.json users.json roles.json jobs.json audit.json *.log *.bak | Out-Null
  if ($LASTEXITCODE -ge 8) { throw "Unable to stage release (robocopy $LASTEXITCODE)." }

  $packagePath = Join-Path $payload "package.json"
  $package = Get-Content -Raw -LiteralPath $packagePath | ConvertFrom-Json
  $package.version = $Version
  $packageJson = $package | ConvertTo-Json -Depth 20
  [System.IO.File]::WriteAllText($packagePath, $packageJson, (New-Object System.Text.UTF8Encoding($false)))

  if (Test-Path -LiteralPath $archivePath) { Remove-Item -LiteralPath $archivePath -Force }
  Compress-Archive -Path (Join-Path $payload '*') -DestinationPath $archivePath -CompressionLevel Optimal
  $hash = (Get-FileHash -Algorithm SHA256 -LiteralPath $archivePath).Hash

  $manifest = [ordered]@{
    schemaVersion = 1
    channel = $Channel
    version = $Version
    publishedAt = (Get-Date).ToUniversalTime().ToString('o')
    package = $archiveName
    sha256 = $hash
    notes = "Stable GitHub release $Version"
  }
  $manifestJson = $manifest | ConvertTo-Json
  $utf8NoBom = New-Object System.Text.UTF8Encoding($false)
  [System.IO.File]::WriteAllText((Join-Path $ReleaseDirectory 'latest.json'), $manifestJson, $utf8NoBom)
  [System.IO.File]::WriteAllText((Join-Path $ReleaseDirectory ("manifest-$Version.json")), $manifestJson, $utf8NoBom)
  Write-Host "Published $Version -> $archivePath"
  Write-Host "SHA256: $hash"
} finally {
  if (Test-Path -LiteralPath $stage) { Remove-Item -LiteralPath $stage -Recurse -Force }
}
