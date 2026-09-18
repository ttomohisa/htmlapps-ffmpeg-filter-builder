param()

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$Root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$Dist = Join-Path $Root "dist"
$Pages = Join-Path $Root "pages-dist"
$MtPages = Join-Path $Pages "mt"
$WorkerSource = Join-Path $Root "vendor\coi-serviceworker\coi-serviceworker.js"
$WorkerLockPath = Join-Path $Root "coi-serviceworker.lock.json"

$stSource = Join-Path $Dist "index.html"
$mtSource = Join-Path $Dist "index.mt.html"
foreach ($path in @($stSource, $mtSource, $WorkerSource, $WorkerLockPath)) {
  if (-not (Test-Path -LiteralPath $path)) { throw "Required Pages input is missing: $path" }
}

$lock = Get-Content -Raw -Encoding UTF8 $WorkerLockPath | ConvertFrom-Json
$actualWorkerHash = (Get-FileHash -Algorithm SHA256 -LiteralPath $WorkerSource).Hash.ToLowerInvariant()
if ($actualWorkerHash -ne ([string]$lock.sha256).ToLowerInvariant()) {
  throw "coi-serviceworker.js SHA-256 does not match coi-serviceworker.lock.json."
}

if (Test-Path -LiteralPath $Pages) {
  Remove-Item -LiteralPath $Pages -Recurse -Force
}
New-Item -ItemType Directory -Path $MtPages -Force | Out-Null

Copy-Item -LiteralPath $stSource -Destination (Join-Path $Pages "index.html")
Copy-Item -LiteralPath $WorkerSource -Destination (Join-Path $MtPages "coi-serviceworker.js")
[System.IO.File]::WriteAllText((Join-Path $Pages ".nojekyll"), "", (New-Object System.Text.UTF8Encoding($false)))

$mtHtml = Get-Content -Raw -Encoding UTF8 $mtSource
$loader = @'
  <!-- GitHub Pages MT bootstrap. Hosts with server-side COOP/COEP do not load the fallback worker. -->
  <script>
    if (window.crossOriginIsolated === false) {
      window.coi = {
        coepCredentialless: () => false,
        coepDegrade: () => false,
        quiet: true
      };
      const coiScript = document.createElement("script");
      coiScript.src = "./coi-serviceworker.js";
      document.head.appendChild(coiScript);
    }
  </script>
'@
if (-not $mtHtml.Contains("</head>")) { throw "dist/index.mt.html does not contain </head>." }
if ($mtHtml.Contains("coi-serviceworker.js")) { throw "dist/index.mt.html must remain standalone and must not reference coi-serviceworker.js." }
$mtPagesHtml = $mtHtml.Replace("</head>", $loader + "`r`n</head>")
[System.IO.File]::WriteAllText((Join-Path $MtPages "index.html"), $mtPagesHtml, (New-Object System.Text.UTF8Encoding($false)))

Write-Host "[OK] GitHub Pages site prepared: $Pages"
Write-Host "  /       -> single-thread standalone"
Write-Host "  /mt/    -> multi-thread + same-origin COI service worker fallback"
