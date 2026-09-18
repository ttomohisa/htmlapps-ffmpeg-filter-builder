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

## Azure Static Web Apps / Browser Kitty

Azure Static Web Apps supports route-specific response headers in `staticwebapp.config.json`.

If Browser Kitty imports or copies the `/mt/` HTML and serves it from an Azure Static Web Apps route, configure that Azure route with the required headers. For example, if the final route is `/apps/ffmpeg-filter-builder/mt/*`:

```json
{
  "routes": [
    {
      "route": "/apps/ffmpeg-filter-builder/mt/*",
      "headers": {
        "Cross-Origin-Opener-Policy": "same-origin",
        "Cross-Origin-Embedder-Policy": "require-corp",
        "Cross-Origin-Resource-Policy": "same-origin"
      }
    }
  ]
}
```

When Azure supplies those headers, `crossOriginIsolated` is already true. The Pages-specific inline bootstrap therefore does not request `coi-serviceworker.js`. This means Browser Kitty may copy only the MT HTML into the Azure route if desired, provided the Azure response headers are correct.

Important distinction:

- Copy/import the HTML and serve it from the Browser Kitty Azure origin: Azure headers apply and MT works.
- Merely link to or iframe the original `github.io/mt/` URL: Azure headers do not modify GitHub Pages responses.

Do not apply COOP / COEP globally without reviewing the rest of the Browser Kitty site. Prefer the dedicated MT route.

Microsoft reference:

```text
https://learn.microsoft.com/azure/static-web-apps/configuration
```

## Standard build

`dist/index.html` is the portable single-thread build. It does not require these headers and is the default artifact for direct `file://` use and hosts where cross-origin isolation is not configured.
