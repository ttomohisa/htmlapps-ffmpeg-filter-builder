# Complex Filtergraph — v0.5.0

## Scope

v0.5.0 adds the first branch / merge workflow to FFmpeg Filter Builder while keeping execution on the existing FFmpeg WASM Builder v1.9.7 runtime.

Implemented:

- Split with two named outputs (`A`, `B`)
- Overlay with two named inputs (`MAIN`, `OVER`)
- port-aware edges
- branch label compiler
- complex Desktop `filter_complex`
- complex Browser `videoFilter`
- connection validation for branch and merge ports
- PiP-style composition by scaling one branch before Overlay
- Overlay X/Y settings and quick position presets
- DAG-aware Preview horizon propagation
- ST/MT shared graph/compiler behavior

Not claimed complete in v0.5.0:

- multiple independent video files
- image-file input
- watermark-file input

Those require a Builder runner contract for more than one mounted input context.

## Regression graph

```text
Input
  ↓
 Split
 ├─ A → Blur ──────┐
 └─ B → Scale ─────┤
                   ↓
                Overlay → Output
```

The `Split + Overlay` sample button creates this graph.

## Browser runner compatibility

Builder v1.9.7 already includes `split` and `overlay`. Its Filter Builder runner places the caller filter string between one external buffer source and one external sink. A valid Browser filter therefore keeps only internal labels:

```text
split=2[a][b];[a]gblur=sigma=5[c];[b]scale=320:-2[d];[c][d]overlay=x=20:y=20:shortest=1
```

Do not wrap the expression with `[in]` / `[out]` unless the runtime API changes, because the runner itself owns those external endpoints.

## Connection interaction

1. Tap/click an output port.
2. Tap/click the target input port.
3. The new connection replaces any existing connection on that exact source-output or target-input port.
4. Connections that would create a cycle are rejected.

Split requires both A/B outputs. Overlay requires both MAIN/OVER inputs. An incomplete complex node remains visible but the Graph is invalid and Preview is disabled until wiring is complete.

## Runtime gate

The v0.5.0 release gate is:

- build with pinned Builder v1.9.7;
- create the sample Split + Overlay graph;
- confirm Desktop and Browser compiler outputs contain branch labels;
- preview the graph in ST;
- preview the same graph in MT under cross-origin isolation;
- confirm no runtime network request occurs.
