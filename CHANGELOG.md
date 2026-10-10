# Changelog

## 1.2.3 - 2026-10-10

- Lock background scrolling only while a native modal is open, retain the existing Help shell, and make short Reset confirmations scroll internally below a fixed header.
- Wrap the narrow-screen title/version while keeping Help and language controls available.
- Restore visible logical focus after Reset cancellation and Palette/Inspector dismissal without changing graph selection or navigation.
- Allocate graph canvas height from the actual wrapped toolbar in normal and floating desktop workspaces. Runtime pins, graph/compiler semantics, media/file handling, and artwork are unchanged.

## 1.2.2 - 2026-10-09

- Normalize icon background green and exact 25% corner geometry, retaining all foreground and cutout paths.
- Rebuild matching header/favicon and standalone aliases without changing runtime assets.

All notable changes to FFmpeg Filter Builder are documented here.

## 1.2.1 - 2026-10-08

- Pin verified FFmpeg WASM Builder v1.10.2 ST/MT releases to repair terminal frame duration and bounded-preview timing.
- Preserve runtime capabilities, compiler semantics, GPL licensing, and offline boundaries; extend reviewed runtime validation without admitting unreviewed versions.
- Normalize the header language switch to EN / JA with localized destination tooltips and accessible names.
- Keep Help labels localized and synchronize the three-part app version without changing local-processing behavior.

## Unreleased - mobile workspace integration

- Retained the existing mobile Recipe / Add / Undo / More / Preview workflow while incorporating the latest ST/MT PR-preview configuration.
- Fixed the first stationary node tap and Enter / Space so they open the mobile Inspector; drag and cancelled gestures remain suppressed.
- Restored **Disconnect input** in mobile More with the existing operation, Undo support, and disabled-state rules.
- Exit desktop floating mode when entering smartphone width so Recipe / More stay above their backdrop, and hide mobile-only More controls on desktop.
- Added executable gesture, dismissal, breakpoint, and disconnect regression tests to the existing mobile CI gate; refreshed ST/MT standalone aliases.

## Unreleased

### Mobile workspace UX

- Added a fixed smartphone action bar for Recipe, Add, Undo, More, and Preview so core Graph operations no longer depend on a horizontally scrolling toolbar.
- Promoted Recipe to a first-class mobile flow with a dedicated bottom sheet, category-grouped recipe cards, selected-recipe description, and a sticky Graph expansion action; moved Fit into More.
- Open Node Inspector with one tap on mobile and move newly added filters / Inputs directly into settings.
- Added a clear **Done** action to the mobile Inspector and separated destructive node actions from normal settings.
- Kept Fit, Redo, Graph JSON, re-link, and reset reachable from the mobile More sheet.
- Added bottom safe-area spacing and moved toast / mobile popovers above the fixed action bar.
- Added an inline-script syntax regression test so template JavaScript parse errors fail CI before standalone build verification.
- The dual-runtime build now refreshes root-level `ffmpeg-filter-builder.html` / `ffmpeg-filter-builder.mt.html` from the generated dist files and verifies byte identity by SHA-256.

## 1.2.0 - 2026-09-21

### Stable

- Promoted the v1.2.0-rc.1 codebase to Stable with no new feature or runtime dependency changes.
- Finalized Multiple Input for video, image, and audio sources, including two-video PiP, Logo Overlay, BGM / Audio Mix, silent-video handling, and 24 editable Recipes.
- Finalized Graph Restore / Auto Relink, Palette drag placement, fixed-height scrolling Palette / Inspector panels, and graph keyboard editing.
- Kept FFmpeg WASM Builder pinned to v1.9.9 for both ST and MT runtime assets with SHA-256 verification.
- Kept standalone runtime networking blocked with `connect-src 'none'`, and kept source media local to the browser.
- Promoted the release-candidate regression gate to the Stable release gate and synchronized app/build/workflow/version markers and release screenshots to v1.2.0.

