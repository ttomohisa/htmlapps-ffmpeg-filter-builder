param(
  [int]$Port = 8765,
  [switch]$NoOpen
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$Root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$Dist = Join-Path $Root "dist"
$Index = Join-Path $Dist "index.mt.html"
if (-not (Test-Path -LiteralPath $Index -PathType Leaf)) {
  throw "dist\index.mt.html was not found. Run build-standalone.bat first."
}

function Get-ContentType([string]$Path) {
  switch ([System.IO.Path]::GetExtension($Path).ToLowerInvariant()) {
    ".html" { return "text/html; charset=utf-8" }
    ".json" { return "application/json; charset=utf-8" }
    ".svg" { return "image/svg+xml" }
    default { return "application/octet-stream" }
  }
}

function Write-Response(
  [System.Net.Sockets.NetworkStream]$Stream,
  [int]$StatusCode,
  [string]$StatusText,
  [string]$ContentType,
  [byte[]]$Body,
  [bool]$HeadOnly
) {
  $header = @(
    "HTTP/1.1 $StatusCode $StatusText",
    "Content-Type: $ContentType",
    "Content-Length: $($Body.Length)",
    "Cross-Origin-Opener-Policy: same-origin",
    "Cross-Origin-Embedder-Policy: require-corp",
    "Cross-Origin-Resource-Policy: same-origin",
    "Cache-Control: no-store",
    "Connection: close",
    "",
    ""
  ) -join "`r`n"
  $headerBytes = [System.Text.Encoding]::ASCII.GetBytes($header)
  $Stream.Write($headerBytes, 0, $headerBytes.Length)
  if (-not $HeadOnly -and $Body.Length -gt 0) {
    $Stream.Write($Body, 0, $Body.Length)
  }
  $Stream.Flush()
}

$address = [System.Net.IPAddress]::Loopback
$listener = New-Object System.Net.Sockets.TcpListener -ArgumentList @($address, $Port)
$listener.Start()
$url = "http://127.0.0.1:$Port/index.mt.html"

Write-Host "FFmpeg Filter Builder multi-thread server" -ForegroundColor Cyan
Write-Host "URL: $url"
Write-Host "COOP: same-origin"
Write-Host "COEP: require-corp"
Write-Host "Press Ctrl+C to stop."
if (-not $NoOpen) { Start-Process $url }

try {
  while ($true) {
    $client = $listener.AcceptTcpClient()
    try {
      $stream = $client.GetStream()
      $reader = New-Object System.IO.StreamReader -ArgumentList @($stream, [System.Text.Encoding]::ASCII, $false, 1024, $true)
      try {
        $requestLine = $reader.ReadLine()
        if ([string]::IsNullOrWhiteSpace($requestLine)) { continue }
        while ($true) {
          $line = $reader.ReadLine()
          if ($null -eq $line -or $line.Length -eq 0) { break }
        }

        $parts = @($requestLine.Split(' '))
        if ($parts.Count -lt 2) {
          $body = [System.Text.Encoding]::UTF8.GetBytes("Bad request")
          Write-Response $stream 400 "Bad Request" "text/plain; charset=utf-8" $body $false
          continue
        }

        $method = [string]$parts[0]
        $headOnly = $method.Equals("HEAD", [StringComparison]::OrdinalIgnoreCase)
        if (-not $method.Equals("GET", [StringComparison]::OrdinalIgnoreCase) -and -not $headOnly) {
          $body = [System.Text.Encoding]::UTF8.GetBytes("Method not allowed")
          Write-Response $stream 405 "Method Not Allowed" "text/plain; charset=utf-8" $body $false
          continue
        }

        $requestTarget = [string]$parts[1]
        $pathPart = $requestTarget.Split('?')[0]
        $requestPath = [Uri]::UnescapeDataString($pathPart.TrimStart('/'))
        if ([string]::IsNullOrWhiteSpace($requestPath)) { $requestPath = "index.mt.html" }

        $distFull = [System.IO.Path]::GetFullPath($Dist).TrimEnd([char[]]@([char]92, [char]47))
        $fullPath = [System.IO.Path]::GetFullPath((Join-Path $Dist $requestPath))
        $safePrefix = $distFull + [System.IO.Path]::DirectorySeparatorChar
        $isSafe = $fullPath.StartsWith($safePrefix, [StringComparison]::OrdinalIgnoreCase)
        if (-not $isSafe -or -not (Test-Path -LiteralPath $fullPath -PathType Leaf)) {
          $body = [System.Text.Encoding]::UTF8.GetBytes("Not found")
          Write-Response $stream 404 "Not Found" "text/plain; charset=utf-8" $body $headOnly
          continue
        }

        $bytes = [System.IO.File]::ReadAllBytes($fullPath)
        Write-Response $stream 200 "OK" (Get-ContentType $fullPath) $bytes $headOnly
      } finally {
        $reader.Dispose()
      }
    } catch {
      Write-Warning $_.Exception.Message
    } finally {
      $client.Close()
    }
  }
} finally {
  $listener.Stop()
}
