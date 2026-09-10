param()

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest
$Root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)

$required = @(
  "AGENTS.md", "APP_SPEC.md", "app.config.json", "runtime.lock.json", "font.lock.json", "licenses\MPLUS1p-OFL.txt", "assets\favicon.svg",
  "src\index.template.html", "build-standalone.ps1", "build-standalone.bat", "build-with-local-ffmpeg.bat",
  "scripts\prepare-ffmpeg-runtime.ps1", "scripts\prepare-text-font.ps1", "scripts\build-variant.ps1", "scripts\build-self-extract.ps1",
  "scripts\check-powershell-syntax.ps1", "scripts\verify-standalone.ps1", "scripts\verify-self-extract.ps1",
  "README.md", "README.ja.md", "LICENSE", "THIRD_PARTY_NOTICES.md", "docs\MULTI_THREAD_DEPLOYMENT.md", "docs\GRAPH_COMPILER.md", "docs\PREVIEW_ENGINE.md", "docs\VIDEO_FILTER_SET.md", "docs\COMPLEX_FILTERGRAPH.md", "docs\AUDIO_FILTER_SET.md", "docs\TEXT_FILTER_SET.md", "docs\RECIPES_FULL_RENDER.md", "tests\graph-core-smoke.mjs", "tests\preview-engine-smoke.mjs", "tests\video-filter-set-smoke.mjs", "tests\complex-filtergraph-smoke.mjs", "tests\audio-filter-set-smoke.mjs", "tests\text-filter-set-smoke.mjs", "tests\recipes-full-render-smoke.mjs", "tests\release-smoke.mjs", "tests\i18n-smoke.mjs", "tests\fixtures\smoke-input.mp4"
)
foreach ($relative in $required) {
  if (-not (Test-Path -LiteralPath (Join-Path $Root $relative))) { throw "Required repository file is missing: $relative" }
}

$forbidden = @(
  "htmlapps-template.zip", "README-FIRST.txt", "examples",
  "components\webrtc-qr-pairing.html", "docs\WEBRTC_QR_PAIRING.md", "docs\WEBRTC_QR_PAIRING.ja.md",
  "dependencies.json", "dependencies.lock.json", "scripts\dependency-tools.ps1", "scripts\check-dependency-updates.ps1",
  "scripts\sync-dependency-lock.ps1", "scripts\update-dependency.ps1", ".github\workflows\dependency-updates.yml"
)
foreach ($relative in $forbidden) {
  if (Test-Path -LiteralPath (Join-Path $Root $relative)) { throw "Unused template artifact must not be committed in v1.0.0: $relative" }
}

$app = Get-Content -Raw -Encoding UTF8 (Join-Path $Root "app.config.json") | ConvertFrom-Json
if ([string]$app.version -ne "1.0.0") { throw "app.config.json version must be 1.0.0 for this release." }
if ([string]$app.repository.owner -ne "ttomohisa" -or [string]$app.repository.name -ne "htmlapps-ffmpeg-filter-builder") { throw "Repository metadata is incorrect." }

$lock = Get-Content -Raw -Encoding UTF8 (Join-Path $Root "runtime.lock.json") | ConvertFrom-Json
if ([string]$lock.builderVersion -ne "1.9.8") { throw "runtime.lock.json must pin FFmpeg WASM Builder v1.9.8." }
if ([string]$lock.profile -ne "ffmpeg-filter-builder") { throw "runtime.lock.json must use ffmpeg-filter-builder profile." }
foreach ($variant in @("single-thread", "multi-thread")) {
  $entry = $lock.variants.PSObject.Properties[$variant].Value
  if ([string]$entry.sha256 -notmatch '^[a-f0-9]{64}$') { throw "runtime.lock.json has an invalid SHA-256 for $variant." }
  if (-not ([string]$entry.url).Contains("/releases/download/v1.9.8/")) { throw "Runtime URL is not pinned to v1.9.8 for $variant." }
}

