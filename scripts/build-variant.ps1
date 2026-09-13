param(
  [Parameter(Mandatory = $true)]
  [ValidateSet("single-thread", "multi-thread")]
  [string]$Variant,
  [Parameter(Mandatory = $true)]
  [string]$RuntimeRoot,
  [Parameter(Mandatory = $true)]
  [string]$FontPath,
  [switch]$SkipSelfExtract
)

$ErrorActionPreference = "Stop"
$ProgressPreference = "SilentlyContinue"
Set-StrictMode -Version Latest

$Root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$TemplatePath = Join-Path $Root "src\index.template.html"
$AppConfigPath = Join-Path $Root "app.config.json"
$AppIconPath = Join-Path $Root "assets\favicon.svg"
$FontLockPath = Join-Path $Root "font.lock.json"
$FontLicensePath = ""
$VerifyPath = Join-Path $Root "scripts\verify-standalone.ps1"
$SelfExtractBuilderPath = Join-Path $Root "scripts\build-self-extract.ps1"
$DistRoot = Join-Path $Root "dist"

function Get-Sha256Bytes([byte[]]$Bytes) {
  $algorithm = [System.Security.Cryptography.SHA256]::Create()
  try {
    $hashBytes = $algorithm.ComputeHash($Bytes)
    return (($hashBytes | ForEach-Object { $_.ToString("x2") }) -join "")
  } finally { $algorithm.Dispose() }
}
function Get-Sha256FileHex([string]$Path) {
  $bytes = [System.IO.File]::ReadAllBytes($Path)
  return Get-Sha256Bytes $bytes
}
function ConvertTo-SafeJson([object]$Value, [int]$Depth = 30) {
  return ($Value | ConvertTo-Json -Compress -Depth $Depth).Replace("<", "\u003c").Replace(">", "\u003e").Replace("&", "\u0026")
}
function Add-Asset([System.Collections.IDictionary]$Assets, [System.Collections.IList]$ManifestAssets, [string]$Key, [string]$OriginalPath, [string]$StoredPath, [string]$Mime, [string]$Compression) {
  $originalBytes = [System.IO.File]::ReadAllBytes($OriginalPath)
  $storedBytes = [System.IO.File]::ReadAllBytes($StoredPath)
  $sha = Get-Sha256Bytes $originalBytes
  $Assets[$Key] = [ordered]@{
    mime = $Mime
    compression = $Compression
    originalBytes = [long]$originalBytes.Length
    storedBytes = [long]$storedBytes.Length
    sha256 = $sha
    base64 = [Convert]::ToBase64String($storedBytes)
  }
  [void]$ManifestAssets.Add([ordered]@{
    key = $Key
    mime = $Mime
    compression = $Compression
    bytes = [long]$originalBytes.Length
    storedBytes = [long]$storedBytes.Length
    sha256 = $sha
  })
}

$appConfig = Get-Content -Raw -Encoding UTF8 $AppConfigPath | ConvertFrom-Json
$fontLock = Get-Content -Raw -Encoding UTF8 $FontLockPath | ConvertFrom-Json
$FontLicensePath = Join-Path $Root ([string]$fontLock.licenseFile)
if (-not (Test-Path -LiteralPath $FontLicensePath -PathType Leaf)) { throw "Text font license was not found: $FontLicensePath" }
if (-not (Test-Path -LiteralPath $FontPath -PathType Leaf)) { throw "Text font was not prepared: $FontPath" }
if ((Get-Item -LiteralPath $FontPath).Length -ne [long]$fontLock.bytes) { throw "Prepared text font size does not match font.lock.json." }
$runtimeManifestPath = Join-Path $RuntimeRoot "manifest.json"
$runtimeManifest = Get-Content -Raw -Encoding UTF8 $runtimeManifestPath | ConvertFrom-Json
if ([string]$runtimeManifest.runtime.threading -ne $Variant) { throw "RuntimeRoot does not contain the requested $Variant runtime." }

$outputRelative = if ($Variant -eq "multi-thread") { [string]$appConfig.build.multiThreadOutput } else { [string]$appConfig.build.output }
$outputPath = Join-Path $Root $outputRelative
$outputDirectory = Split-Path -Parent $outputPath
New-Item -ItemType Directory -Force -Path $outputDirectory | Out-Null

