param(
  [Parameter(Mandatory = $true)]
  [ValidateSet("single-thread", "multi-thread")]
  [string]$Variant,
  [switch]$ForceDownload
)

$ErrorActionPreference = "Stop"
$ProgressPreference = "SilentlyContinue"
Set-StrictMode -Version Latest
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

$Root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$LockPath = Join-Path $Root "runtime.lock.json"
$CacheBase = if ([string]::IsNullOrWhiteSpace($env:FFMPEG_FILTER_BUILDER_CACHE_ROOT)) {
  Join-Path ([System.IO.Path]::GetTempPath()) "browser-kitty\ffb-runtime"
} else {
  [System.IO.Path]::GetFullPath($env:FFMPEG_FILTER_BUILDER_CACHE_ROOT)
}

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

if (-not (Test-Path -LiteralPath $LockPath -PathType Leaf)) { throw "runtime.lock.json was not found: $LockPath" }
$lock = Get-Content -Raw -Encoding UTF8 $LockPath | ConvertFrom-Json
if ([int]$lock.schemaVersion -ne 1) { throw "runtime.lock.json must use schemaVersion 1." }
$variantProperty = $lock.variants.PSObject.Properties[$Variant]
if ($null -eq $variantProperty) { throw "runtime.lock.json has no variant '$Variant'." }
$entry = $variantProperty.Value
$builderVersion = [string]$lock.builderVersion
$variantKey = if ($Variant -eq "single-thread") { "st" } else { "mt" }
$variantRoot = Join-Path $CacheBase ("v{0}\{1}" -f $builderVersion, $variantKey)
$archivePath = Join-Path $variantRoot "runtime.zip"
$extractRoot = Join-Path $variantRoot "x"
$requiredFiles = @("browser-ffmpeg.js", "ffmpeg.js", "ffmpeg.wasm", "ffmpeg.js.gz", "ffmpeg.wasm.gz", "manifest.json", "BUILDINFO.txt", "THIRD_PARTY_NOTICES.md")

function Get-MissingRuntimeFiles([string]$RootPath) {
  $missing = @()
  foreach ($name in $requiredFiles) {
    $path = Join-Path $RootPath $name
    if (-not (Test-Path -LiteralPath $path -PathType Leaf)) { $missing += $name }
  }
  return $missing
}

function Expand-VerifiedRuntimeArchive([string]$ArchivePath, [string]$DestinationPath, [string]$RuntimeVariant) {
  if (Test-Path -LiteralPath $DestinationPath) { Remove-Item -Recurse -Force $DestinationPath }
  Write-Host "[FFmpeg Runtime] Extracting $RuntimeVariant runtime" -ForegroundColor Cyan
  New-Item -ItemType Directory -Force -Path $DestinationPath | Out-Null
  Expand-Archive -LiteralPath $ArchivePath -DestinationPath $DestinationPath -Force
}

if ($ForceDownload -and (Test-Path $variantRoot)) { Remove-Item -Recurse -Force $variantRoot }
New-Item -ItemType Directory -Force -Path $variantRoot | Out-Null

if (-not (Test-Path -LiteralPath $archivePath -PathType Leaf)) {
  Write-Host "[FFmpeg Runtime] Downloading $Variant runtime from Builder v$builderVersion" -ForegroundColor Cyan
  $partialPath = "$archivePath.part"
  $downloadDirectory = Split-Path -Parent $partialPath
  [System.IO.Directory]::CreateDirectory($downloadDirectory) | Out-Null
  Remove-Item -Force -ErrorAction SilentlyContinue $partialPath
  Invoke-WebRequest -Uri ([string]$entry.url) -OutFile $partialPath -UseBasicParsing -Headers @{ "User-Agent" = "htmlapps-ffmpeg-filter-builder/1.1.0" }
  Move-Item -Force $partialPath $archivePath
} else {
  Write-Host "[FFmpeg Runtime] Using cached $Variant runtime" -ForegroundColor Cyan
}