$fontLock = Get-Content -Raw -Encoding UTF8 (Join-Path $Root "font.lock.json") | ConvertFrom-Json
if ([int]$fontLock.schemaVersion -ne 1) { throw "font.lock.json must use schemaVersion 1." }
if ([string]$fontLock.commit -ne "a24c920263576ec723d64c1b26f8afabb841601d") { throw "font.lock.json must pin the reviewed M PLUS 1p snapshot." }
if ([string]$fontLock.gitBlobSha1 -ne "e16cd93613c26bb9d66d2060d6fd491c7222689f") { throw "font.lock.json Git blob SHA-1 is unexpected." }
if ([long]$fontLock.bytes -ne 1758688) { throw "font.lock.json byte size is unexpected." }
if ([string]$fontLock.license -ne "OFL-1.1") { throw "font.lock.json must identify OFL-1.1." }
if ([string]$fontLock.virtualPath -ne "/fonts/MPLUS1p-Regular.ttf") { throw "font.lock.json virtualPath is unexpected." }
$fontExtensions = @(".ttf", ".otf", ".woff", ".woff2")
$committedFonts = @(
  Get-ChildItem -LiteralPath $Root -Recurse -File | Where-Object {
    $normalizedPath = $_.FullName -replace '\\', '/'
    $extension = $_.Extension.ToLowerInvariant()
    ($fontExtensions -contains $extension) -and
      $normalizedPath -notmatch '/dist/' -and
      $normalizedPath -notmatch '/\.git/'
  }
)
if ($committedFonts.Count -gt 0) {
  $fontList = ($committedFonts | ForEach-Object { [System.IO.Path]::GetRelativePath($Root, $_.FullName) }) -join ", "
  throw "Font binaries must not be committed to the source package. The build must fetch the pinned font and embed it into generated HTML. Found: $fontList"
}

$source = Get-Content -Raw -Encoding UTF8 (Join-Path $Root "src\index.template.html")
$placeholderCounts = @{
  "__APP_CONFIG_JSON__" = 1; "__BUILD_MANIFEST_JSON__" = 1; "__EMBEDDED_ASSET_BUNDLE_JSON__" = 1;
  "__APP_ICON_DATA_URI__" = 2; "__RUNTIME_VARIANT__" = 1
}
foreach ($entry in $placeholderCounts.GetEnumerator()) {
  $count = ([regex]::Matches($source, [regex]::Escape([string]$entry.Key))).Count
  if ($count -ne [int]$entry.Value) { throw "Unexpected source placeholder count for $($entry.Key): $count" }
}

