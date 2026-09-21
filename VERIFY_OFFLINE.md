# Offline verification — v1.2.0

## v1.2.0 stable release regression

- Run the complete Node smoke suite and confirm every test passes before building.
- Build both ST and MT standalone HTML on Windows with `build-standalone.bat`.
- Confirm ST opens from `file://`, Preview and Full Render work, and no runtime network request is made.
- Confirm MT runs through `start-local-mt.bat` or hosted COOP / COEP deployment with `crossOriginIsolated === true`.
- Exercise one Single Input recipe, two-video PiP, PNG Logo Overlay, BGM mix, silent Main video + BGM, Graph JSON save/open + bulk Auto Relink, Undo / Redo, Delete, keyboard movement, and explicit output save.
- Check PC and mobile layouts in Japanese and English. Palette / Inspector must scroll internally on desktop; mobile Palette / Inspector must remain Bottom Sheets without horizontal page scrolling.
- Confirm `connect-src 'none'`, no external runtime script/style, Builder v1.9.9 pin, SHA-256 verification, GitHub Pages `/` + `/mt/` layout, favicon, README, and screenshots.

## v1.2.0-beta.4 Graph Restore / Auto Relink regression

### Graph Restore / Auto Relink

- Build a Graph with Video + Image + Audio Inputs, save Graph JSON, reopen it, and confirm source metadata remains while File objects / bytes / absolute paths are not stored.
- With multiple Missing Inputs, use **Re-select media in bulk**, choose the original files in a different order, and confirm filename + size matching restores each file to the correct Input.
- Confirm a copied file with the same filename and size still matches when `lastModified` differs; matching `lastModified` and MIME should win when otherwise equivalent candidates exist.
- Confirm a same-name file with a different size, a wrong media kind, or an unrelated filename does not auto-link.
- Reopen a Graph during the same browser session and confirm already-loaded matching `File` objects can be reused without another picker round trip.
- Drop several files onto the Canvas while Missing Inputs exist. Matching files must relink first; only unmatched supported files may create new Input nodes.
- Drop one compatible file directly onto a specific unbound Input and confirm the existing explicit single-Input binding behavior remains available.
- Confirm Preview / Full Render stay blocked until every referenced Input needed by the Graph has a runtime File binding.
- Repeat the restore flow in ST and MT builds and confirm it does not introduce runtime network access.

## v1.2.0-beta.3 regression

### Multi-input FFmpeg Compiler

- Build a Video + Image Overlay Graph and confirm the generated command contains two `-i` arguments, `[0:v]` / `[1:v]`, one `-filter_complex`, and explicit `-map` values.
- Confirm Image Input contributes `-loop 1` before its `-i`.
- Build a Graph with two Audio Inputs feeding Audio Mix and confirm the compiler uses distinct `[1:a]` / `[2:a]` stream labels.
- Change `mainInputId` and confirm existing FFmpeg input indexes do not get renumbered.
- Open the Browser request tab and confirm multi-input Graphs contain `mode: "multi-input"`, `inputs[]`, stable `/workerfs/input-N.ext` paths, `filterComplex`, `videoMap`, and `audioMap`.
- Confirm a one-Input Graph still emits the existing `videoFilter` / `audioFilter` request used by Builder v1.9.8.
- Confirm Preview / Full Render execute multi-input Graphs when all required Input files are bound and the embedded v1.9.9 runtime advertises Multiple Input support.

### Canvas Drop / Missing Input

- Drop one MP4, one audio file, and one image file onto the Graph Canvas and confirm separate Input nodes appear near the drop point.
- Drop multiple supported files together and confirm all supported files become Input nodes while unsupported files are skipped with a visible message.
- Save Graph JSON, reopen it, and confirm saved source names remain visible but the Input nodes show that media must be selected again.
- Drop one matching file onto an unbound Input and confirm that Input is re-linked instead of creating a duplicate node.
- Confirm no local path or media bytes appear in Graph JSON / Autosave.



### Graph schema v4 / migration

