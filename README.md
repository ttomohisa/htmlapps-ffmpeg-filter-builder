# FFmpeg Filter Builder

[![GitHub Pages](https://github.com/ttomohisa/htmlapps-ffmpeg-filter-builder/actions/workflows/deploy-pages.yml/badge.svg)](https://github.com/ttomohisa/htmlapps-ffmpeg-filter-builder/actions/workflows/deploy-pages.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Single HTML](https://img.shields.io/badge/distribution-single%20HTML-0ea5e9)](https://ttomohisa.github.io/htmlapps-ffmpeg-filter-builder/)

[日本語版 README](README.ja.md)

A browser-based FFmpeg filter graph editor for MP4 video. Build Video / Audio / Text processing as editable nodes, preview the result with embedded FFmpeg WebAssembly, and render the complete video without uploading the selected file to a server.


## 🚀 Live demo

### [Open FFmpeg Filter Builder on GitHub Pages](https://ttomohisa.github.io/htmlapps-ffmpeg-filter-builder/)

GitHub Pages delivers the initial HTML. After the page loads, the selected MP4, Graph, Preview, and Full Render processing stay in the browser. The app does not upload the selected media file.

## Features

- **Start from a recipe or build the Graph yourself** — Ten recipes expand into normal editable nodes and edges instead of hiding the processing behind a preset.
- **Edit common video filters visually** — Trim, Speed, FPS, Scale, Crop, Pad, Rotate, Flip, Aspect Ratio, Color Adjust, Hue, Blur, Sharpen, and Fade.
- **Build branching video graphs** — Split and Overlay support branch / merge layouts such as Picture in Picture and blurred-background video.
- **Process audio in the same Graph** — Audio Trim, Volume, Fade, Speed, High-pass, Low-pass, Normalize, Split, and Mix are available, including synchronized audio for Video Speed.
- **Add Japanese or English text** — Draw Text uses the embedded M PLUS 1p Regular font and supports position, color, background, padding, and display timing.
- **Preview and render with the same Graph** — Preview uses a bounded range; Full Render removes the preview range and processes the complete input.
- **Save and restore Graph projects** — Export/import Graph JSON and optionally restore the last Graph from browser-local autosave. Media files are not stored by autosave.
- **Generate a desktop FFmpeg command** — The current Graph can also be compiled into a copyable desktop command.
- **Single-thread and multi-thread builds** — The standard build supports direct `file://` use. The multi-thread build requires cross-origin isolation over HTTP(S).
- **Fully local runtime processing** — FFmpeg WASM and the standard font are embedded into the generated HTML. Runtime CSP uses `connect-src 'none'`.

## Quick start

### Use the web demo

Open the [GitHub Pages demo](https://ttomohisa.github.io/htmlapps-ffmpeg-filter-builder/), load an MP4, choose a recipe, preview it, and render the output. No account or installation is required.

### Build the standalone HTML on Windows

1. Download or clone this repository.
2. Double-click `build-standalone.bat` or run it from Command Prompt.
3. The first build downloads and verifies the pinned FFmpeg WASM runtime and M PLUS 1p font snapshot.
4. Open `dist/index.html` for the standard single-thread build.
5. Keep that generated HTML as a single-file offline tool if needed.

The normal build uses Windows PowerShell and does not require Node.js for the application build itself.

## Usage

1. Load an MP4 from the Input node.
2. Choose a task from **Recipes** and select **Build graph**, or add filter nodes manually.
3. Select a node to edit its settings. Connect compatible Video and Audio ports to change the processing order.
4. Use **Preview** to check a 3, 5, or 10 second range without rendering the whole file.
5. When the result looks correct, use **Full Render** to apply the same Graph to the complete video.
6. Review the generated H.264 + AAC MP4, edit the output filename if necessary, and save it.

### Recipes

The current recipe set contains:

1. Resize to 720p
2. Square Crop
3. Vertical Video
4. Rotate 90°
5. Video + Audio Fade
6. Watermark
7. Picture in Picture
8. Blur Background Vertical
9. 2x Speed + synchronized Audio
10. Audio Normalize

Recipes that depend on source dimensions or duration should be applied after loading the video.

### Graph tools

The **Graph tools** section contains operations for the Graph itself rather than FFmpeg filters:

- Undo / Redo
- Split + Overlay sample Graph
- Audio Mix sample Graph
- Reset Graph

Video filters, Text, Complex graph, Audio filters, and Graph tools are collapsible so the left palette does not become excessively tall.

### Graph JSON and autosave

**Save Graph JSON** exports the editable Graph project. **Load Graph JSON** restores it later.

Autosave stores only the Graph and output filename in this browser's local storage. It does not store the selected MP4 or rendered output. After restoring a previous Graph, select the media file again.

## Current multi-input boundary

FFmpeg WASM Builder v1.9.8 currently exposes one main media input to this app. Therefore:

- **Watermark** uses Draw Text rather than a separate image file.
- **Picture in Picture** uses a branch of the same input video rather than a second independent video.

Independent image-watermark and second-video input are not supported in v1.0.0.

## Browser support

Chrome and Edge are the primary supported browsers. The standard single-thread build is intended to work as a directly opened `file://` HTML file. The multi-thread build requires a browser and HTTP(S) deployment that support cross-origin isolation and `SharedArrayBuffer`. Firefox and Safari may work for parts of the app, but are not primary release targets for v1.0.0.

## Standard and multi-thread builds

| Build | File | How to run | Notes |
| --- | --- | --- | --- |
| Standard | `dist/index.html` | `file://` or HTTP(S) | Single-thread; portable standalone version |
| Multi-thread | `dist/index.mt.html` | HTTP(S) with COOP / COEP | Uses `SharedArrayBuffer` and requires cross-origin isolation |

For a local multi-thread test on Windows:

```bat
start-local-mt.bat
```

The helper server adds the required cross-origin-isolation headers.

## Publish with GitHub Pages

The repository includes a workflow that builds the standalone app and deploys the generated `dist` directory.

1. Push the repository as `ttomohisa/htmlapps-ffmpeg-filter-builder`.
2. Open **Settings → Pages → Build and deployment → Source** and select **GitHub Actions**.
3. Push to `main`, or manually run **Deploy standalone app to GitHub Pages** from the Actions tab.
4. After deployment, the standard build is available at `https://ttomohisa.github.io/htmlapps-ffmpeg-filter-builder/`.

The Pages workflow rebuilds the embedded runtime from pinned build inputs before publishing.

## Development and build layout

```text
.
├─ src/index.template.html       # Application template
├─ app.config.json               # App metadata and build settings
├─ runtime.lock.json             # Pinned FFmpeg WASM Builder release assets
├─ font.lock.json                # Pinned M PLUS 1p font snapshot
├─ build-standalone.bat          # Windows build entry point
├─ build-standalone.ps1          # ST / MT standalone builder
├─ scripts/                      # Runtime preparation, verification, and repository checks
├─ tests/                        # Graph / Preview / filter / recipe smoke tests
└─ dist/                         # Generated standalone artifacts
```

Normal build:

```bat
build-standalone.bat
```

Force the pinned build inputs to be downloaded again:

```powershell
.\build-standalone.ps1 -ForceDownload
```

For FFmpeg WASM Builder development only:

```bat
build-with-local-ffmpeg.bat C:\path\to\htmlapps-ffmpeg-wasm-builder
```

The build produces both readable and self-extracting ST / MT standalone HTML variants together with runtime and size manifests.

## Privacy and runtime network protection

The selected video, Graph data, Draw Text content, Preview output, and Full Render output are processed locally in the browser.

The generated application includes:

- embedded FFmpeg WebAssembly runtime
- embedded M PLUS 1p Regular font
- `connect-src 'none'` in its runtime Content Security Policy
- no runtime dependency on GitHub, Google Fonts, or a CDN

Network access is required when using the hosted GitHub Pages page itself and when building from source for the first time. For use with the network disconnected, open the generated standard `dist/index.html` locally after building it.

## Limitations

- Input is currently limited to one main MP4 media file.
- Output is H.264 video + AAC audio in MP4.
- Image-watermark input and an independent second video for Picture in Picture are not supported yet.
- Full browser-side transcoding can use substantial CPU time and memory, especially for long or high-resolution videos.
- The multi-thread build cannot run directly from `file://`; it requires HTTP(S) with COOP / COEP and `SharedArrayBuffer` support.
- Browser codec and memory limits can prevent some MP4 files from being processed even when the container format is accepted.

## Embedded build inputs

| Component | Version / snapshot | License | Purpose |
| --- | --- | --- | --- |
| FFmpeg WASM Builder | v1.9.8 / `ffmpeg-filter-builder` profile | See generated runtime manifest and third-party notices | FFmpeg WebAssembly runtime, H.264/AAC processing, filters |
| M PLUS 1p Regular | pinned Google Fonts snapshot | OFL-1.1 | Draw Text font for Japanese / English text |

The source package does not commit the font binary. It is fetched only during the build, verified against `font.lock.json`, and embedded into generated standalone HTML. See [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) for details.

## Contributing

Bug reports and feature proposals are welcome through GitHub Issues. See [CONTRIBUTING.md](CONTRIBUTING.md) for development guidance.

## License

Copyright © 2026 ttomohisa

Licensed under the [MIT License](LICENSE).
