# Changelog

All notable changes to FFmpeg Filter Builder are documented here.

## 1.1.0 - 2026-09-13

### Graph Workspace Redesign

- Promoted the redesigned Graph Workspace to the stable v1.1.0 release without changing Graph schemaVersion 3 or the FFmpeg WASM Builder v1.9.8 runtime contract.
- Made the Graph Canvas the primary editor with collapsible left Filter Palette and right Node Inspector, a floating enlarge mode, pan / zoom / fit controls, and desktop MiniMap navigation.
- Added modern node cards with readable parameter summaries, manual node layout, Graph JSON/autosave workspace persistence, Ctrl/Cmd multi-selection, Shift connected-component selection, marquee selection, and group dragging.
- Added bidirectional drag-to-connect with magnetic port snapping, edge hover/selection/removal, and Undo / Redo integration.
- Added Japanese/English Palette search, Graph toolbar Recipe / project operations, reset confirmation, and context-aware Inspector reopening including hidden-Inspector Node double-click.
- Added mobile-first Graph editing with bottom-sheet Palette / Inspector, one-finger pan / node drag, pinch zoom, tap-to-connect, safe-area handling, and no page-level horizontal scrolling.
- Polished Preview sizing, segmented zoom controls, floating-workspace toast layering, Audio palette colors, and sidebar reopen controls after RC device review.
- Replaced the release-candidate regression gate with the final `tests/release-smoke.mjs` contract and synchronized app/build/runtime version metadata to `v1.1.0`.

### Compatibility

- v1.0.0 Graph JSON remains loadable; missing workspace metadata is auto-laid out and fitted.
- Node positions, viewport, Palette/Inspector state, and MiniMap state do not change Graph Hash or make Preview stale.
- ST `file://`, MT cross-origin-isolated operation, Preview, Full Render, Draw Text, Audio filters, Complex Graph, Recipes, Graph JSON, and Autosave retain the v1.0.0 processing contract.

## 1.1.0-rc.1 - 2026-09-13

- Froze v1.1.0 feature work for release-candidate regression and release hardening.
- Synchronized the app, build scripts, runtime User-Agent, repository checks, README, and smoke tests to `v1.1.0-rc.1`.
- Added a dedicated release-candidate regression contract covering v1.0.0 Graph JSON compatibility, Graph schemaVersion 3, workspace/hash separation, Palette / Inspector, manual layout, bidirectional wiring, MiniMap, mobile bottom sheets, Preview, Full Render, ST / MT outputs, and runtime network blocking.
- Added the RC regression test to both pull-request validation and GitHub Pages deployment gates.
- Expanded offline verification around desktop/mobile Graph editing, ST `file://`, MT cross-origin isolation, Graph JSON / Autosave boundaries, Draw Text, Preview, and Full Render.
- Kept FFmpeg WASM Builder pinned to v1.9.8 and made no new filter, Graph schema, or runtime-contract changes.
- Matched Audio filter palette icons to the Canvas Audio color system.
- Made Palette / Inspector reopen buttons appear only while the corresponding sidebar is closed, and moved the Inspector reopen control onto the Canvas right edge.
- Added Node double-click as a direct way to select a node and open its Inspector.

## 1.1.0-beta.3 - 2026-09-12

- Reworked the mobile Graph Workspace so the Canvas remains full-width while Filter Palette and Node Inspector open as bottom sheets.
- Added mobile sheet backdrop / outside-tap dismissal, safe-area padding, sticky sheet headers, and 44px+ touch targets.
- Added two-finger pinch zoom while preserving one-finger Canvas pan and Node drag.
- Added bidirectional tap-to-connect for ports in addition to drag-to-connect, with the existing type / cycle validation and magnetic snapping.
- Hid MiniMap on mobile and made the Graph toolbar horizontally scrollable instead of wrapping into a tall control block.
- Added mobile layout regression coverage while keeping Graph schema v3, Preview, Full Render, ST / MT, and standalone behavior unchanged.

## 1.1.0-beta.2 - 2026-09-12