$runtimeAssets = [ordered]@{}
$manifestAssets = New-Object System.Collections.ArrayList
Add-Asset $runtimeAssets $manifestAssets "browser-runtime" (Join-Path $RuntimeRoot "browser-ffmpeg.js") (Join-Path $RuntimeRoot "browser-ffmpeg.js") "text/javascript" "none"
Add-Asset $runtimeAssets $manifestAssets "ffmpeg-js" (Join-Path $RuntimeRoot "ffmpeg.js") (Join-Path $RuntimeRoot "ffmpeg.js.gz") "text/javascript" "gzip"
Add-Asset $runtimeAssets $manifestAssets "ffmpeg-wasm" (Join-Path $RuntimeRoot "ffmpeg.wasm") (Join-Path $RuntimeRoot "ffmpeg.wasm.gz") "application/wasm" "gzip"
Add-Asset $runtimeAssets $manifestAssets "manifest" $runtimeManifestPath $runtimeManifestPath "application/json" "none"

$fontAssets = [ordered]@{}
$fontManifestAssets = New-Object System.Collections.ArrayList
Add-Asset $fontAssets $fontManifestAssets "regular" $FontPath $FontPath "font/ttf" "none"
Add-Asset $fontAssets $fontManifestAssets "license" $FontLicensePath $FontLicensePath "text/plain; charset=utf-8" "none"

$assetBundle = [ordered]@{
  schemaVersion = 2
  dependencies = [ordered]@{
    "ffmpeg-filter-builder-runtime" = [ordered]@{
      package = "github-release"
      version = [string]$runtimeManifest.builderVersion
      assets = $runtimeAssets
    }
    "text-font" = [ordered]@{
      package = "google-fonts-snapshot"
      version = [string]$fontLock.commit
      assets = $fontAssets
    }
  }
}
$manifest = [ordered]@{
  schemaVersion = 2
  builder = "htmlapps-ffmpeg-filter-builder/1.1.0"
  generatedAtUtc = [DateTime]::UtcNow.ToString("o")
  app = [ordered]@{ name = [string]$appConfig.name; slug = [string]$appConfig.slug; version = [string]$appConfig.version }
  runtime = [ordered]@{
    source = "ttomohisa/htmlapps-ffmpeg-wasm-builder"
    builderVersion = [string]$runtimeManifest.builderVersion
    profile = [string]$runtimeManifest.profile
    variant = $Variant
    manifestSchemaVersion = [int]$runtimeManifest.schemaVersion
  }
  dependencies = @(
    [ordered]@{
      id = "ffmpeg-filter-builder-runtime"
      package = "github-release"
      version = [string]$runtimeManifest.builderVersion
      license = [string]$runtimeManifest.binaryLicense
      homepage = "https://github.com/ttomohisa/htmlapps-ffmpeg-wasm-builder"
      locked = $true
      assets = @($manifestAssets)
    },
    [ordered]@{
      id = "text-font"
      package = "google-fonts-snapshot"
      version = [string]$fontLock.commit
      license = [string]$fontLock.license
      homepage = "https://fonts.google.com/specimen/M+PLUS+1p"
      locked = $true
      assets = @($fontManifestAssets)
    }
  )
}

$appIconBytes = [System.IO.File]::ReadAllBytes($AppIconPath)
$appIconDataUri = "data:image/svg+xml;base64," + [Convert]::ToBase64String($appIconBytes)
$template = [System.IO.File]::ReadAllText($TemplatePath, [System.Text.Encoding]::UTF8)
$replacements = [ordered]@{
  "__APP_CONFIG_JSON__" = ConvertTo-SafeJson $appConfig 20
  "__BUILD_MANIFEST_JSON__" = ConvertTo-SafeJson $manifest 40
  "__EMBEDDED_ASSET_BUNDLE_JSON__" = ConvertTo-SafeJson $assetBundle 60
  "__APP_ICON_DATA_URI__" = $appIconDataUri
  "__RUNTIME_VARIANT__" = $Variant
}
$expectedCounts = @{
  "__APP_CONFIG_JSON__" = 1
  "__BUILD_MANIFEST_JSON__" = 1
  "__EMBEDDED_ASSET_BUNDLE_JSON__" = 1
  "__APP_ICON_DATA_URI__" = 2
  "__RUNTIME_VARIANT__" = 1
}
foreach ($entry in $replacements.GetEnumerator()) {
  $count = ([regex]::Matches($template, [regex]::Escape([string]$entry.Key))).Count
  $expected = [int]$expectedCounts[$entry.Key]
  if ($count -ne $expected) { throw "Template placeholder $($entry.Key) must occur exactly $expected time(s); found $count." }
  $template = $template.Replace([string]$entry.Key, [string]$entry.Value)
}
[System.IO.File]::WriteAllText($outputPath, $template, (New-Object System.Text.UTF8Encoding($false)))