## 1.2.0-rc.1 - 2026-09-21

### Release candidate / full regression

- Froze v1.2 feature work and promoted the beta.4 codebase to the first release candidate.
- Added an RC gate covering Single Input, multi-input PiP, Logo Overlay, Audio Input / BGM / Audio Mix, silent-video handling, Graph Restore / Auto Relink, Recipes, keyboard editing, mobile workspace, ST / MT deployment, CSP, and runtime-network blocking.
- Kept FFmpeg WASM Builder pinned to v1.9.9 with the existing reviewed ST / MT release assets; no runtime dependency was changed for the RC.
- Synchronized app/build/repository/workflow version markers to v1.2.0-rc.1.
- Refreshed README status and release screenshots for the RC UI.

## 1.2.0-beta.4 - 2026-09-21

### Graph Restore / Auto Relink

- Added bulk re-link for Missing Input nodes after Graph JSON import or browser-local recovery.
- Match local files by media kind, filename, and size; use `lastModified` and MIME type to prefer the strongest match without storing absolute paths or file bytes.
- Reuse matching File objects already loaded in the current session when a Graph is opened again.
- Added **Re-select media in bulk** to Graph actions and to the Missing Input Inspector flow when several Inputs are unresolved.
- Canvas multi-file drop now restores matching Missing Inputs first, then adds only unmatched supported media as new Input nodes.
- Keep explicit single-file drop / picker behavior for a specific Missing Input unchanged.
- Added `tests/beta4-auto-relink-smoke.mjs` and synchronized release/version checks for beta.4.

## 1.2.0-beta.3 - 2026-09-21

### Audio Input / BGM / Audio Mix

- Added **Add BGM** and **Replace Audio with BGM** Recipes, expanding the guided recipe set from 22 to 24.
- Made external Audio Input a complete Preview / Full Render path: Main audio + BGM can be mixed, or the original soundtrack can be ignored and replaced.
- Normalize both Audio Mix inputs through `aresample=48000,asetpts=PTS-STARTPTS` before `amix`, improving behavior when source sample rates or timestamps differ.
- Added an Audio Mix duration mode: follow input A, stop at the shorter input, or continue to the longer input.
- Default BGM level is -12 dB. The BGM Recipe mixes to the longer audio branch and then trims the final soundtrack to the Main video duration, so short Main audio does not cut BGM early and long music does not extend the video.
- Handle silent Main videos explicitly: the BGM Recipe does not generate a missing `[0:a]` branch when the MP4 has no audio track.
- Preserve an already-bound Audio Input when applying a BGM Recipe; otherwise create/select a Missing Audio Input with a clear next action. Audio file selection is limited to MP3 / WAV / M4A / FLAC / OGG / Opus supported by the pinned runtime.
- Added `tests/beta3-audio-bgm-smoke.mjs` and expanded compiler/recipe/audio regressions for multi-source audio.

## 1.2.0-beta.2 - 2026-09-20

### Image Input / Logo Overlay

- Added a true **Logo Overlay** Recipe using Main Video + Image Input + Scale + Overlay while keeping Main Input audio and duration.
- Limited Image Input selection/drop to PNG and JPEG, matching the reviewed decoders in FFmpeg WASM Builder v1.9.9.
- Added Overlay **Keep foreground visible** behavior, compiling to `eof_action=repeat:repeatlast=1` for still-image logos while preserving the beta.1 PiP behavior (`eof_action=pass:repeatlast=0`) for shorter foreground videos.
- Preserve an already-bound Image Input when applying the Logo Recipe; otherwise create/select a Missing Image Input with a clear relink message.
- Promoted the checked-in runtime lock to the published FFmpeg WASM Builder v1.9.9 ST / MT GitHub Release assets and reviewed SHA-256 values. Runtime network behavior remains unchanged because the generated standalone HTML embeds the runtime.
- Added `tests/beta2-logo-overlay-smoke.mjs` and a PNG fixture for the Image Input / Logo Overlay contract.
- Expanded Quick Recipes from 11 to 22 and grouped them into Size & orientation, Composite & look, and Time & audio. New recipes include 1080p resize, 16:9 landscape, square blurred background, horizontal mirror, 30 fps, centered title, grayscale, light sharpen, first 10 seconds, 0.5x, and 1.5x speed.
- Removed the Recipe pre-load dead end: source-aware recipes now switch the primary action to **Choose video & build graph**, open the MP4 picker directly, read metadata locally, and generate the graph in the same flow. Cancelling the picker leaves the current graph unchanged.