- Added bidirectional drag-to-connect: start from an output and drop on an input, or start from an input and drag backward to a compatible output.
- Kept type validation, cycle rejection, and magnetic snapping identical in both wiring directions.
- Refined edge interaction with a wider hit area plus clearer hover, connected-node emphasis, and selected-edge feedback.
- Added a desktop MiniMap showing graph nodes and the current viewport. Click or drag the MiniMap to navigate the Canvas.
- Fixed MiniMap/viewport coordinate handling: MiniMap node clicks now select and center the node, dragging the viewport keeps its grab offset, and ordinary node clicks no longer unexpectedly pan the Canvas.
- Normalized two-column Inspector fields so labels and controls share the same top baseline across Trim and other paired settings.
- Added a toolbar control to show or hide the MiniMap; it stays hidden on mobile where Canvas space is more important.
- Kept Graph schemaVersion 3, compiler output, Preview / Full Render, workspace positions, and Graph Hash semantics unchanged.

## 1.1.0-beta.1 - 2026-09-12

- Fixed the repository validation marker after Graph tools moved from the palette into the toolbar popover.
- Moved Quick Recipes from a standalone page card into a Graph toolbar popover so the Canvas remains the primary workspace.
- Moved Graph JSON save/open, sample graphs, reset, and autosave status into a compact Graph tools menu in the toolbar.
- Added Palette search with Japanese and English aliases across Video, Text, Complex, and Audio nodes; matching categories open automatically and empty categories are hidden while searching.
- Refined the Node-RED-style left Palette / center Canvas / right Inspector layout without reintroducing gaps or permanent non-Canvas panels.
- Added selected-node context to the Inspector header and viewport compensation when reopening the Inspector so the selected node stays visible.
- Kept Graph schemaVersion 3, compiler output, Preview / Full Render, manual layout, floating workspace, and magnetic drag-to-connect semantics unchanged.

## 1.1.0-alpha.3 - 2026-09-11

- Changed Graph Canvas enlarge mode to a page-level floating workspace with a dimmed backdrop; it is not browser fullscreen.
- Added manual node positioning and persistence in Graph JSON/autosave workspace metadata.
- Changed selection shortcuts: Ctrl/Cmd+click toggles individual nodes, while Shift+click selects the full connected node component; Shift+drag marquee selection and group dragging remain available.
- Added Node-RED-style drag-to-connect wiring with a live Bezier preview, valid target highlighting, type checks, and cycle rejection; click-to-connect remains available as a fallback.
- Added magnetic port snapping while wiring: the preview wire snaps to a nearby valid input, the target grows/glows, and releasing within the magnetic radius completes the connection.
- Changed the floating workspace control to a four-corner enlarge icon and made clicking the dimmed area outside the workspace close the enlarged view.
- Added selectable edges and Delete/Backspace removal with Undo/Redo.
- Kept graph semantics/hash independent from workspace layout changes so moving nodes does not stale Preview.

## 1.1.0-alpha.2 - 2026-09-11

### Modern Node UI

- Unified Filters, Graph Canvas, and Node settings into one flush workspace surface with no inter-panel gap; sidebars remain independently collapsible and the center Canvas expands into the released space.
- Removed numbered step badges from Graph, Filters, Node settings, Preview, and Full Render because the redesigned workspace is no longer a linear step flow.
- Redesigned graph nodes from compact cards into wider ~210 px editor nodes with a dedicated header, SVG icon, category label, readable parameter summary, and larger port hit areas.
- Added visual categories for Video, Audio, Text, Branch, Input, and Output while keeping the Browser Kitty light theme and restrained accent usage.
- Replaced raw FFmpeg filter snippets in node summaries with user-readable values such as `1280 × auto`, `2× · Audio sync`, `-3 dB`, and branch semantics.
- Increased auto-layout spacing to accommodate the wider modern nodes without changing Graph schemaVersion 3, compiler output, Preview semantics, or workspace viewport persistence.
- Added a dedicated Modern Node UI smoke test to CI and deployment gates.
- Added a page-local Graph Canvas expand/restore control that increases workspace height without invoking browser fullscreen, while preserving the current viewport and both sidebars.
- Normalized every node to a fixed modern geometry and replaced percentage-based port positioning with shared pixel rows, eliminating Input / Output / Split / Overlay / Audio Mix label and port drift.
- Increased graph auto-layout spacing to match the normalized node height and added workspace layout regression coverage.

## 1.1.0-alpha.1 - 2026-09-11

