# Graph Core / Compiler

## Graph model — schema v4

```text
Graph
├─ schemaVersion = 4
├─ mainInputId
├─ nodes[]
└─ edges[]
   ├─ from / fromPort
   ├─ to / toPort
   └─ type = video | audio
```

Input nodes may also contain serializable `source` metadata (`kind`, filename, size, last-modified time, MIME type, duration, width, height). Local paths and media bytes are never part of the Graph. Browser `File` objects live in the runtime-only `inputBindings` map. `source.kind` controls the Input node's available ports and participates in the Graph semantic hash; filename, size, timestamps, and other source details do not.

`schemaVersion 3` Graph JSON from v1.0 / v1.1 is migrated to v4 on import. The first legacy Input becomes `mainInputId`.

## Input resolution — alpha.4

`resolveInputs()` gives every Input node a deterministic FFmpeg index in **Graph node order**. Changing `mainInputId` does not renumber these indexes.

Example:

```text
Input main.mp4  → index 0 → 0:v / 0:a
Input logo.png  → index 1 → 1:v
Input voice.mp3 → index 2 → 2:a
```

Runtime virtual paths are stable within one compile:

```text
/workerfs/input-0.mp4
/workerfs/input-1.png
/workerfs/input-2.mp3
```

Image Inputs carry `-loop 1` in their compiler input options so still images can feed video filter graphs such as Overlay.

## Ports

| Node | Inputs | Outputs | Type |
| --- | --- | --- | --- |
| Video Input | — | `out`, `audio` | Video + Audio |
| Audio Input | — | `audio` | Audio |
| Image Input | — | `out` | Video |
| Video filter / Draw Text | `in` | `out` | Video |
| Split | `in` | `a`, `b` | Video |
| Overlay | `main`, `overlay` | `out` | Video |
| Audio filter | `in` | `out` | Audio |
| Audio Split | `in` | `a`, `b` | Audio |
| Audio Mix | `a`, `b` | `out` | Audio |
| Output | `in`, `audio` | — | Video + Audio |

Video and Audio ports cannot be crossed. Each required port accepts exactly one edge.

## Validation

A valid multi-input Graph may have several source Inputs but still has exactly one Output. Every node must be reachable from at least one Input and must also reach the Output. Unused Input nodes and disconnected branches remain invalid.

## Compiler stages

```text
Typed editable DAG
  ↓ validation + topological order
resolveInputs()
  ↓
Graph IR schema v4
  ├─ inputs[] with stable FFmpeg indexes
  ├─ Video compiler
  └─ Audio compiler
  ↓
Desktop command
  ├─ multiple -i arguments
  ├─ one filter_complex
  └─ explicit video/audio -map

Browser request
  ├─ single-input: legacy videoFilter / audioFilter path
  └─ multi-input: inputs[] + filterComplex + videoMap + audioMap
```

The single-input Browser request remains compatible with FFmpeg WASM Builder v1.9.8 and continues to use `BrowserFFmpeg.ffmpegFilterBuilderArgs()`.

For multi-input Graphs, alpha.4 compiles the full Browser request contract but **does not execute it yet**. Preview / Full Render remain disabled until alpha.5 mounts all bound Files and builds the multi-input FFmpeg argv from this contract.

## Multi-input examples

Video + image Overlay:

```text
[0:v][1:v]overlay=x=main_w-overlay_w-20:y=main_h-overlay_h-20:shortest=1[n1v]
```

Two external Audio Inputs mixed while the main Video passes through:

```text
[1:a]aresample=48000,asetpts=PTS-STARTPTS[n1a];
[2:a]aresample=48000,asetpts=PTS-STARTPTS[n2a];
[n2a]volume=-3dB[n3a];
[n1a][n3a]amix=inputs=2:duration=longest:normalize=1[n4a]
```

## Draw Text serialization

The same Draw Text node is serialized differently by target:

- Browser single-input path: `fontfile=/fonts/MPLUS1p-Regular.ttf:textfile=/text/<node-id>.txt:expansion=none...`
- Desktop: `fontfile=/fonts/MPLUS1p-Regular.ttf:text='escaped text':expansion=none...`

`compileGraph()` adds Browser text payloads to `request.runtimeFiles`.

## Speed synchronization

`Speed.syncAudio` is true by default. The compiler infers the cumulative enabled Video speed from the Main Input path and prepends a matching `atempo` chain to that Main Input's Audio stream. Additional independent Audio Inputs are not implicitly retimed.


## v1.2.0-alpha.5 runtime integration

Multiple Input Preview / Full Render uses the same compiled `filterComplex` contract as desktop command generation. Each Input binding is mounted into WORKERFS at its stable virtual path. Execution is enabled only when the embedded runtime manifest advertises both `multipleInputs: true` and `complexGraph: true`; the v1.9.8 single-input runtime remains valid for one-input graphs.

## v1.2.0-beta.3 external Audio / BGM semantics

Every Audio Mix input is normalized independently before mixing:

```text
aresample=48000,asetpts=PTS-STARTPTS
```

Per-input volume is applied after that normalization. `Audio Mix.durationMode` compiles to `amix duration=first|shortest|longest`. The Add BGM Recipe uses `longest`, then caps the mixed soundtrack to Main Video duration with Audio Trim. If Main Video has no audio track, the recipe omits the Main audio branch entirely. Replace Audio never references Main audio.

## v1.2.0-beta.2 Image Input overlay semantics

Image Input compiles as a Video-type stream. The Logo Overlay recipe scales `[N:v]` from a PNG/JPEG Input and uses Overlay with `shortest=0:eof_action=repeat:repeatlast=1`. This is intentionally different from two-video PiP, which uses `eof_action=pass:repeatlast=0` when the Main Input must continue after the foreground video ends.
