# Builder v1.10.2 runtime pin for app v1.2.1

The normal build consumes the published [Builder v1.10.2 release](https://github.com/ttomohisa/htmlapps-ffmpeg-wasm-builder/releases/tag/v1.10.2). Its annotated tag `149f12175dfa141d43e2940444cc27b2191626d2` resolves to reviewed commit `82b078110bc74e746e12f5420dc1b4bcc498dab0`.

## Exact archives

- Single-thread: `ffmpeg-wasm-ffmpeg-filter-builder-single-thread-v1.10.2.zip`, 4,882,505 bytes; SHA-256 `32ae9873bd198a94ac7d4b762d49fae8b971a7eda1e01c0f3b1b6abd3a13bf15`.
- Multi-thread: `ffmpeg-wasm-ffmpeg-filter-builder-multi-thread-v1.10.2.zip`, 4,930,815 bytes; SHA-256 `8183cd0e5e07fa5fcaeb93bb3eb3dac758d7a040710b243d97c27c10fd004f81`.

Complete immutable URLs and archive hashes are in `runtime.lock.json`. The builder checks archive integrity and the embedded raw JS/WASM manifest hashes before generating either standalone. Local-cache reuse follows the same verification path. Do not run the historical `promote-builder-v1.9.9.ps1` script: it writes the old lock.

## Repair and compatibility

The old Filter Builder runtime could write a zero-duration final video sample and misalign bounded Preview output. Version 1.10.1 did not repair this profile. Version 1.10.2 carries the upstream Filter Builder timing repair for single/multiple inputs and both threading variants. No output-container patching or relaxed timing oracle is used by this app.

Manifest schema 8, runner API 1, profile, filter/codec/container catalogs, WORKERFS, graph compiler requests, and capability flags are unchanged. ST remains usable as a standalone file; MT still requires cross-origin isolation and SharedArrayBuffer with its existing thread budget. Legacy local 1.9.8/1.9.9 development inputs remain explicitly allowed, but do not provide this repair. Version 1.10.1 is not newly admitted.

The runtime binary remains GPL-2.0-or-later, while this application's source remains MIT. The release includes its corresponding-source recipe and third-party notices. Font/OFL and COI-worker pins are unchanged; LAME metadata does not add an MP3 encoder to this profile.

## Verification gates

- New release-pin/loader tests check exact archives, accepted ST/MT 1.10.2 metadata, and rejection of unreviewed versions or missing existing capabilities.
- Keep PowerShell syntax checks, repository guards, all graph/runtime regression tests, ST/MT catalog parity, raw payload hashes, standalone/self-extract checks, and Pages layout validation.
- Inspect rebuilt embedded assets, not only the source lock. Both tracked root HTML aliases must equal the respective generated readable files.
- The upstream released-runtime evidence includes 40 timing/compatibility checks per browser threading variant and 40 checks on downloaded ST bytes. Those checks supplement, rather than replace, consuming-app UI and native-output verification.
- Consuming-app Full/Preview downloads must keep positive terminal sample duration, exact frame coverage, correct nonzero-start alignment, and expected audio. Preserve CFR, VFR, single-frame, speed/FPS, multi-input, cancel/retry and media-replacement behavior.
