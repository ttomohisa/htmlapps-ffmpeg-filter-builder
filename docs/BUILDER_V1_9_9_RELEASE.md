# FFmpeg WASM Builder v1.9.9 release handoff

Historical release record. Do not run the one-way v1.9.9 promotion script for the current v1.10.2 runtime; it would overwrite the current lock. See BUILDER_V1_10_2_RELEASE.md for the active pin.

FFmpeg Filter Builder v1.2 beta requires the published Builder v1.9.9 release before the normal standalone build can stop depending on a local Builder checkout.

## 1. Final Builder verification

From the patched `htmlapps-ffmpeg-wasm-builder` checkout:

```powershell
.\build-ffmpeg-filter-builder.bat
.\scripts\check-repository.ps1
```

The FFmpeg Filter Builder profile must pass both single-thread and multi-thread browser smoke tests. The manifest must advertise `multipleInputs: true` and `complexGraph: true`.

## 2. Commit and tag

Commit the v1.9.9 Builder changes, push `main`, then create and push the release tag:

```powershell
git add -A
git commit -m "feat: add multi-input complex graph runtime"
git push origin main
git tag -a v1.9.9 -m "FFmpeg WASM Builder v1.9.9"
git push origin v1.9.9
```

The repository's `.github/workflows/release.yml` is triggered by `v*.*.*` tags. It builds/smoke-tests all release profiles and publishes the ST/MT Filter Builder ZIP assets plus BUILDINFO and SHA256SUMS.

## 3. Promote FFmpeg Filter Builder to the GitHub Release

After the GitHub Release is visible, run:

```powershell
.\scripts\promote-builder-v1.9.9.ps1
```

The script downloads the two published Filter Builder runtime ZIPs, computes their SHA-256 values locally, and rewrites `runtime.lock.json` plus the default-build checks from v1.9.8 to v1.9.9. Runtime files are still embedded at build time; the finished Browser Kitty HTML does not fetch FFmpeg from GitHub at runtime.

Then run the normal build without any local Builder path:

```powershell
.\build-standalone.bat
```

This is the release-path verification that confirms the app is using the pinned GitHub Release rather than a local Builder checkout.
