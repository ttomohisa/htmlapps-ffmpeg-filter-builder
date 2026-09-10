# Recipes / Full Render — v0.8.0

## Goal

Let users who do not know FFmpeg start from a task, while still exposing the resulting graph rather than hiding the operation behind an opaque preset.

## Recipe behavior

Each recipe returns a normal Graph schemaVersion 3 object. The generated nodes and edges are passed through the same validation, compiler, Preview, and Full Render paths as manually edited graphs.

Recipes:

- Resize to 720p
- Square Crop
- Vertical Video
- Rotate 90°
- Fade In / Out
- Watermark (text in v0.8.0)
- Picture in Picture (same-source branch in v0.8.0)
- Blur Background Vertical
- 2x Speed
- Audio Normalize

Dimension- or duration-sensitive recipes require a loaded video so the generated parameters match the source.

## Current Multiple Input boundary

Builder v1.9.8 still exposes one main media input to the Filter Builder runner. v0.8.0 therefore does not claim independent second media inputs.

- Watermark uses Draw Text.
- Picture in Picture uses Split on the same source.

Image watermark and second-video PiP remain pending a dedicated multi-input runner contract.

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
  "appVersion": "0.8.0",
  "savedAt": "...",
  "graph": { "schemaVersion": 3, "nodes": [], "edges": [] },
  "outputFilename": "...mp4"
}
```

Autosave stores this project envelope in localStorage. It never stores the selected media File or rendered output.

At startup, an existing autosave is presented as a recovery choice. It is not silently restored.

## ST / MT

The feature set is identical in ST and MT.

- ST: standalone `file://` is supported.
- MT: requires `crossOriginIsolated` + SharedArrayBuffer.

If MT is not available, Full Render is disabled and the existing runtime warning directs the user to the standard build.