$sourceMarkers = @(
  "connect-src 'none'", "'wasm-unsafe-eval'", "window.StandaloneAssets", "ffmpeg-filter-builder-runtime", "BrowserFFmpeg.ffmpegFilterBuilderArgs",
  "workerfs:true", "crossOriginIsolated", "SharedArrayBuffer", 'id="appBrandIcon"', ".preview-empty[hidden]",
  'data-add-node="trim"', 'data-add-node="speed"', 'data-add-node="fps"', 'data-add-node="crop"', 'data-add-node="scale"', 'data-add-node="pad"', 'data-add-node="rotate"', 'data-add-node="flip"', 'data-add-node="aspect"', 'data-add-node="colorAdjust"', 'data-add-node="hue"', 'data-add-node="blur"', 'data-add-node="sharpen"', 'data-add-node="fade"', 'data-add-node="split"', 'data-add-node="overlay"',
  'data-add-node="drawText"', 'data-add-node="audioTrim"', 'data-add-node="volume"', 'data-add-node="audioFade"', 'data-add-node="audioSpeed"', 'data-add-node="highpass"', 'data-add-node="lowpass"', 'data-add-node="normalize"', 'data-add-node="audioSplit"', 'data-add-node="audioMix"', 'id="graphCanvas"', 'id="inspectorBody"',
  "PORT_TYPES", "AUDIO:'audio'", "TEXT_FONT_ASSET_ID", "TEXT_FONT_LICENSE_ASSET_KEY", "TEXT_FONT_VIRTUAL_PATH", "MPLUS1p-Regular.ttf", "textFontLicense", "thirdPartyLicenses", "drawTextFilter", "drawTextTextFilePath", "drawTextTextFilePath(node)", "fontfile=", "expansion=none", "fromPort", "toPort", "split=2", "overlay=x=", "asplit=2", "amix=inputs=2", "audioFilter", "atempoChain", "inferSyncedVideoSpeedRate", "data-stream-type", "edge-path.audio", "function topologicalOrder", "function validateGraph", "function compileGraph", "filter_complex", "graphIR", "videoFilter",
  "state.history", 'id="undoButton"', 'id="redoButton"', 'id="commandCode"', 'id="previewButton"', 'id="cancelButton"',
  "PREVIEW_CACHE_MAX_ENTRIES=2", "PREVIEW_CACHE_MAX_BYTES=128*1024*1024", "function graphHash", "function previewCacheKey",
  'data-preview-duration="3"', 'data-preview-duration="5"', 'data-preview-duration="10"', 'id="previewStartInput"', 'id="previewStaleBadge"',
  'id="graphHashValue"', 'id="previewCacheValue"', "function mapPreviewError", "state.logEntries", "getBoundingClientRect()", "portRect.top+portRect.height/2-canvasRect.top", "data-port-key", "runtimeSupportsNodeType", "startTimeSeconds", "durationSeconds", "timeRangeRender", "drawText", "drawtext", "TIMELINE_SENSITIVE_NODE_TYPES", "previewSourceHorizon", "gblur=sigma=", "unsharp=5:5:", "setdar=", "eq=brightness=",
  'id="recipeSelect"', 'id="applyRecipeButton"', 'id="saveGraphButton"', 'id="loadGraphButton"', 'id="recoveryBanner"', "PROJECT_STORAGE_KEY", "ffmpeg-filter-builder-project-v1", "RECIPE_DEFS", "makeRecipeGraph",
  'id="fullRenderButton"', 'id="saveOutputButton"', 'id="outputFilenameInput"', "function renderFullVideo", "function saveFullRenderOutput", "const req={...state.compiled.request}", "showSaveFilePicker",
  '<details class="palette-group palette-disclosure">', '<summary class="palette-label" data-i18n="videoFilters">', '<summary class="palette-label" data-i18n="historyTitle">', ".palette-disclosure > summary.palette-label:focus-visible"
)
foreach ($token in $sourceMarkers) {
  if (-not $source.Contains($token)) { throw "src\index.template.html is missing required v1.0.0 marker: $token" }
}
if ($source -match '<script[^>]+src\s*=\s*["'']https?://') { throw "Runtime external script URL must not be added to source HTML." }
if ($source -match '<link[^>]+href\s*=\s*["'']https?://') { throw "Runtime external stylesheet URL must not be added to source HTML." }

