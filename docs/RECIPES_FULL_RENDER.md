# Recipes / Full Render — v0.8.0

## Goal

Let users who do not know FFmpeg start from a task, while still exposing the resulting graph rather than hiding the operation behind an opaque preset.

## Recipe behavior

Each recipe returns a normal Graph schemaVersion 4 object with an explicit `mainInputId`. The generated nodes and edges are passed through the same validation, compiler, Preview, and Full Render paths as manually edited graphs.

Recipes are grouped in the UI and currently total 24:

- **Size & orientation:** Resize to 720p, Resize to 1080p, Square Crop, Vertical Video, Blur Background Vertical, 16:9 Landscape, Blur Background Square, Rotate 90°, Mirror Horizontally, Convert to 30 fps
- **Composite & look:** Fade In / Out, Watermark, Logo Overlay, Picture in Picture, Centered Title, Grayscale, Light Sharpen
- **Time & audio:** Keep First 10 Seconds, 0.5x Speed, 1.5x Speed, 2x Speed, Audio Normalize, Add BGM, Replace Audio with BGM

Dimension- or duration-sensitive recipes no longer block when no video has been loaded. Their primary action changes to **Choose video & build graph**; after the user selects an MP4, metadata is read locally and the source-aware graph is generated immediately. Cancelling the picker leaves the current graph untouched.

## Current Multiple Input boundary

Builder v1.9.9 is active for multi-input Preview / Full Render. Multiple Video / Audio / Image Inputs compile into deterministic input indexes, one `filter_complex`, and explicit output maps.

- Picture in Picture uses a true second Video Input.
- Logo Overlay uses Main Video + PNG/JPEG Image Input.
- Add BGM uses Main Video + Audio Input and mixes Main audio when present. Replace Audio uses the external Audio Input without Main audio.
- If the secondary media is not selected yet, the recipe creates an explicit Missing Input that can be filled later.
- Main Video audio is only wired when the MP4 actually contains an audio track; silent screen recordings therefore remain valid.

## Full Render

Preview requests include bounded `startTimeSeconds` / `durationSeconds`.

Full Render deliberately starts from the same compiled Browser request **without** those range arguments. The runner therefore processes the complete input with the same `videoFilter` / `audioFilter` graph.

The output is returned as H.264 + AAC MP4. The app holds the result as a Blob, shows its byte size, previews it locally, and saves it only after an explicit user action.

## Graph persistence

Graph project JSON format:

```json
{
  "format": "ffmpeg-filter-builder-graph",
  "formatVersion": 1,
  "appVersion": "1.2.0-beta.3",
  "savedAt": "...",
  "graph": { "schemaVersion": 4, "mainInputId": "input-1", "nodes": [], "edges": [] },
  "outputFilename": "...mp4"
}
```

Autosave stores this project envelope in localStorage. Input nodes may keep source metadata, but it never stores the selected media File, local path, media bytes, or rendered output.

At startup, an existing autosave is presented as a recovery choice. It is not silently restored.

## ST / MT

The feature set is identical in ST and MT.

- ST: standalone `file://` is supported.
- MT: requires `crossOriginIsolated` + SharedArrayBuffer.

If MT is not available, Full Render is disabled and the existing runtime warning directs the user to the standard build.

## v1.2.0-beta.3 BGM / Replace Audio

`Add BGM` creates a second Audio Input. When Main Video has audio, Audio Mix receives Main as input A and BGM as input B. BGM defaults to -12 dB, both inputs are normalized through `aresample=48000,asetpts=PTS-STARTPTS`, and `amix` uses `duration=longest` so either audio branch can continue. An Audio Trim node then caps the soundtrack to Main Video duration.

For a silent Main Video, the recipe skips Audio Mix and never references `[0:a]`; the external Audio Input is routed through Volume + Audio Trim instead. `Replace Audio with BGM` always follows this external-audio-only route and ignores Main audio. A secondary Audio file can be assigned after recipe expansion through the explicit Missing Audio Input.

## v1.2.0-beta.2 Logo Overlay

`Logo Overlay` is a true multi-input recipe: Main Video feeds Overlay MAIN and output audio, while a PNG/JPEG Image Input feeds Scale and Overlay OVER. The Overlay node enables `keepVisible`, compiling to `eof_action=repeat:repeatlast=1`, so a single still-image frame remains visible until the Main Input ends. Two-video PiP keeps `keepVisible` off and therefore retains beta.1's disappear-on-foreground-EOF behavior.
