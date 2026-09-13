# Offline verification — v1.1.0

## Final release regression

### Desktop Graph Workspace

- Open / close the left Filter Palette and right Node Inspector; confirm the Canvas uses the released space with no gap and the Filter toggle sits on the Canvas row below the toolbar.
- Search the Palette in Japanese and English and confirm categories recover after clearing the search.
- Apply a Recipe from the Graph toolbar and confirm it expands into editable nodes.
- Open Graph tools and verify Graph JSON save/open and Reset remain reachable; confirm Reset asks before changing the Graph. Verify Undo / Redo remain reachable from the toolbar.
- Pan, zoom, reset to 100%, and Fit the Graph repeatedly. Confirm the − / percentage / + zoom controls appear as one segmented control.
- Float/enlarge the Graph Workspace, trigger a toast while floating, and confirm the toast stays visible. Then close the workspace with `Esc` and by clicking outside it.
- Move nodes manually, Ctrl/Cmd+click multiple nodes, Shift+click a connected component, and Shift+drag a marquee selection.
- Drag a wire in both directions (output → input and input → output), confirm magnetic snapping, and reject incompatible/cyclic targets.
- Select/delete an Edge and confirm Undo / Redo.
- Click several MiniMap nodes, drag the MiniMap viewport, zoom, then navigate again; confirm the correct node/viewport remains aligned.
- Move nodes without changing filter parameters and confirm Preview does not become stale only because of workspace layout changes.

### Mobile Graph Workspace

- Test portrait and landscape widths around 390 px.
- Confirm no page-level horizontal scrolling occurs.
- Open Palette and Inspector bottom sheets; verify only one is open at a time, safe-area padding is present, and tapping the backdrop closes the sheet.
- Pan the Canvas with one finger and drag a Node with one finger.
- Pinch with two fingers to zoom and pan around the pinch center.
- Connect ports by drag and by tap → tap in both directions.
- Confirm touch targets are usable and the MiniMap stays hidden.

- Generate a Preview with both landscape and portrait-oriented source/output geometry and confirm the complete Preview frame is visible rather than cropped.

## Single-thread standalone

1. Build with `build-standalone.bat` while online so the pinned runtime and font can be acquired and verified.
2. Disconnect the machine from the network.
3. Open `dist/index.html` directly with `file://`.
4. Load an MP4 file.
5. Apply at least one Recipe such as `2x Speed` or `Audio Normalize`.
6. Run Preview.
7. Run Full Render and save the generated MP4.
8. Save the Graph JSON, modify the Graph, then load the saved JSON and confirm the Graph and workspace positions return.
9. Load a v1.0.0 Graph JSON without workspace metadata and confirm it opens and auto-fits.
10. Edit the graph, reload the page, and verify the previous-session recovery prompt.
11. Confirm no runtime network request is attempted; CSP keeps `connect-src 'none'`.

## Multi-thread standalone

1. Run `start-local-mt.bat` or deploy with the required COOP / COEP headers.
2. Confirm `crossOriginIsolated === true`.
3. Repeat Recipe → Preview → Full Render with `dist/index.mt.html`.
4. Confirm the same Graph JSON can be loaded in ST and MT builds.

## Functional regression

- Scale
- Speed + Audio sync
- Trim / bounded Preview
- Split / Overlay
- Audio Trim / Volume / Fade / Speed / High-pass / Low-pass / Normalize / Split / Mix
- Draw Text in Japanese and English
- All 10 Recipes
- Preview cache / stale state
- Full Render and explicit save

## Draw Text / licenses

- Confirm the embedded M PLUS 1p font works while offline.
- Confirm Third-party licenses contains the OFL-1.1 text.

## Persistence boundary

- Autosave may retain Graph JSON, workspace positions/viewport, and output filename in this browser.
- Autosave must not retain the source media file, Preview video, or rendered MP4.
- Restoring a previous session must tell the user to select the media file again.
