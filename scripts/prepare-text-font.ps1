param(
  [switch]$ForceDownload
)

$ErrorActionPreference = "Stop"
$ProgressPreference = "SilentlyContinue"
Set-StrictMode -Version Latest
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

$Root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$LockPath = Join-Path $Root "font.lock.json"
$CacheBase = if ([string]::IsNullOrWhiteSpace($env:FFMPEG_FILTER_BUILDER_FONT_CACHE_ROOT)) {
  Join-Path ([System.IO.Path]::GetTempPath()) "browser-kitty\ffb-fonts"
} else {
  [System.IO.Path]::GetFullPath($env:FFMPEG_FILTER_BUILDER_FONT_CACHE_ROOT)
}

function Get-GitBlobSha1([string]$Path) {
  if (-not (Test-Path -LiteralPath $Path -PathType Leaf)) { throw "Font file not found: $Path" }
  $length = (Get-Item -LiteralPath $Path).Length
  $headerBytes = [System.Text.Encoding]::UTF8.GetBytes("blob $length`0")
  $memory = New-Object System.IO.MemoryStream
  $fileStream = [System.IO.File]::OpenRead($Path)
  $sha1 = [System.Security.Cryptography.SHA1]::Create()
  try {
    $memory.Write($headerBytes, 0, $headerBytes.Length)
    $fileStream.CopyTo($memory)
    $memory.Position = 0
    $hash = $sha1.ComputeHash($memory)
    return (($hash | ForEach-Object { $_.ToString("x2") }) -join "")
  } finally {
    $sha1.Dispose()
    $fileStream.Dispose()
    $memory.Dispose()
  }
}

if (-not (Test-Path -LiteralPath $LockPath -PathType Leaf)) { throw "font.lock.json was not found: $LockPath" }
$lock = Get-Content -Raw -Encoding UTF8 $LockPath | ConvertFrom-Json
if ([int]$lock.schemaVersion -ne 1) { throw "font.lock.json must use schemaVersion 1." }
if ([string]::IsNullOrWhiteSpace([string]$lock.url)) { throw "font.lock.json URL is empty." }
if ([string]$lock.gitBlobSha1 -notmatch '^[a-f0-9]{40}$') { throw "font.lock.json gitBlobSha1 is invalid." }
if ([long]$lock.bytes -le 0) { throw "font.lock.json bytes must be positive." }

$commit = [string]$lock.commit
$cacheRoot = Join-Path $CacheBase ("mplus1p\{0}" -f $commit)
$fontPath = Join-Path $cacheRoot "MPLUS1p-Regular.ttf"
if ($ForceDownload -and (Test-Path -LiteralPath $fontPath)) { Remove-Item -Force $fontPath }
New-Item -ItemType Directory -Force -Path $cacheRoot | Out-Null

if (-not (Test-Path -LiteralPath $fontPath -PathType Leaf)) {
  Write-Host "[Text Font] Downloading pinned M PLUS 1p Regular snapshot" -ForegroundColor Cyan
  $partialPath = "$fontPath.part"
  Remove-Item -Force -ErrorAction SilentlyContinue $partialPath
  Invoke-WebRequest -Uri ([string]$lock.url) -OutFile $partialPath -UseBasicParsing -Headers @{ "User-Agent" = "htmlapps-ffmpeg-filter-builder/1.1.0" }
  Move-Item -Force $partialPath $fontPath
} else {
  Write-Host "[Text Font] Using cached M PLUS 1p Regular" -ForegroundColor Cyan
}

$actualBytes = (Get-Item -LiteralPath $fontPath).Length
if ($actualBytes -ne [long]$lock.bytes) {
  Remove-Item -Force -ErrorAction SilentlyContinue $fontPath
  throw "Text font byte-size mismatch. Expected $($lock.bytes), got $actualBytes."
}
$actualBlob = Get-GitBlobSha1 $fontPath
if ($actualBlob -ne ([string]$lock.gitBlobSha1).ToLowerInvariant()) {
  Remove-Item -Force -ErrorAction SilentlyContinue $fontPath
  throw "Text font Git blob SHA-1 mismatch. Expected $($lock.gitBlobSha1), got $actualBlob."
}

Write-Host "[OK] Text font ready: $($lock.family) / $($lock.style)" -ForegroundColor Green
Write-Host "[Text Font] Cache: $fontPath" -ForegroundColor DarkGray
Write-Output $fontPath