### Graph Workspace Core

- Made Graph Canvas the first, full-width editor surface instead of the middle column in a three-column layout.
- Increased the desktop graph viewport to a 560-820 px responsive workspace, with a mobile-specific 420-620 px range.
- Added canvas pan, wheel/trackpad zoom (40%-200%), Fit Graph, 100% reset, and zoom controls.
- Moved Undo / Redo into the Graph toolbar.
- Added viewport persistence to Graph JSON and local autosave under an optional `workspace.viewport` field.
- Kept Graph schema v3 and Graph Hash semantics unchanged; pan / zoom state does not invalidate Preview.
- Kept v1.0.0 Graph JSON compatible: projects without workspace metadata are automatically fitted on first display.
- Recipes and sample/reset actions automatically fit the generated graph.
- Revised the alpha workspace after desktop review to a Node-RED-style layout: Filters on the left, Graph Canvas in the center, and Node settings on the right, with independent open/close controls for both sidebars.
- Added a dedicated zoom layer. Chromium/Edge use layout-aware CSS `zoom` for sharper text and SVG rendering at enlarged zoom levels, with transform scaling retained only as a fallback.

## 1.0.0 - 2026-09-11

### Changed

- Promoted FFmpeg Filter Builder to the first stable release without changing Graph schemaVersion 3 or the pinned FFmpeg WASM Builder v1.9.8 runtime contract.
- Finalized user-facing copy, README documentation, browser support notes, and release metadata for v1.0.0.
- Kept the compact collapsible Video / Text / Complex / Audio / Graph tools palette introduced during the release-candidate phase.
- Updated the canonical favicon / upper-left app icon to the approved FFmpeg + graph + filter artwork.
- Expanded the GitHub Pages deployment gate to run Audio, Text, Recipes / Full Render, i18n, and v1.0.0 release smoke tests before building.
- Removed unused template artifacts, WebRTC QR pairing material, unused generic components, unused npm-dependency scaffolding, and the bundled template ZIP from the repository.

### Release boundary

- v1.0.0 continues to accept one main MP4 media input. Watermark uses Draw Text, and Picture in Picture uses a Split branch of the same input. Independent image or second-video input is not part of this release.

## 0.9.0 - 2026-09-10

### Changed

- Entered the Release Candidate / regression-hardening milestone without changing the Graph schema or FFmpeg WASM Builder v1.9.8 runtime pin.
- Made Video filters, Text, Complex graph, Audio filters, and Graph tools collapsible using native `details` / `summary` controls. All groups start collapsed to avoid an excessively tall filter palette, especially on smaller screens.
- Renamed the left-palette `Graph` section to `Graph tools` / `Graph操作` because it contains Undo, Redo, sample-graph creation, and Reset rather than filters.
- Added release-candidate source checks for the collapsible palette while preserving existing Graph / Preview / Full Render regression suites.
- Reworked the English and Japanese README files around the same usage-first structure as the PDF Organizer repository.
- Fixed Windows Command Prompt / Windows PowerShell 5.1 build compatibility by removing UTF-8 BOMs from batch entry points and keeping repository-check PowerShell source ASCII-only.

## 0.8.0 - 2026-09-10

### Added

- Added ten task-oriented Recipes that expand into normal editable Graph schemaVersion 3 nodes and edges.
- Added Full Render using the same compiled Browser request as Preview but without bounded range arguments, producing the complete H.264 + AAC MP4.
- Added output filename editing, rendered file-size display, local result preview, and explicit save with File System Access API when available plus download fallback.
- Added Graph JSON export/import with validation before replacing the current graph.
- Added local Graph autosave and explicit previous-session Restore / Discard UI. Autosave stores graph metadata only and never persists media files.
- Added ST / MT guidance to Full Render and keeps Full Render unavailable when the MT isolation requirements are not met.
- Added `tests/recipes-full-render-smoke.mjs`, JA/EN parity coverage, and `docs/RECIPES_FULL_RENDER.md`.

### Recipes

- Resize to 720p
- Square Crop
- Vertical Video
- Rotate 90°
- Fade In / Out for Video + Audio
- Watermark (Draw Text in v0.8.0)
- Picture in Picture (same-source Split branch in v0.8.0)
- Blur Background Vertical
- 2x Speed with synchronized Audio
- Audio Normalize

