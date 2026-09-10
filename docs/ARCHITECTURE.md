# Architecture

## v0.8.0 additions

v0.8.0 keeps one typed Graph as the source of truth and adds a task-oriented layer around it. Recipes are **graph factories**, not separate execution paths: applying a Recipe creates normal schemaVersion 3 nodes and edges, which then pass through the same validation and compiler used for manually edited graphs.

Preview and Full Render share the same compiled Browser runner request. Preview adds bounded `startTimeSeconds` / `durationSeconds`; Full Render deliberately omits those range arguments and therefore applies the same `videoFilter` / `audioFilter` to the complete input. Rendered MP4 bytes stay in the browser until the user explicitly saves them.

Graph project persistence uses localStorage only for the graph envelope and output filename. It never stores the selected media File, embedded media bytes, or rendered output. An existing autosave is offered as an explicit recovery choice at startup rather than being silently restored.

ST and MT expose the same feature set. ST remains the direct `file://` standalone path; MT requires cross-origin isolation. Builder v1.9.8 still exposes one main media input, so Watermark is a Draw Text recipe and Picture in Picture uses a Split branch from that same input. Independent image/second-video inputs remain a future runtime-contract milestone.

## v0.7.0 goal

The editable DAG carries Video and Audio streams and can now place text rendering in the Video lane.

```text
Local MP4
  ├─ Video → Video filters / Split / Overlay / Draw Text ─┐
  └─ Audio → Audio filters / Split / Mix ─────────────────┤
                                                          ↓
                                               Graph IR schema v3
                                                 ├─ Desktop FFmpeg
                                                 └─ Browser runner
                                                    videoFilter
                                                    audioFilter
                                                          ↓
                                FFmpeg WASM Builder v1.9.8 + embedded font
                                                          ↓
                                                   H.264 + AAC MP4
```

## Typed ports

Every edge stores `type`, `fromPort`, and `toPort`. Video and Audio port types must match. Draw Text is a normal one-input / one-output Video node and does not introduce a third stream type.

Input exposes `out` (Video) and `audio`. Output consumes `in` (Video) and `audio`. Graph schema remains version 3.

## Compiler

Video and Audio subgraphs are compiled independently from the same DAG. Desktop output combines both segment lists into one `filter_complex`. Browser output sends `videoFilter` and `audioFilter` separately because the Builder runner owns one Video and one Audio buffer source / sink.

Draw Text has two serialization modes:

- Desktop: escaped inline `text=` for a self-contained command.
- Browser: `textfile=` pointing to an in-memory virtual file so arbitrary user text does not need to be embedded in the Browser filter grammar.

## Embedded dependencies

The generated standalone HTML has two embedded dependency groups:

1. `ffmpeg-filter-builder-runtime` — pinned Builder v1.9.8 ST or MT runtime.
2. `text-font` — pinned M PLUS 1p Regular bytes.

The source package contains `font.lock.json` and the OFL license text, but not the font binary. The build fetches and verifies the exact font snapshot before embedding it.

## Video Speed synchronization

For Speed nodes whose `syncAudio` setting is enabled, the compiler infers the cumulative Video speed if it is unambiguous at Output. A matching `atempo` chain is prepended to the Audio graph. If branched Video timelines have incompatible speed factors, implicit synchronization is not invented.

## Runtime source of truth

`runtime.lock.json` pins Builder v1.9.8 ST and MT assets. Build-time checks require prior Video / Audio filters plus `drawtext`, and require the runtime capability `drawText: true`.

## Boundary

The runner still has one main media input context. Independent additional Video / Audio files need a future multi-input runtime API. v0.7.0 Draw Text uses the standard embedded font only; user-supplied font files are deferred.
