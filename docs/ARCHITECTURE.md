# Architecture

## Current runtime contract (app v1.2.1)

The default ST/MT build uses the reviewed Builder v1.10.2 release. Runtime schema 8, runner API 1, catalogs/capabilities, WORKERFS and threading requirements are unchanged. It repairs final video-frame duration and bounded preview timing; graph/compiler semantics and media privacy remain unchanged. Earlier milestone sections below are historical.

## v1.2.0-alpha.5 Multiple Input compiler foundation

Graph schema v4 separates serializable project structure from browser runtime file bindings. A Graph may contain several typed Input nodes, an explicit `mainInputId`, and safe source metadata while browser `File` objects remain in the runtime-only `inputBindings` map. Local paths and media bytes are never serialized.

alpha.4 adds a deterministic compiler boundary on top of that model. `resolveInputs()` assigns FFmpeg indexes in Graph node order, independent of `mainInputId`, and derives stable `/workerfs/input-N.ext` paths plus input options. Image Inputs carry still-image loop options. The compiler can now resolve cross-source stream references such as `[0:v]`, `[1:v]`, `[1:a]`, and `[2:a]`.

```text
Graph schema v4
  ├─ mainInputId
  ├─ typed Input nodes + source metadata
  ├─ runtime-only inputBindings
  └─ typed filter graph
          ↓
     validateGraph()
          ↓
      resolveInputs()
          ↓
       compileGraph()
          ├─ Desktop: N x -i + filter_complex + explicit maps
          ├─ Browser single-input: videoFilter / audioFilter
          └─ Browser multi-input: inputs[] + filterComplex + maps
```

Graph validation now accepts multiple Inputs if every node lies on a path from any Input to the single Output. Unused Inputs and disconnected branches are still invalid.

The runtime boundary is intentionally one step behind the compiler in alpha.4. Single-input Preview / Full Render continue to use Builder v1.9.8 through `ffmpegFilterBuilderArgs()`. Multi-input Graphs compile correctly but remain blocked from Browser execution until alpha.5 mounts all bound files and executes the new request contract.


## v0.8.0 additions

v0.8.0 keeps one typed Graph as the source of truth and adds a task-oriented layer around it. Recipes are **graph factories**, not separate execution paths: applying a Recipe creates normal schemaVersion 3 nodes and edges, which then pass through the same validation and compiler used for manually edited graphs.

Preview and Full Render share the same compiled Browser runner request. Preview adds bounded `startTimeSeconds` / `durationSeconds`; Full Render deliberately omits those range arguments and therefore applies the same `videoFilter` / `audioFilter` to the complete input. Rendered MP4 bytes stay in the browser until the user explicitly saves them.

Graph project persistence uses localStorage only for the graph envelope and output filename. It never stores the selected media File, embedded media bytes, or rendered output. An existing autosave is offered as an explicit recovery choice at startup rather than being silently restored.

ST and MT expose the same feature set. ST remains the direct `file://` standalone path; MT requires cross-origin isolation. Builder v1.9.9 exposes the reviewed Multiple Input / complexGraph runtime used by two-video PiP and PNG/JPEG Image Input logo overlays.

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

`runtime.lock.json` pins Builder v1.10.2 ST and MT assets. Build-time checks require the Video / Audio filter catalog used by the app, including `drawtext`, `amix`, `aresample`, and `asetpts`, and require the advertised runtime capabilities used by Preview / Full Render.

## Boundary

Builder v1.9.9 supports the app's multiple Video / Audio / Image Input execution path. Browser `File` objects are staged into WORKERFS only for the current run and are not serialized into Graph JSON or autosave. v0.7.0 Draw Text still uses the standard embedded font only; user-supplied font files are deferred.


## v1.2.0-alpha.5 runtime integration

Multiple Input Preview / Full Render uses the same compiled `filterComplex` contract as desktop command generation. Each Input binding is mounted into WORKERFS at its stable virtual path. Execution is enabled only when the embedded runtime manifest advertises both `multipleInputs: true` and `complexGraph: true`; the v1.9.8 single-input runtime remains valid for one-input graphs.

## v1.2.0-beta.2 current runtime boundary

The checked-in runtime lock now pins FFmpeg WASM Builder v1.9.9 from GitHub Release for both ST and MT. Multiple Input Preview / Full Render is part of the normal build. PNG/JPEG Image Inputs use the existing image2 + PNG/MJPEG decoder set; still-image persistence is expressed at the Overlay framesync boundary with `eof_action=repeat:repeatlast=1`, so no runtime network or new browser-side decoder dependency is introduced.


## v1.2.0-beta.3 Audio Input boundary

External Audio Inputs use the same v1.9.9 multi-input public-libav runner as Video / Image sources. Audio Mix normalizes each branch to 48 kHz and resets its timestamps before `amix`; the recipe layer trims final BGM audio to the Main Video duration. No new CDN, browser decoder, server upload, or runtime network dependency is introduced.