### Current boundary

- Builder v1.9.8 still exposes one main media input. Independent image watermark and second-video Picture in Picture remain deferred until the dedicated multi-input runtime contract is implemented.

## 0.7.0 - 2026-09-09


- Fix repository font-binary validation on Windows by checking file extensions explicitly (instead of relying on `Get-ChildItem -Include`) and normalizing path separators before excluding generated `dist/` output.

- Added the Draw Text Video node with text, font size/color, seven position presets plus custom X/Y, optional background, and start/end visibility times.
- Added Browser `textfile` compilation and Desktop escaped `text=` compilation with `expansion=none`.
- Corrected Desktop Draw Text escaping to apply both option-value and filtergraph escaping for punctuation such as apostrophes, colons, backslashes, commas, brackets, and semicolons.
- Added pinned M PLUS 1p Regular build-time acquisition and verification; the verified font is embedded into generated standalone HTML and is not fetched at runtime.
- Embedded the M PLUS 1p OFL-1.1 license text into generated standalone HTML and exposed it under Third-party licenses.
- Updated the FFmpeg runtime pin to Builder v1.9.8, requiring FreeType, HarfBuzz, `drawtext`, and the `drawText` capability in both ST and MT variants.
- Added Draw Text to timeline-safe Preview planning so text visibility times remain correct for non-zero Preview starts.
- Added `tests/text-filter-set-smoke.mjs`, `docs/TEXT_FILTER_SET.md`, font lock/license checks, and source-package checks that prevent committed font binaries.

## 0.6.0 - 2026-09-09

- Added typed Video / Audio ports and schema version 3.
- Added Audio Trim, Volume, Audio Fade, Audio Speed, High-pass, Low-pass, Normalize, Audio Split, and Audio Mix nodes.
- Added separate `audioFilter` compilation for Browser FFmpeg and combined Video/Audio `filter_complex` generation for desktop FFmpeg.
- Video Speed can now keep Audio synchronized via an automatically generated `atempo` chain.
- Added an Audio Mix sample graph and regression tests for typed connections, audio compilation, mixing, and speed synchronization.
- Kept FFmpeg WASM Builder pinned to v1.9.7; the required Audio filters were already present in that runtime profile.


## [0.5.0] - 2026-09-09

### Added

- Split node with two named output ports (`A` / `B`).
- Overlay node with two named input ports (`MAIN` / `OVER`), X/Y controls, and quick position presets.
- Port-aware Edge model with `fromPort` / `toPort` and Graph schemaVersion 2.
- DAG validation for required branch/merge ports, duplicate-port connections, disconnected branches, and cycles.
- Branch-label compiler for Desktop `filter_complex` and Browser complex `videoFilter` expressions.
- Graph IR schema v2 with per-node named input/output label maps.
- `Split + Overlay` sample graph: Blur on one branch, Scale on the other, then Overlay.
- DAG-aware Preview horizon propagation for timeline-sensitive filters inside branches.
- `tests/complex-filtergraph-smoke.mjs` regression coverage.
- `docs/COMPLEX_FILTERGRAPH.md` describing the v0.5.0 runtime boundary and release gate.

### Changed

- Graph Canvas layout now groups nodes by topological depth so simultaneous branches render on separate rows.
- SVG edges connect to the exact named port used by each Edge.
- Port tap targets are enlarged while retaining the existing small visual connector circles.
- Runtime capability checks now require Builder v1.9.7 `split` and `overlay`.

### Runtime

- FFmpeg WASM Builder remains pinned to v1.9.7; no Builder update is required because the profile already contains `split` / `overlay`.
- Browser Preview supports complex branching/merging within one main video input by keeping external source/sink unlabeled and using internal branch labels.

### Current limitation

- General multiple independent input videos, image-file input, and watermark-file input are not claimed complete in v0.5.0. Builder v1.9.7 exposes one main Filter Builder input context; those features need a dedicated multi-input runtime contract.

## [0.4.0] - 2026-09-08

### Added

