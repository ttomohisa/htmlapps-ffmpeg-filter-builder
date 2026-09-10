param(
  [switch]$ForceDownload,
  [switch]$SkipSelfExtract,
  [string]$SingleThreadRuntimeRoot = "",
  [string]$MultiThreadRuntimeRoot = ""
)

$ErrorActionPreference = "Stop"
$ProgressPreference = "SilentlyContinue"
Set-StrictMode -Version Latest

$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
$PreparePath = Join-Path $Root "scripts\prepare-ffmpeg-runtime.ps1"
$PrepareFontPath = Join-Path $Root "scripts\prepare-text-font.ps1"
$BuildVariantPath = Join-Path $Root "scripts\build-variant.ps1"
$SyntaxCheckPath = Join-Path $Root "scripts\check-powershell-syntax.ps1"
$RepositoryCheckPath = Join-Path $Root "scripts\check-repository.ps1"

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

function Assert-RuntimeRoot([string]$Variant, [string]$RuntimeRoot) {
  foreach ($name in @("ffmpeg.js", "ffmpeg.wasm", "ffmpeg.js.gz", "ffmpeg.wasm.gz", "manifest.json")) {
    $requiredPath = Join-Path $RuntimeRoot $name
    if (-not (Test-Path -LiteralPath $requiredPath -PathType Leaf)) {
      throw "Local $Variant runtime file was not found: $requiredPath"
    }
  }

  $manifestPath = Join-Path $RuntimeRoot "manifest.json"
  $manifest = Get-Content -Raw -Encoding UTF8 $manifestPath | ConvertFrom-Json
  if ([int]$manifest.schemaVersion -ne 8) { throw "Local $Variant runtime manifest schema must be 8." }
  if ([string]$manifest.builderVersion -ne "1.9.8") { throw "Local $Variant runtime must be built by FFmpeg WASM Builder v1.9.8." }
  if ([string]$manifest.profile -ne "ffmpeg-filter-builder") { throw "Local $Variant runtime must use the ffmpeg-filter-builder profile." }
  if ([string]$manifest.runtime.threading -ne $Variant) { throw "Local runtime threading mismatch: expected $Variant, got $($manifest.runtime.threading)." }
  if ($manifest.capabilities.timeRangeRender -ne $true) { throw "Local $Variant runtime must advertise timeRangeRender." }
  if ($manifest.capabilities.drawText -ne $true) { throw "Local $Variant runtime must advertise drawText." }
  foreach ($filter in @("trim", "setpts", "drawtext", "split", "overlay", "atrim", "asetpts", "volume", "afade", "atempo", "highpass", "lowpass", "loudnorm", "amix", "asplit", "aresample")) {
    if (@($manifest.catalog.filters) -notcontains $filter) { throw "Local $Variant runtime is missing required filter: $filter" }
  }

  $jsHash = Get-Sha256FileHex (Join-Path $RuntimeRoot "ffmpeg.js")
  $wasmHash = Get-Sha256FileHex (Join-Path $RuntimeRoot "ffmpeg.wasm")
  if ($jsHash -ne ([string]$manifest.files.'ffmpeg.js'.sha256).ToLowerInvariant()) { throw "Local ffmpeg.js does not match its runtime manifest for $Variant." }
  if ($wasmHash -ne ([string]$manifest.files.'ffmpeg.wasm'.sha256).ToLowerInvariant()) { throw "Local ffmpeg.wasm does not match its runtime manifest for $Variant." }
}

function Resolve-RuntimeRoot([string]$Variant, [string]$ExplicitRoot) {
  if (-not [string]::IsNullOrWhiteSpace($ExplicitRoot)) {
    $resolved = [System.IO.Path]::GetFullPath($ExplicitRoot)
    Assert-RuntimeRoot $Variant $resolved

    $browserRuntimePath = Join-Path $resolved "browser-ffmpeg.js"
    if (Test-Path -LiteralPath $browserRuntimePath -PathType Leaf) {
      $browserRuntimeText = Get-Content -Raw -Encoding UTF8 $browserRuntimePath
      foreach ($token in @("ffmpegFilterBuilderArgs", "startTimeSeconds", "durationSeconds")) {
        if (-not $browserRuntimeText.Contains($token)) { throw "Local $Variant browser runtime helper is missing required API: $token" }
      }
      Write-Host "[OK] Local FFmpeg runtime verified: $Variant / Builder v1.9.8" -ForegroundColor Green
      return $resolved
    }

    # Builder dist/ffmpeg-filter-builder/<variant> intentionally contains only build outputs.
    # The browser helper lives in Builder source at runtime/browser-ffmpeg.js and is added to
    # the published Release ZIP. For local Builder integration, stage both into one directory.
    $profileRoot = Split-Path -Parent $resolved
    $distRoot = Split-Path -Parent $profileRoot
    $builderRoot = Split-Path -Parent $distRoot
    $builderBrowserRuntime = Join-Path $builderRoot "runtime\browser-ffmpeg.js"
    if (-not (Test-Path -LiteralPath $builderBrowserRuntime -PathType Leaf)) {
      throw "Local $Variant runtime does not contain browser-ffmpeg.js, and Builder source helper was not found: $builderBrowserRuntime"
    }

    $localStageBase = Join-Path ([System.IO.Path]::GetTempPath()) "browser-kitty\ffb-local-runtime"
    $stageRoot = Join-Path $localStageBase $Variant
    if (Test-Path -LiteralPath $stageRoot) { Remove-Item -Recurse -Force $stageRoot }
    New-Item -ItemType Directory -Force -Path $stageRoot | Out-Null
    foreach ($name in @("ffmpeg.js", "ffmpeg.wasm", "ffmpeg.js.gz", "ffmpeg.wasm.gz", "manifest.json")) {
      Copy-Item -Force (Join-Path $resolved $name) (Join-Path $stageRoot $name)
    }
    Copy-Item -Force $builderBrowserRuntime (Join-Path $stageRoot "browser-ffmpeg.js")
    $browserRuntimeText = Get-Content -Raw -Encoding UTF8 (Join-Path $stageRoot "browser-ffmpeg.js")
    foreach ($token in @("ffmpegFilterBuilderArgs", "startTimeSeconds", "durationSeconds")) {
      if (-not $browserRuntimeText.Contains($token)) { throw "Local Builder browser runtime helper is missing required API: $token" }
    }
    Write-Host "[OK] Local Builder runtime staged: $Variant / Builder v1.9.8" -ForegroundColor Green
    return $stageRoot
  }

  Write-Host "[FFmpeg Runtime] Source: GitHub Release v1.9.8 ($Variant)" -ForegroundColor DarkGray
  $lines = @(& $PreparePath -Variant $Variant -ForceDownload:$ForceDownload)
  if ($lines.Count -lt 1) { throw "Runtime resolver returned no path for $Variant." }
  return [string]$lines[-1]
}