$buildVariant = Get-Content -Raw -Encoding UTF8 (Join-Path $Root "scripts\build-variant.ps1")
foreach ($token in @("ffmpeg.js.gz", "ffmpeg.wasm.gz", "__RUNTIME_VARIANT__", "runtime-manifest", "github-release", "htmlapps-ffmpeg-filter-builder/1.0.0", "text-font", "font/ttf", "text/plain; charset=utf-8", "FontPath", "FontLicensePath", "licenseFile", "font.lock.json")) {
  if (-not $buildVariant.Contains($token)) { throw "scripts\build-variant.ps1 is missing required runtime embedding marker: $token" }
}
$prepare = Get-Content -Raw -Encoding UTF8 (Join-Path $Root "scripts\prepare-ffmpeg-runtime.ps1")
foreach ($token in @("runtime.lock.json", "SHA-256 mismatch", "manifest.files.'ffmpeg.wasm'.sha256", "Expand-Archive", "GetTempPath", "runtime.zip", "CreateDirectory", "ffmpegFilterBuilderArgs", "startTimeSeconds", "durationSeconds", "timeRangeRender", "trim", "setpts", "split", "overlay", "atrim", "asetpts", "volume", "afade", "atempo", "highpass", "lowpass", "loudnorm", "amix", "asplit", "drawtext", "drawText", "htmlapps-ffmpeg-filter-builder/1.0.0")) {
  if (-not $prepare.Contains($token)) { throw "scripts\prepare-ffmpeg-runtime.ps1 is missing required lock/verification marker: $token" }
}
$prepareFont = Get-Content -Raw -Encoding UTF8 (Join-Path $Root "scripts\prepare-text-font.ps1")
foreach ($token in @("font.lock.json", "Get-GitBlobSha1", "gitBlobSha1", "MPLUS1p-Regular.ttf", "htmlapps-ffmpeg-filter-builder/1.0.0", "GetTempPath")) {
  if (-not $prepareFont.Contains($token)) { throw "scripts\prepare-text-font.ps1 is missing required pinned-font marker: $token" }
}
$buildStandalone = Get-Content -Raw -Encoding UTF8 (Join-Path $Root "build-standalone.ps1")
foreach ($token in @("SingleThreadRuntimeRoot", "MultiThreadRuntimeRoot", "Assert-RuntimeRoot", "Local ffmpeg.wasm does not match", "Source: GitHub Release v1.9.8", "runtime\browser-ffmpeg.js", "ffb-local-runtime", "ffmpegFilterBuilderArgs", "startTimeSeconds", "durationSeconds", "timeRangeRender", "trim", "setpts", "split", "overlay", "atrim", "asetpts", "volume", "afade", "atempo", "highpass", "lowpass", "loudnorm", "amix", "asplit", "drawtext", "drawText", "PrepareFontPath", "-FontPath", "v1.0.0")) {
  if (-not $buildStandalone.Contains($token)) { throw "build-standalone.ps1 is missing required runtime resolution marker: $token" }
}
$defaultBuildBat = Get-Content -Raw -Encoding UTF8 (Join-Path $Root "build-standalone.bat")
if (-not $defaultBuildBat.Contains("Runtime source: GitHub Release v1.9.8")) { throw "build-standalone.bat must advertise GitHub Release v1.9.8 as the default runtime source." }
$mtServer = Get-Content -Raw -Encoding UTF8 (Join-Path $Root "scripts\serve-mt.ps1")
foreach ($token in @("System.Net.Sockets.TcpListener", "Cross-Origin-Opener-Policy", "Cross-Origin-Embedder-Policy", "Cross-Origin-Resource-Policy")) {
  if (-not $mtServer.Contains($token)) { throw "scripts\serve-mt.ps1 is missing required cross-origin-isolation marker: $token" }
}

foreach ($relative in @("build-standalone.ps1", "scripts\prepare-ffmpeg-runtime.ps1", "scripts\prepare-text-font.ps1", "scripts\build-variant.ps1", "scripts\build-self-extract.ps1", "scripts\verify-standalone.ps1")) {
  $text = Get-Content -Raw -Encoding UTF8 (Join-Path $Root $relative)
  if ($text -match '(?i)\bGet-FileHash\b') { throw "$relative must not depend on Get-FileHash." }
  if ($text -match '::new\s*\(') { throw "$relative must stay compatible with Windows PowerShell 5.1 and avoid ::new()." }
}

$stPath = Join-Path $Root "dist\index.html"
$mtPath = Join-Path $Root "dist\index.mt.html"
if (Test-Path $stPath) {
  & (Join-Path $Root "scripts\verify-standalone.ps1") -Path $stPath -RequireNetworkBlock $true -ForbiddenPlaceholders @("__APP_CONFIG_JSON__","__BUILD_MANIFEST_JSON__","__EMBEDDED_ASSET_BUNDLE_JSON__","__APP_ICON_DATA_URI__","__RUNTIME_VARIANT__")
  $stText = Get-Content -Raw -Encoding UTF8 $stPath
  if (-not $stText.Contains('const RUNTIME_VARIANT = "single-thread";')) { throw "dist\index.html is not the single-thread build." }
}
if (Test-Path $mtPath) {
  & (Join-Path $Root "scripts\verify-standalone.ps1") -Path $mtPath -RequireNetworkBlock $true -ForbiddenPlaceholders @("__APP_CONFIG_JSON__","__BUILD_MANIFEST_JSON__","__EMBEDDED_ASSET_BUNDLE_JSON__","__APP_ICON_DATA_URI__","__RUNTIME_VARIANT__")
  $mtText = Get-Content -Raw -Encoding UTF8 $mtPath
  if (-not $mtText.Contains('const RUNTIME_VARIANT = "multi-thread";')) { throw "dist\index.mt.html is not the multi-thread build." }
}

Write-Host "[OK] Repository check passed." -ForegroundColor Green
