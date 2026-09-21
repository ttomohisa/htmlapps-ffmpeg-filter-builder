param(
  [string]$Version = "1.9.9"
)

$ErrorActionPreference = "Stop"
$ProgressPreference = "SilentlyContinue"
Set-StrictMode -Version Latest

$Root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$LockPath = Join-Path $Root "runtime.lock.json"
$Repo = "ttomohisa/htmlapps-ffmpeg-wasm-builder"

function Get-Sha256FileHex([string]$Path) {
  $stream = [System.IO.File]::OpenRead($Path)
  $algorithm = [System.Security.Cryptography.SHA256]::Create()
  try {
    $hashBytes = $algorithm.ComputeHash($stream)
    return (($hashBytes | ForEach-Object { $_.ToString("x2") }) -join "")
  } finally {
    $algorithm.Dispose()
    $stream.Dispose()
  }
}

function Replace-Text([string]$RelativePath, [string]$Old, [string]$New) {
  $path = Join-Path $Root $RelativePath
  $text = Get-Content -Raw -Encoding UTF8 $path
  if (-not $text.Contains($Old)) {
    if ($text.Contains($New)) { return }
    throw "Expected text was not found in $RelativePath`n--- expected ---`n$Old"
  }
  $utf8NoBom = New-Object System.Text.UTF8Encoding
  [System.IO.File]::WriteAllText($path, $text.Replace($Old, $New), $utf8NoBom)
}

if ($Version -ne "1.9.9") { throw "This promotion script is intentionally scoped to Builder v1.9.9." }

$tempRoot = Join-Path ([System.IO.Path]::GetTempPath()) "browser-kitty\ffb-promote-$Version"
if (Test-Path -LiteralPath $tempRoot) { Remove-Item -Recurse -Force $tempRoot }
New-Item -ItemType Directory -Force -Path $tempRoot | Out-Null

$variants = @("single-thread", "multi-thread")
$entries = @{}
foreach ($variant in $variants) {
  $asset = "ffmpeg-wasm-ffmpeg-filter-builder-$variant-v$Version.zip"
  $url = "https://github.com/$Repo/releases/download/v$Version/$asset"
  $zip = Join-Path $tempRoot $asset
  Write-Host "[Download] $url" -ForegroundColor Cyan
  try {
    Invoke-WebRequest -UseBasicParsing -Uri $url -OutFile $zip
  } catch {
    throw "Builder v$Version release asset is not available yet: $url`n$($_.Exception.Message)"
  }
  $sha = Get-Sha256FileHex $zip
  $entries[$variant] = @{ asset=$asset; url=$url; sha256=$sha }
  Write-Host "[OK] $variant SHA-256 $sha" -ForegroundColor Green
}

$lock = [ordered]@{
  schemaVersion = 1
  builderRepository = $Repo
  builderVersion = $Version
  profile = "ffmpeg-filter-builder"
  variants = [ordered]@{
    "single-thread" = [ordered]@{
      asset = $entries["single-thread"].asset
      url = $entries["single-thread"].url
      sha256 = $entries["single-thread"].sha256
    }
    "multi-thread" = [ordered]@{
      asset = $entries["multi-thread"].asset
      url = $entries["multi-thread"].url
      sha256 = $entries["multi-thread"].sha256
    }
  }
}
$utf8NoBom = New-Object System.Text.UTF8Encoding
[System.IO.File]::WriteAllText($LockPath, (($lock | ConvertTo-Json -Depth 6) + "`n"), $utf8NoBom)

Replace-Text "build-standalone.ps1" '[FFmpeg Runtime] Source: GitHub Release v1.9.8 ($Variant)' '[FFmpeg Runtime] Source: GitHub Release v1.9.9 ($Variant)'
Replace-Text "build-standalone.ps1" 'ST + MT standalone build / default Builder v1.9.8; local v1.9.9 supported / embedded M PLUS 1p' 'ST + MT standalone build / Builder v1.9.9 GitHub Release / embedded M PLUS 1p'
Replace-Text "build-standalone.bat" 'Runtime source: GitHub Release v1.9.8' 'Runtime source: GitHub Release v1.9.9'
Replace-Text "scripts\check-repository.ps1" 'runtime.lock.json must pin FFmpeg WASM Builder v1.9.8.' 'runtime.lock.json must pin FFmpeg WASM Builder v1.9.9.'
Replace-Text "scripts\check-repository.ps1" '[string]$lock.builderVersion -ne "1.9.8"' '[string]$lock.builderVersion -ne "1.9.9"'
Replace-Text "scripts\check-repository.ps1" '/releases/download/v1.9.8/' '/releases/download/v1.9.9/'
Replace-Text "scripts\check-repository.ps1" 'Runtime URL is not pinned to v1.9.8 for $variant.' 'Runtime URL is not pinned to v1.9.9 for $variant.'
Replace-Text "scripts\check-repository.ps1" 'Source: GitHub Release v1.9.8' 'Source: GitHub Release v1.9.9'
Replace-Text "scripts\check-repository.ps1" 'Runtime source: GitHub Release v1.9.8' 'Runtime source: GitHub Release v1.9.9'
Replace-Text "tests\local-runtime-integration-smoke.mjs" "assert.equal(lock.builderVersion,'1.9.8','default/release runtime pin must remain v1.9.8');" "assert.equal(lock.builderVersion,'1.9.9','default/release runtime pin must use v1.9.9 after promotion');"

Write-Host "" 
Write-Host "[OK] FFmpeg Filter Builder now pins Builder v$Version GitHub Release assets." -ForegroundColor Green
Write-Host "Next: .\build-standalone.bat" -ForegroundColor Cyan