Write-Host "FFmpeg Filter Builder v1.0.0" -ForegroundColor Cyan
Write-Host "ST + MT standalone build / FFmpeg WASM Builder v1.9.8 / embedded M PLUS 1p"
Write-Host ""

Write-Host "[1/7] Validating PowerShell syntax..." -ForegroundColor Cyan
& $SyntaxCheckPath

Write-Host "[2/7] Preparing embedded text font..." -ForegroundColor Cyan
$fontLines = @(& $PrepareFontPath -ForceDownload:$ForceDownload)
if ($fontLines.Count -lt 1) { throw "Text font resolver returned no path." }
$fontPath = [string]$fontLines[-1]

Write-Host "[3/7] Resolving single-thread runtime..." -ForegroundColor Cyan
$stRoot = Resolve-RuntimeRoot "single-thread" $SingleThreadRuntimeRoot

Write-Host "[4/7] Resolving multi-thread runtime..." -ForegroundColor Cyan
$mtRoot = Resolve-RuntimeRoot "multi-thread" $MultiThreadRuntimeRoot

Write-Host "[5/7] Verifying ST/MT runtime parity..." -ForegroundColor Cyan
$st = Get-Content -Raw -Encoding UTF8 (Join-Path $stRoot "manifest.json") | ConvertFrom-Json
$mt = Get-Content -Raw -Encoding UTF8 (Join-Path $mtRoot "manifest.json") | ConvertFrom-Json
foreach ($property in @("filters", "encoders", "decoders", "muxers", "demuxers")) {
  $stItems = @($st.catalog.$property | ForEach-Object { [string]$_ } | Sort-Object)
  $mtItems = @($mt.catalog.$property | ForEach-Object { [string]$_ } | Sort-Object)
  if (($stItems -join "`n") -ne ($mtItems -join "`n")) { throw "ST/MT runtime catalog mismatch: $property" }
}
if ([string]$st.builderVersion -ne "1.9.8" -or [string]$mt.builderVersion -ne "1.9.8") { throw "FFmpeg WASM Builder v1.9.8 is required." }
if ([string]$st.profile -ne "ffmpeg-filter-builder" -or [string]$mt.profile -ne "ffmpeg-filter-builder") { throw "ffmpeg-filter-builder runtime profile is required." }
if ([string]$st.runtime.threading -ne "single-thread") { throw "Single-thread runtime manifest has an unexpected threading value." }
if ([string]$mt.runtime.threading -ne "multi-thread") { throw "Multi-thread runtime manifest has an unexpected threading value." }
if ($st.capabilities.timeRangeRender -ne $true -or $mt.capabilities.timeRangeRender -ne $true) { throw "Both runtimes must advertise timeRangeRender." }
if ($st.capabilities.drawText -ne $true -or $mt.capabilities.drawText -ne $true) { throw "Both runtimes must advertise drawText." }
foreach ($filter in @("trim", "setpts", "drawtext", "split", "overlay", "atrim", "asetpts", "volume", "afade", "atempo", "highpass", "lowpass", "loudnorm", "amix", "asplit", "aresample")) {
  if (@($st.catalog.filters) -notcontains $filter -or @($mt.catalog.filters) -notcontains $filter) { throw "Both runtimes must include required filter: $filter" }
}
Write-Host "[OK] Runtime catalogs match and bounded Preview capabilities are available." -ForegroundColor Green

Write-Host "[6/7] Building single-thread standalone..." -ForegroundColor Cyan
& $BuildVariantPath -Variant "single-thread" -RuntimeRoot $stRoot -FontPath $fontPath -SkipSelfExtract:$SkipSelfExtract

Write-Host "[7/7] Building multi-thread standalone..." -ForegroundColor Cyan
& $BuildVariantPath -Variant "multi-thread" -RuntimeRoot $mtRoot -FontPath $fontPath -SkipSelfExtract:$SkipSelfExtract

& $RepositoryCheckPath
Write-Host ""
Write-Host "[OK] FFmpeg Filter Builder v1.0.0 dual-runtime build completed." -ForegroundColor Green
Write-Host "  dist\index.html             single-thread / file:// supported"
Write-Host "  dist\index.mt.html          multi-thread / COOP+COEP required"
if (-not $SkipSelfExtract) {
  Write-Host "  dist\index.self-extract.html"
  Write-Host "  dist\index.mt.self-extract.html"
}
