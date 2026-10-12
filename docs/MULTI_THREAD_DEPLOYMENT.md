# Multi-thread deployment

`dist/index.mt.html` is the standalone multi-thread build. It uses `SharedArrayBuffer`, so it must run in a cross-origin-isolated browsing context.

Required response headers:

```text
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Embedder-Policy: require-corp
```

`Cross-Origin-Resource-Policy: same-origin` is also used by the local helper and is recommended for the dedicated MT route when the route only serves same-origin assets.

The application checks both `crossOriginIsolated` and `SharedArrayBuffer` before enabling MT processing. If the hosting configuration is missing, the app remains readable but the multi-thread processing action is disabled with an explanation.

## Local Windows check

Run:

```powershell
.\start-local-mt.bat
```

The helper serves `dist/index.mt.html` from `127.0.0.1:8765` with the required headers. It is implemented with PowerShell/.NET `TcpListener`; Python, Node.js, and Docker are not required.

## GitHub Pages

GitHub Pages deployment is staged separately from the standalone artifacts:

```text
pages-dist/
├─ index.html                 # ST
└─ mt/
   ├─ index.html              # MT Pages wrapper
   └─ coi-serviceworker.js    # same-origin COI fallback
```

Published URLs:

```text
https://ttomohisa.github.io/htmlapps-ffmpeg-filter-builder/
https://ttomohisa.github.io/htmlapps-ffmpeg-filter-builder/mt/
```

GitHub Pages does not provide project-level custom response headers for this deployment. The `/mt/` copy therefore conditionally loads the vendored `coi-serviceworker` fallback when `window.crossOriginIsolated === false`. The worker injects the required COOP / COEP headers into same-origin responses and reloads the page once so `SharedArrayBuffer` can be used.

The fallback is intentionally not embedded into `dist/index.mt.html`. The standalone MT artifact remains a single HTML file and still expects the hosting server to provide cross-origin-isolation headers.

The vendored worker is pinned by `coi-serviceworker.lock.json` to:

```text
coi-serviceworker 0.1.7
commit 7b1d2a092d0d2dd2b7270b6f12f13605de26f214
```

Its MIT license is stored at `licenses/coi-serviceworker-MIT.txt`.

## Cloudflare Workers / Browser Kitty (current)

Browser Kitty has migrated from Azure Static Web Apps to Cloudflare Workers Static
Assets. The current private Browser Kitty repository `ttomohisa/browser-kit`
imports this app's GitHub Pages `/mt/` HTML and serves it as:

```text
https://browser-kitty.com/apps/ffmpeg-filter-builder.html
```

Only that app's URL receives the necessary COOP / COEP / CORP response headers,
declared in Browser Kitty's `cloudflare/_headers`:

```text
/apps/ffmpeg-filter-builder.html
  Cross-Origin-Opener-Policy: same-origin
  Cross-Origin-Embedder-Policy: require-corp
  Cross-Origin-Resource-Policy: same-origin
```

Browser Kitty sets `config/tools.json` to select `dist/index.mt.html`
and `sourceUrl: https://ttomohisa.github.io/htmlapps-ffmpeg-filter-builder/mt/`.
This is a build-time import, **not an iframe of GitHub Pages**. On the isolated
Cloudflare route the conditional GitHub Pages `coi-serviceworker` bootstrap
is not activated; Browser Kitty does not require the Service Worker asset.

Do **not** apply COOP/COEP globally. Most Browser Kitty tools continue to run
without cross-origin isolation.

## Live Pages browser verification

`.github/workflows/check-pages-isolation.yml` performs a short, separate
live smoke test without rebuilding the large FFmpeg bundles: it checks the ST
and MT GitHub Pages URLs, availability of the same-origin COI Service Worker,
then uses Chromium DevTools to verify `crossOriginIsolated === true` and
`SharedArrayBuffer` after the MT page's first-load Service Worker reload.
The existing Cloudflare Preview workflow continues to verify MT isolation
with **server** headers and fails immediately when they are absent. Neither
test asserts universal compatibility across all browser engines or private mode.

## Standard build

`dist/index.html` is the portable single-thread build. It does not require these headers and is the default artifact for direct `file://` use and hosts where cross-origin isolation is not configured.