$actualArchiveHash = Get-Sha256FileHex $archivePath
$expectedArchiveHash = ([string]$entry.sha256).ToLowerInvariant()
if ($actualArchiveHash -ne $expectedArchiveHash) {
  Remove-Item -Force -ErrorAction SilentlyContinue $archivePath
  throw "FFmpeg runtime archive SHA-256 mismatch for $Variant. Expected $expectedArchiveHash, got $actualArchiveHash."
}

$needsExtraction = -not (Test-Path -LiteralPath $extractRoot -PathType Container)
if (-not $needsExtraction) {
  $missingCachedFiles = @(Get-MissingRuntimeFiles $extractRoot)
  if ($missingCachedFiles.Count -gt 0) {
    Write-Host ("[FFmpeg Runtime] Cached extraction is incomplete for {0}: {1}. Rebuilding cache..." -f $Variant, ($missingCachedFiles -join ", ")) -ForegroundColor Yellow
    Remove-Item -Recurse -Force $extractRoot
    $needsExtraction = $true
  }
}

if ($needsExtraction) {
  Expand-VerifiedRuntimeArchive $archivePath $extractRoot $Variant
}

$missingRuntimeFiles = @(Get-MissingRuntimeFiles $extractRoot)
if ($missingRuntimeFiles.Count -gt 0) {
  throw ("Pinned runtime archive is missing required file(s) for {0}: {1}" -f $Variant, ($missingRuntimeFiles -join ", "))
}

$browserRuntimeText = Get-Content -Raw -Encoding UTF8 (Join-Path $extractRoot "browser-ffmpeg.js")
foreach ($token in @("ffmpegFilterBuilderArgs", "startTimeSeconds", "durationSeconds")) {
  if (-not $browserRuntimeText.Contains($token)) { throw "Browser runtime helper is missing required Filter Builder API for ${Variant}: $token" }
}

$manifestPath = Join-Path $extractRoot "manifest.json"
$manifest = Get-Content -Raw -Encoding UTF8 $manifestPath | ConvertFrom-Json
if ([int]$manifest.schemaVersion -ne 8) { throw "Unexpected runtime manifest schema for ${Variant}: $($manifest.schemaVersion)" }
if ([string]$manifest.builderVersion -ne $builderVersion) { throw "Builder version mismatch for ${Variant}: $($manifest.builderVersion)" }
if ([string]$manifest.profile -ne [string]$lock.profile) { throw "Runtime profile mismatch for ${Variant}: $($manifest.profile)" }
if ([string]$manifest.runtime.threading -ne $Variant) { throw "Runtime threading mismatch for ${Variant}: $($manifest.runtime.threading)" }
if ($manifest.capabilities.timeRangeRender -ne $true) { throw "Runtime timeRangeRender capability is missing for ${Variant}." }
if ($manifest.capabilities.drawText -ne $true) { throw "Runtime drawText capability is missing for ${Variant}." }
foreach ($filter in @("trim", "setpts", "drawtext", "split", "overlay", "atrim", "asetpts", "volume", "afade", "atempo", "highpass", "lowpass", "loudnorm", "amix", "asplit", "aresample")) {
  if (@($manifest.catalog.filters) -notcontains $filter) { throw "Required Filter Builder runtime filter is missing for ${Variant}: $filter" }
}

$ffmpegJsPath = Join-Path $extractRoot "ffmpeg.js"
$ffmpegWasmPath = Join-Path $extractRoot "ffmpeg.wasm"
$jsHash = Get-Sha256FileHex $ffmpegJsPath
$wasmHash = Get-Sha256FileHex $ffmpegWasmPath
if ($jsHash -ne ([string]$manifest.files.'ffmpeg.js'.sha256).ToLowerInvariant()) { throw "ffmpeg.js SHA-256 does not match the runtime manifest for $Variant." }
if ($wasmHash -ne ([string]$manifest.files.'ffmpeg.wasm'.sha256).ToLowerInvariant()) { throw "ffmpeg.wasm SHA-256 does not match the runtime manifest for $Variant." }

Write-Host "[OK] FFmpeg runtime ready: $Variant / Builder v$builderVersion" -ForegroundColor Green
Write-Host "[FFmpeg Runtime] Cache: $variantRoot" -ForegroundColor DarkGray
Write-Output $extractRoot