## 1.2.0-beta.1 - 2026-09-20

### Two-video Picture in Picture

- Replaced the legacy same-input PiP Recipe with a true two-Video-Input graph. Main Input feeds the background/output audio and the second Video Input feeds the scaled overlay branch.
- Preserve an already selected secondary Video Input when applying the PiP Recipe; when none exists, create an explicit Missing Input and select it so the next action is clear.
- Changed the PiP Recipe to keep Main Input duration. If the overlay video ends first, `overlay` uses `eof_action=pass:repeatlast=0` so the PiP disappears instead of freezing or truncating the output.
- Added an Overlay Inspector toggle for intentionally ending at the shorter input when that behavior is wanted.
- Added `tests/beta1-pip-smoke.mjs` for the two-input PiP contract.

### Builder v1.9.9 release handoff

- Added `docs/BUILDER_V1_9_9_RELEASE.md` with the v1.9.9 commit/tag/release flow.
- Added `scripts/promote-builder-v1.9.9.ps1`. After the Builder GitHub Release exists, it downloads the ST/MT release ZIPs, computes SHA-256 locally, updates `runtime.lock.json`, and switches the default standalone build from the local-development path to the pinned GitHub Release.
- The finished standalone HTML remains fully local at runtime; GitHub is only a build-time source for the pinned FFmpeg WASM release asset.

## 1.2.0-alpha.5 - 2026-09-19

### Multi-input Preview / Full Render runtime integration

- Stage every bound Input File/Blob into WORKERFS for multi-input Preview and Full Render.
- Execute compiled multi-input requests when the embedded Builder runtime advertises `multipleInputs` and `complexGraph`.
- Normalize raw multi-input output branches through `null` / `anull` so the public-libav complex graph always has explicit output labels.
- Preserve v1.9.8 single-input compatibility; local Builder v1.9.9 builds enable the new execution path during development.
- Fixed local Builder v1.9.9 staging, Windows SHA-256 compatibility, and repository preflight checks discovered during the real Windows build.
- Keep missing Input files blocked with a clear relink message rather than rendering a partial graph.

## 1.2.0-alpha.4 - 2026-09-18

### Multi-input FFmpeg Compiler

- Added deterministic FFmpeg input indexing for schemaVersion 4 Input nodes in Graph node order; changing `mainInputId` no longer renumbers compiler inputs.
- Added `resolveInputs()` with stable `/workerfs/input-N.ext` virtual paths, typed Video / Audio stream references, and still-image `-loop 1` input options.
- Updated Graph validation to allow several typed Input sources when every node remains connected from an Input to the single Output.
- Extended `compileGraph()` to generate multiple `-i` arguments, one cross-source `filter_complex`, and explicit Video / Audio maps for desktop FFmpeg.
- Added a serializable multi-input Browser request contract with `inputs[]`, `filterComplex`, `videoMap`, and `audioMap`, while preserving the Builder v1.9.8 `videoFilter` / `audioFilter` path for one-Input Graphs.
- Kept multi-input Preview / Full Render intentionally blocked until alpha.5; alpha.4 compiles the execution plan but does not silently run an incomplete multi-file path.
- Added `tests/multi-input-compiler-smoke.mjs` and wired it into PR / GitHub Pages CI and repository checks.

## 1.2.0-alpha.3 - 2026-09-18

