# Text / Draw Text — v0.7.0

v0.7.0 adds one Video filter node, **Draw Text**, backed by FFmpeg `drawtext` from FFmpeg WASM Builder v1.9.8.

## Node settings

| Setting | Range / values |
| --- | --- |
| Text | 1–160 characters, single line |
| Font size | 8–256 px |
| Text color | `#RRGGBB` |
| Position | top-left / top-center / top-right / center / bottom-left / bottom-center / bottom-right / custom |
| Custom X / Y | 0–16384 px |
| Background | on / off |
| Background color | `#RRGGBB` |
| Background opacity | 0–1 |
| Background padding | 0–100 px |
| Start / end | `0 <= start < end <= 86400` seconds |

Control characters and line breaks are rejected in v0.7.0. Multi-line text is intentionally deferred.

## Browser Preview compiler

Browser Preview does not interpolate arbitrary user text into the filter expression. Each Draw Text node gets a virtual text file:

```text
/text/<node-id>.txt
```

The standard embedded font is mounted at:

```text
/fonts/MPLUS1p-Regular.ttf
```

A typical Browser filter is:

```text
drawtext=fontfile=/fonts/MPLUS1p-Regular.ttf:
textfile=/text/drawText-3.txt:
expansion=none:
fontsize=48:
fontcolor=0xFFFFFF:
x=(w-text_w)/2:
y=h-text_h-20:
box=1:
boxcolor=0x000000@0.55:
boxborderw=12:
enable=between(t\,0\,5)
```

The line breaks above are documentation-only; the generated filter is one expression.

## Desktop command compiler

Desktop commands cannot depend on Browser virtual files, so they use an escaped `text='…'` form while keeping the same font path contract and `expansion=none` behavior. The generated command remains a single copyable FFmpeg command.

## Timeline behavior

`drawtext enable=between(t,...)` depends on source timeline time. Draw Text is therefore included in `TIMELINE_SENSITIVE_NODE_TYPES`. Preview starts from source time 0 and processes only the source horizon needed for the requested playback window, preserving start/end visibility semantics.

## Standard font

The build uses M PLUS 1p Regular pinned by `font.lock.json`:

- Google Fonts commit `a24c920263576ec723d64c1b26f8afabb841601d`
- Git blob SHA-1 `e16cd93613c26bb9d66d2060d6fd491c7222689f`
- exact size `1758688` bytes
- license `OFL-1.1`

The source repository contains the lock and license text, not the font binary. `scripts/prepare-text-font.ps1` downloads and verifies the exact font during build, then `scripts/build-variant.ps1` embeds it in the standalone asset bundle. Runtime network access remains disabled.


## License embedding

The source package keeps `licenses/MPLUS1p-OFL.txt`. The standalone build embeds that OFL-1.1 text alongside the verified font and exposes it under Third-party licenses.


Desktop `text=` generation applies both drawtext option-value escaping and filtergraph escaping for apostrophes, colons, backslashes, commas, brackets, and semicolons.
