# Third-Party Notices

FFmpeg Filter Builder itself is licensed under the MIT License.

## FFmpeg WebAssembly runtime

The generated standalone HTML embeds a purpose-built FFmpeg WebAssembly runtime obtained from **ttomohisa/htmlapps-ffmpeg-wasm-builder v1.9.8**, profile `ffmpeg-filter-builder`.

The runtime contains or links components including FFmpeg, x264, zlib, FreeType, HarfBuzz, and Emscripten runtime support. The exact runtime manifest and `BUILDINFO.txt` produced by FFmpeg WASM Builder are the authoritative records for the embedded runtime and its licenses.

The Filter Builder profile includes libx264 and is therefore built under the binary license terms reported by the runtime manifest. Follow the license, corresponding-source, and relinking information supplied by the FFmpeg WASM Builder v1.9.8 release.

## M PLUS 1p Regular

Draw Text uses **M PLUS 1p Regular**, copyright 2016 The M+ Project Authors, licensed under the **SIL Open Font License 1.1**.

The source package contains the license at `licenses/MPLUS1p-OFL.txt` and a pinned build lock at `font.lock.json`. The font binary is fetched only during the application build, verified against the reviewed Google Fonts snapshot, and embedded into the generated standalone HTML. The OFL-1.1 text is embedded into the same HTML and shown in the in-app Third-party licenses section.

## coi-serviceworker

The GitHub Pages `/mt/` deployment includes **coi-serviceworker 0.1.7** by Guido Zuidhof and contributors, licensed under the **MIT License**. It is used only as a same-origin cross-origin-isolation fallback on hosts that cannot provide COOP / COEP response headers.

The repository pins the reviewed source at commit `7b1d2a092d0d2dd2b7270b6f12f13605de26f214` in `coi-serviceworker.lock.json`. The source is vendored at `vendor/coi-serviceworker/coi-serviceworker.js`, and the license text is stored at `licenses/coi-serviceworker-MIT.txt`.

The standalone `dist/index.html` and `dist/index.mt.html` artifacts do not embed or depend on this worker.

## Network behavior

Build dependencies are downloaded and verified at build time. The finished application does not fetch the FFmpeg runtime or font from GitHub, Google Fonts, a CDN, or any other external service while running.