- Added direct Canvas drag-and-drop for supported Video / Audio / Image Inputs.
- Added multi-file drop: supported media files create separate Input nodes near the drop position, while unsupported files are skipped with a clear message.
- Added drop-to-relink for a single matching file on an unbound Input node.
- Added a dedicated Canvas drop overlay and Input drop-target highlight without changing the v1.1 Graph navigation model.
- Added explicit Missing Input presentation for Graph JSON / Autosave restores: saved source metadata remains visible, the Canvas marks Inputs that need media, and the Inspector explains how to re-select the local file.
- Added missing-media counts to Graph import and Autosave recovery Toasts.
- Added `tests/multi-input-drop-smoke.mjs` and wired it into PR / GitHub Pages CI and repository validation.
- Kept multi-input FFmpeg execution gated until the later Compiler / Runtime milestones; alpha.3 does not silently process only one of several Inputs.

## 1.2.0-alpha.2 - 2026-09-18

### Input Node UI / source management

- Added an **Input** Palette group for MP4 Video, Audio, and Image sources. Video can reuse the initial empty Input; Audio and Image are added as independent Input nodes.
- Added media-kind-aware Input nodes: Video exposes Video + Audio ports, Audio exposes only Audio, and Image exposes only a Video-type port.
- Added Input Inspector actions to replace or detach the selected local file, with filename, dimensions/duration, size, and an explicit unbound state after Graph JSON restore.
- Added **Main Input** management with a Canvas `MAIN` badge and an Inspector action for promoting another Input.
- Allowed extra Input nodes to be deleted with Undo/Redo support; the last Input is protected, and deleting the current Main Input promotes a remaining Input.
- Kept browser `File` objects in runtime-only `inputBindings` and extended history snapshots so Input add/replace/remove/delete actions restore their runtime bindings during the current session.
- Preserved the Input media kind after detaching a file and made the media kind part of Graph semantics/hash while keeping filename, size, timestamps, and other source metadata outside the semantic hash.
- Kept multi-input FFmpeg execution intentionally blocked. Preview / Full Render still use exactly one Main Input until the later compiler/runtime milestones.
- Added `tests/multi-input-ui-smoke.mjs` and wired the Input UI contract into PR and GitHub Pages CI.

## 1.2.0-alpha.1 - 2026-09-18

### Multiple Input data model groundwork

- Moved newly created Graphs to **schemaVersion 4** and added an explicit `mainInputId` while keeping the existing single-main-input FFmpeg execution path for this alpha milestone.
- Added serializable Input `source` metadata for kind, filename, size, last-modified time, MIME type, duration, width, and height without persisting local paths or media bytes.
- Added runtime-only `inputBindings` so browser `File` objects stay outside Graph JSON and autosave data.
- Added automatic schemaVersion 3 → 4 migration for v1.0 / v1.1 Graph JSON and previous-session autosave data.
- Allowed the v4 project data model to represent multiple Input nodes and preserve an explicit main Input, while intentionally blocking multi-input Preview / Full Render until later v1.2.0 milestones.
- Preserved the v1.1.0 Graph Workspace, ST / MT runtime contract, GitHub Pages `/mt/` deployment, FFmpeg WASM Builder v1.9.8 pin, and fully local runtime processing.
- Added `tests/multi-input-schema-smoke.mjs` and wired the schema migration contract into pull-request and GitHub Pages CI gates.

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
- Added dual GitHub Pages publishing: `/` serves the ST build and `/mt/` serves the MT build with a pinned same-origin `coi-serviceworker` fallback when the host cannot provide COOP / COEP headers.
- Kept `dist/index.mt.html` as a standalone MT artifact; the service-worker bootstrap is injected only into the generated `pages-dist/mt/index.html` deployment copy.
- Hardened the pinned FFmpeg runtime cache: an incomplete extracted cache is now detected and rebuilt automatically from the SHA-256-verified `runtime.zip`, avoiding manual temp-cache cleanup after build-script upgrades.

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
