# Offline verification — v1.0.0

## Single-thread standalone

1. Build with `build-standalone.bat` while online so the pinned runtime and font can be acquired and verified.
2. Disconnect the machine from the network.
3. Open `dist/index.html` directly with `file://`.
4. Load an MP4 file.
5. Apply at least one Recipe such as `2x Speed` or `Audio Normalize`.
6. Run Preview.
7. Run Full Render and save the generated MP4.
8. Save the Graph JSON, reload the page, and load the Graph JSON again.
9. Edit the graph, reload the page, and verify the previous-session recovery prompt.
10. Confirm no runtime network request is attempted; CSP keeps `connect-src 'none'`.

## Multi-thread standalone

1. Run `start-local-mt.bat` or deploy with the required COOP / COEP headers.
2. Confirm `crossOriginIsolated === true`.
3. Repeat Recipe → Preview → Full Render with `dist/index.mt.html`.
4. Confirm the same Graph JSON can be loaded in ST and MT builds.

## Draw Text

- Test Japanese and English Draw Text.
- Confirm the embedded M PLUS 1p font works while offline.
- Confirm Third-party licenses contains the OFL-1.1 text.

## Persistence boundary

- Autosave may retain Graph JSON data and output filename in this browser.
- Autosave must not retain the source media file or rendered MP4.
- Restoring a previous session must tell the user to select the media file again.
