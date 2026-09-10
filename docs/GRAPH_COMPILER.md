# Graph Core / Compiler

## Graph model — schema v3

```text
Graph
├─ schemaVersion = 3
├─ nodes[]
└─ edges[]
   ├─ from / fromPort
   ├─ to / toPort
   └─ type = video | audio
```

## Ports

| Node | Inputs | Outputs | Type |
| --- | --- | --- | --- |
| Input | — | `out`, `audio` | Video + Audio |
| Video filter / Draw Text | `in` | `out` | Video |
| Split | `in` | `a`, `b` | Video |
| Overlay | `main`, `overlay` | `out` | Video |
| Audio filter | `in` | `out` | Audio |
| Audio Split | `in` | `a`, `b` | Audio |
| Audio Mix | `a`, `b` | `out` | Audio |
| Output | `in`, `audio` | — | Video + Audio |

Video and Audio ports cannot be crossed. Each required port accepts exactly one edge.

## Compiler stages

```text
Typed editable DAG
  ↓ validation + topological order
Graph IR schema v3
  ├─ Video compiler → desktop labels + browser videoFilter
  └─ Audio compiler → desktop labels + browser audioFilter
  ↓
Desktop: one filter_complex + explicit maps
Browser: structured runner request + optional runtimeFiles
```

## Draw Text serialization

The same Draw Text node is serialized differently by target:

- Browser: `fontfile=/fonts/MPLUS1p-Regular.ttf:textfile=/text/<node-id>.txt:expansion=none...`
- Desktop: `fontfile=/fonts/MPLUS1p-Regular.ttf:text='escaped text':expansion=none...`

`compileGraph()` adds Browser text payloads to `request.runtimeFiles`. `renderPreview()` mounts the standard font and those text files only when at least one Draw Text node exists.

## Audio example

```text
[0:a]asplit=2[n1a][n2a];
[n1a]volume=-6dB[n3a];
[n2a]highpass=f=120[n4a];
[n3a][n4a]amix=inputs=2:duration=longest:normalize=0[n5a]
```

## Speed synchronization

`Speed.syncAudio` is true by default. The compiler infers the cumulative enabled Video speed at Output and prepends a matching `atempo` chain to Audio. `Audio Speed` can also be placed explicitly.