& $VerifyPath -Path $outputPath -RequireNetworkBlock $true -ForbiddenPlaceholders @($replacements.Keys)

$variantSuffix = if ($Variant -eq "multi-thread") { ".mt" } else { "" }
$manifestOut = Join-Path $DistRoot ("dependency-manifest{0}.json" -f $variantSuffix)
[System.IO.File]::WriteAllText($manifestOut, ($manifest | ConvertTo-Json -Depth 40), (New-Object System.Text.UTF8Encoding($false)))
$runtimeManifestOut = Join-Path $DistRoot ("runtime-manifest{0}.json" -f $variantSuffix)
Copy-Item -Force $runtimeManifestPath $runtimeManifestOut

$selfExtractPath = ""
if (-not $SkipSelfExtract -and [bool]$appConfig.build.selfExtract.enabled) {
  $selfExtractRelative = if ($Variant -eq "multi-thread") { [string]$appConfig.build.selfExtract.multiThreadOutput } else { [string]$appConfig.build.selfExtract.output }
  $selfExtractPath = Join-Path $Root $selfExtractRelative
  & $SelfExtractBuilderPath -InputPath $outputPath -OutputPath $selfExtractPath -AppName ([string]$appConfig.name) -AppNameJa ([string]$appConfig.nameJa)
}

$assetRaw = 0L
$assetStored = 0L
$assetRows = @()
foreach ($asset in @($manifestAssets)) {
  $assetRaw += [long]$asset.bytes
  $assetStored += [long]$asset.storedBytes
  $assetRows += [ordered]@{ dependency = "ffmpeg-filter-builder-runtime"; key = [string]$asset.key; compression = [string]$asset.compression; originalBytes = [long]$asset.bytes; storedBytes = [long]$asset.storedBytes }
}
foreach ($asset in @($fontManifestAssets)) {
  $assetRaw += [long]$asset.bytes
  $assetStored += [long]$asset.storedBytes
  $assetRows += [ordered]@{ dependency = "text-font"; key = [string]$asset.key; compression = [string]$asset.compression; originalBytes = [long]$asset.bytes; storedBytes = [long]$asset.storedBytes }
}
$readableBytes = (Get-Item $outputPath).Length
$selfExtractBytes = if ($selfExtractPath -and (Test-Path $selfExtractPath)) { (Get-Item $selfExtractPath).Length } else { 0L }
$sizeReport = [ordered]@{
  schemaVersion = 1
  generatedAtUtc = [DateTime]::UtcNow.ToString("o")
  variant = $Variant
  readableHtmlBytes = [long]$readableBytes
  selfExtractHtmlBytes = [long]$selfExtractBytes
  embeddedAssetOriginalBytes = $assetRaw
  embeddedAssetStoredBytes = $assetStored
  embeddedAssetSavedBytes = $assetRaw - $assetStored
  assets = $assetRows
}
$sizeReportPath = Join-Path $DistRoot ("build-size-report{0}.json" -f $variantSuffix)
[System.IO.File]::WriteAllText($sizeReportPath, ($sizeReport | ConvertTo-Json -Depth 20), (New-Object System.Text.UTF8Encoding($false)))
[System.IO.File]::WriteAllText((Join-Path $DistRoot ".nojekyll"), "", (New-Object System.Text.UTF8Encoding($false)))

Write-Host "[OK] $Variant standalone: $outputPath" -ForegroundColor Green
Write-Host ("[Size] readable={0:N2} MB self-extract={1:N2} MB embedded={2:N2} MB -> {3:N2} MB" -f ($readableBytes/1MB), ($selfExtractBytes/1MB), ($assetRaw/1MB), ($assetStored/1MB))
