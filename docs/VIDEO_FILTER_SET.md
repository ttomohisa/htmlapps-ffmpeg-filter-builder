# Video Filter Set v0.4.0

> v0.8.0 note: these filter nodes are unchanged, but the current Graph Core supports typed Video / Audio branches plus Split / Overlay DAGs. “Linear” below describes the v0.4.0 milestone, not the current graph limitation. See `COMPLEX_FILTERGRAPH.md`.

FFmpeg Filter Builder v0.4.0 expands the linear Video graph with common FFmpeg filters while preserving the same Graph IR → Desktop command → Browser `videoFilter` compiler path.

## Standard nodes

| Node | FFmpeg filter | Browser Preview with Builder v1.9.8 |
| --- | --- | --- |
| Speed | `setpts` | Yes |
| FPS | `fps` | Yes |
| Scale | `scale` | Yes |
| Crop | `crop` | Yes |
| Pad | `pad` | Yes |
| Rotate | `transpose` / `hflip,vflip` | Yes |
| Flip | `hflip` / `vflip` | Yes |
| Aspect Ratio | `setdar` | Yes |
| Color Adjust | `eq` | Yes |
| Hue | `hue` | Yes |
| Blur | `gblur` | Yes |
| Sharpen | `unsharp` | Yes |
| Fade | `fade` | Yes |
| Trim | `trim,setpts` | Yes |

Builder v1.9.5 added video `trim`; v1.9.6 fixed bounded-range completion and filter output sizing, and the pinned v1.9.8 runtime retains the v1.9.7 fine-grained timestamp fix for Speed graphs. The same compiler is used by desktop command generation and Browser Preview. Runtime capability checks still require both `trim` and `setpts`.

## Validation ranges

- Speed: 0.25×–4×
- FPS: 1–120
- Scale width: even, 160–3840 px
- Crop width/height: even and at least 2 px; X/Y non-negative
- Pad width/height: even; X/Y non-negative; RGB hex background
- Aspect ratio: numerator / denominator 1–100
- Brightness: -1–1
- Contrast: 0–2
- Saturation: 0–3
- Gamma: 0.1–10
- Hue: -180°–180°
- Blur sigma: 0.1–50
- Sharpen amount: -2–5
- Fade: start >= 0, duration > 0

## Connector geometry

Edges are rendered in the SVG layer using `getBoundingClientRect()` for the actual transformed port button. This matters because `.node-port` is vertically centered with `transform: translateY(-50%)`; `offsetTop` reports the pre-transform layout position and caused the v0.3.0 line to render below the visible port center.
