# Multi-thread deployment

`dist/index.mt.html` is the multi-thread build. It uses `SharedArrayBuffer`, so it must run in a cross-origin-isolated browsing context.

Required response headers:

```text
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Embedder-Policy: require-corp
```

This application also uses the following header in its local helper:

```text
Cross-Origin-Resource-Policy: same-origin
```

The HTML itself checks both `crossOriginIsolated` and `SharedArrayBuffer` before enabling the preview action. If the hosting configuration is missing, the app remains readable but the multi-thread preview button is disabled with an explanation.

## Local Windows check

Run:

```powershell
.\start-local-mt.bat
```

The helper serves `dist/index.mt.html` from `127.0.0.1:8765` with the required headers. It is implemented with PowerShell/.NET `TcpListener`; Python, Node.js, and Docker are not required.

## Azure Static Web Apps

Azure Static Web Apps supports response headers on individual route rules in `staticwebapp.config.json`.

When `index.mt.html` is deployed at the root, a minimal route rule is:

```json
{
  "routes": [
    {
      "route": "/index.mt.html",
      "headers": {
        "Cross-Origin-Opener-Policy": "same-origin",
        "Cross-Origin-Embedder-Policy": "require-corp",
        "Cross-Origin-Resource-Policy": "same-origin"
      }
    }
  ]
}
```

If the Browser Kitty host publishes the multi-thread build under another path, change `route` to that exact path or a suitable wildcard.

Do not apply COOP/COEP globally without reviewing the rest of the site. The intended Browser Kitty deployment model is to apply these headers only to the tool route that needs the multi-thread runtime.

Microsoft reference:

```text
https://learn.microsoft.com/azure/static-web-apps/configuration
```

## Standard build

`dist/index.html` is the portable single-thread build. It does not require these headers and is the default artifact for direct `file://` use and hosts where cross-origin isolation is not configured.