- Save a new Graph JSON and confirm `graph.schemaVersion` is `4` and `graph.mainInputId` points to the Input node.
- After loading an MP4, save Graph JSON and confirm the Input node contains source metadata such as filename/size but no local path and no media bytes.
- Open a v1.0 / v1.1 schemaVersion 3 Graph JSON and confirm it opens as schemaVersion 4 without losing nodes, edges, or workspace positions.
- Reopen a saved v4 Graph project and confirm the Graph retains source metadata but still requires the actual media file to be selected again.
- Add Video / Audio / Image Inputs from the Palette and confirm each appears as an independent Input node. The initial empty Input may be reused for the first Video only; Audio/Image additions must not silently change its media kind.
- Confirm Video Input exposes Video + Audio ports, Audio Input exposes only Audio, and Image Input exposes only the Video-type port.
- In the Input Inspector, replace a file, detach it, and confirm the Input kind is preserved after detach.
- Promote another Input to Main and confirm the `MAIN` badge moves with `graph.mainInputId`. Delete an extra Input and Undo/Redo the operation; the last Input must remain protected.
- Reopen a saved v4 Graph and confirm source metadata remains but browser File bindings are absent and shown as unbound.
- A v4 project with multiple Input nodes must require all referenced files to be rebound before Preview / Full Render; it must not silently execute a partial graph.

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
- All 24 Recipes
- Preview cache / stale state
- Full Render and explicit save

## Draw Text / licenses

- Confirm the embedded M PLUS 1p font works while offline.
- Confirm Third-party licenses contains the OFL-1.1 text.

## Persistence boundary

- Autosave may retain Graph JSON, workspace positions/viewport, and output filename in this browser.
- Autosave must not retain the source media file, Preview video, or rendered MP4.
- Restoring a previous session must tell the user to select the media file again.



## v1.2.0-beta.3 Audio Input / BGM / Audio Mix

- Apply **BGMを追加** to a Main MP4 with audio, assign an external Audio Input, and confirm Preview / Full Render keep Main video while mixing BGM at the default -12 dB.
- Repeat with a silent Main MP4 and confirm Preview / Full Render succeed without referencing a missing Main audio stream.
- Apply **音声をBGMに置き換える** and confirm Main audio is not present in the result.
- Test mismatched audio formats/sample rates (for example 44.1 kHz mono BGM against 48 kHz stereo Main audio) and confirm the graph initializes and renders.
- Set Audio Mix duration to A / shortest / longest and confirm the selected mode is reflected in output behavior.
- Use a BGM longer than the Main video and confirm the rendered duration does not extend beyond the Main video.
- Use a BGM shorter than the Main video and confirm it is not silently looped.
- Verify the BGM Audio Input is Missing after Graph JSON restore and can be rebound without storing the audio bytes or local path.
- Confirm ST and MT produce the same graph semantics.

## v1.2.0-beta.2 runtime integration

Multiple Input Preview / Full Render uses the same compiled `filterComplex` contract as desktop command generation. Each Input binding is mounted into WORKERFS at its stable virtual path. Execution is enabled only when the embedded runtime manifest advertises both `multipleInputs: true` and `complexGraph: true`; the v1.9.8 single-input runtime remains valid for one-input graphs.

## v1.2.0-beta.2 Image Input / Logo Overlay

- PNGロゴをImage Inputへ割り当て、Logo Overlay Recipeを適用してPreview / Full Renderの両方でMain Inputの最後まで表示が残ること。
- 透過PNGのalphaがOverlay結果で保持されること。
- JPEGロゴでもPreview / Full Renderできること。
- WebP / GIF / BMP / AVIFはImage Inputの選択対象として案内せず、Canvas Dropでも追加しないこと。
- Overlayの「前景の表示を維持」をOFFにすると、短い前景Videoは終了後に消えるbeta.1挙動を維持すること。
- Graph JSON / Autosaveから復元したImage InputはMissing状態となり、画像を再選択すると同じInputを再利用できること。
- 通常の`build-standalone.bat`がローカルBuilderなしでBuilder v1.9.9 GitHub Release runtimeを取得・SHA-256検証してST / MTを生成できること。
- 生成したstandalone HTMLは`connect-src 'none'`を維持し、実行時にGitHubへFFmpeg runtimeを取りに行かないこと。
