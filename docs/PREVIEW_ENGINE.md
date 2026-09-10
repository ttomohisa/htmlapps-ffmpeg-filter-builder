# Preview Engine — v0.7.0

The Preview Engine keeps the cache / stale / cancel model and now treats Draw Text as a timeline-sensitive Video filter.

## Range

Builder v1.9.8 receives `startTimeSeconds` and `durationSeconds`.

Graphs without timeline-sensitive filters use direct-range execution. Graphs containing Video Trim / Speed / Fade / Draw Text or Audio Trim / Speed / Fade use timeline-safe execution from source time 0 through the minimum source horizon required for the requested output window.

This is required for Draw Text because `enable=between(t, start, end)` uses source timeline time. Starting the runtime directly at a non-zero Preview offset would otherwise shift the meaning of the text visibility window.

`previewSourceHorizon()` walks the full typed DAG backwards. Audio and Video demands meet at Input and the larger source horizon is used, preventing either stream from being truncated.

## Text runtime files

When the graph contains Draw Text, Preview adds only the needed local virtual files to the WASM worker:

- `/fonts/MPLUS1p-Regular.ttf`
- one `/text/<node-id>.txt` file for each Draw Text node

Both are already in local application memory; no runtime network request is made.

## Cache

The cache key contains Input session, runtime variant, full Graph JSON including Draw Text parameters, Preview start, and duration. Up to two outputs and 128 MB are retained in memory.

## Cancel / errors

Cancel terminates only the active worker and preserves Input, Graph, previous Preview, and cache. Raw FFmpeg logs remain available after friendly error mapping.