- Video Filter Set nodes for Speed, FPS, Scale, Crop, Pad, Rotate, Flip, Aspect Ratio, Color Adjust, Hue, Blur, Sharpen, and Fade.
- Trim graph model, validation, inspector, desktop command compiler, and Browser Preview support with Builder v1.9.5.
- Runtime-manifest capability gating for filter nodes.
- Human-readable inspectors, validation, help text, presets, and advanced compiled-filter details for the Video Filter Set.
- `tests/video-filter-set-smoke.mjs` coverage for compiler, validation, and runtime availability.
- Updated favicon / application icon to combine the FFmpeg label, connected graph nodes, and a Filter funnel motif.

### Fixed

- Align connector paths to the actual visual center of transformed circular ports by measuring post-transform `getBoundingClientRect()` geometry.
- Update the embedded runtime to Builder v1.9.6, which treats bounded-filter EOF as successful completion and preserves caller filter output dimensions instead of scaling them back to the source size.
- Update the embedded runtime again to Builder v1.9.7, which preserves fine-grained video timestamps for Speed graphs and avoids duplicate PTS/DTS after `setpts=PTS/rate`.

### Runtime

- FFmpeg WASM Builder is pinned to v1.9.7 release assets with SHA-256 verification.
- Browser Preview supports all v0.4.0 standard nodes including Trim.
- Preview start and 3 / 5 / 10 second duration now drive real bounded FFmpeg work through `startTimeSeconds` / `durationSeconds`.
- Cache keys include preview range, and timeline-sensitive graphs use a semantics-preserving source-horizon plan.

## [0.3.0] - 2026-09-08

### Added

- Preview Engine with selectable 3 / 5 / 10 second playback windows and preview start position.
- Deterministic Graph hash displayed beside compiler metadata.
- In-memory LRU-style Preview cache (up to two entries / 128 MB) keyed by Input session, Graph hash, and runtime variant.
- Stale-preview state that keeps the previous result visible after Graph edits.
- Friendly runtime / codec / filter / encoder / memory error mapping while retaining the full FFmpeg log.
- Runtime variant indicator inside the Preview Engine.
- Preview Engine smoke test.

### Changed

- Cancel now explicitly preserves Input, Graph, and the previous Preview.
- Graph connectors are measured from the actual SVG port centers and share the real 350px canvas coordinate system, fixing the vertically shifted lines seen in v0.2.0.
- Builder v1.9.4 remains pinned; preview duration is currently a playback window because the runner still transforms the full input.

## [0.2.0] - 2026-09-08

### Added

- Editable Graph Canvas backed by explicit Node and Edge models.
- Video port connections with single-input / linear-graph constraints.
- Input, Crop, Scale, Rotate, and Output nodes.
- Node add/delete actions.
- Undo / Redo history for graph changes.
- Cycle detection and graph validation.
- Topological ordering and FFmpeg stream-label generation.
- Graph IR compiler.
- Desktop FFmpeg `filter_complex` command compiler.
- Browser runner structured-request compiler using the equivalent linear `videoFilter` chain.
- Generated-command / Browser-request tabs.
- Sample `Input → Crop → Scale → Output` graph.
- Selected-node inspector for file input and filter parameters.

### Fixed

- Hide the `まだプレビューはありません` / `No preview yet` layer after a preview video is generated. The app now explicitly overrides the component display rule for `[hidden]` preview elements.
- Keep the file drop target collapsed after a video is loaded and restore it when the file is removed.
- Allow WebAssembly compilation with CSP `script-src 'wasm-unsafe-eval'` without enabling general JavaScript `unsafe-eval`.
- Use short verified runtime-cache paths under `%TEMP%` to avoid Windows path-length failures.

### Runtime

- FFmpeg WASM Builder remains pinned to v1.9.4.
- Single-thread and multi-thread builds use the same Graph Compiler and filter catalog.
- Browser preview supports the v0.2.0 linear Graph by compiling it to `videoFilter`; complex `filter_complex` Browser requests remain a later Builder/app milestone.

### Known limitation

- Builder v1.9.4 does not expose preview duration/range. FFmpeg converts the full input and the player limits playback to the first five seconds.

## [0.1.0] - 2026-09-08

### Added

- Browser Kitty / `htmlapps-template` based shell.
- Fixed `Input → Scale → Output` runtime PoC.
- Real single-thread / multi-thread FFmpeg WASM preview.
- GitHub Release v1.9.4 runtime locking and build-time SHA-256 verification.
