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
- Audio Mix → `amix=inputs=2` with independent A/B volume and selectable duration basis

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


## v1.2.0-beta.3 update — external Audio Input / BGM

Multiple-source Audio is now implemented with Builder v1.9.9. Before `amix`, each branch is normalized with `aresample=48000,asetpts=PTS-STARTPTS`; per-input volume is then applied. Audio Mix can follow input A, the shorter input, or the longer input.

The **Add BGM** Recipe uses Main audio as A and external Audio Input as B at -12 dB by default, mixes to the longer audio branch, then trims the result to Main Video duration. A silent Main Video skips the missing Main-audio branch. **Replace Audio with BGM** ignores Main audio and uses the external input as the soundtrack. Short external audio is not implicitly looped. Audio Input selection is limited to MP3, WAV, M4A, FLAC, OGG, and Opus; raw AAC is excluded because the pinned runtime does not provide its demuxer.
