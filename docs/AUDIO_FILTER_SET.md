# Audio Filter Set — v0.6.0

FFmpeg Filter Builder v0.6.0 adds typed Audio ports and compiles the Audio lane independently from the Video lane while keeping both in one graph.

## Nodes

- Audio Trim → `atrim` + `asetpts`
- Volume → `volume` (-30 dB to +12 dB)
- Audio Fade → `afade`
- Audio Speed → `atempo` (0.25x–4x, chained when required)
- High-pass → `highpass`
- Low-pass → `lowpass`
- Normalize → `loudnorm`
- Audio Split → `asplit=2`
- Audio Mix → `amix=inputs=2` with independent A/B volume

## Typed ports

Video ports are circular. Audio ports are diamond-shaped and Audio edges use a dashed line. This is not color-only differentiation. Video and Audio ports cannot be connected to each other.

## Video Speed audio sync

The existing Video Speed node has `Sync audio` enabled by default. If the resulting Video graph has an unambiguous speed factor, the compiler prepends a matching `atempo` chain to the Audio graph. Disable it when Audio Speed should be controlled independently.

## Browser runtime

Builder v1.9.7 already contains `atrim`, `asetpts`, `volume`, `afade`, `atempo`, `highpass`, `lowpass`, `loudnorm`, `amix`, `asplit`, and `aresample`; no runtime upgrade is required for v0.6.0.

The browser request uses `videoFilter` and `audioFilter` separately. The runner still owns one decoded Video stream and one decoded Audio stream from the same input file.

## Current limits

- Multiple source files / independent external Audio inputs are not implemented yet.
- Normalize uses a practical one-pass `loudnorm` preview; two-pass measured normalization is future work.
- Audio Mix branches currently originate from the same input Audio stream through Audio Split.
