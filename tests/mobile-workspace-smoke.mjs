import './mobile-workspace-behavior-smoke.mjs';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const source = fs.readFileSync(new URL('../src/index.template.html', import.meta.url), 'utf8');
const app = JSON.parse(fs.readFileSync(new URL('../app.config.json', import.meta.url), 'utf8'));

assert.equal(app.version, '1.2.2', 'Mobile build must report v1.2.2.');
assert.ok(source.includes('id="mobileSheetBackdrop"'), 'Mobile sheet backdrop is missing.');
assert.ok(source.includes("const MOBILE_GRAPH_MEDIA='(max-width:700px)'"), 'Mobile Graph breakpoint contract is missing.');
assert.ok(source.includes("position:fixed;\n        z-index:135"), 'Palette / Inspector are not mobile fixed bottom sheets.');
assert.ok(source.includes('calc(18px + env(safe-area-inset-bottom))'), 'Mobile sheets do not account for the bottom safe area.');
assert.ok(source.includes('.node-port { width:48px; height:48px; }'), 'Mobile Port target is below the intended touch target size.');
assert.ok(source.includes('function startTouchPinch()'), 'Pinch zoom handler is missing.');
assert.ok(source.includes('function updateTouchPinch()'), 'Pinch zoom update handler is missing.');
assert.ok(source.includes("state.pendingConnection={nodeId:id,startSide:side,portKey:portKeyValue,type}"), 'Bidirectional tap-to-connect state is missing.');
assert.ok(source.includes('.graph-minimap,#toggleMinimapButton { display:none !important; }'), 'MiniMap must stay hidden on mobile.');
assert.ok(source.includes('overflow-x:hidden'), 'Mobile page horizontal overflow guard is missing.');
assert.ok(source.includes('id="mobileActionBar"'), 'Fixed mobile action bar is missing.');
for (const id of ['mobileRecipeButton','mobileAddButton','mobileUndoButton','mobileMoreButton','mobilePreviewButton']) {
  assert.ok(source.includes(`id="${id}"`), `Mobile action is missing: ${id}`);
}
assert.ok(source.includes('body { padding-bottom:calc(var(--mobile-action-height) + env(safe-area-inset-bottom)); }'), 'Mobile action bar safe-area spacing is missing.');
assert.ok(source.includes('.graph-toolbar { display:none; }'), 'Legacy horizontal toolbar should stay hidden on mobile.');
assert.ok(source.includes('id="mobileInspectorDoneButton"'), 'Inspector Done action is missing.');
assert.ok(source.includes("mobileDone:'完了'"), 'Japanese Inspector completion label is missing.');
assert.ok(source.includes("mobileDone:'Done'"), 'English Inspector completion label is missing.');
assert.ok(source.includes("nodeActions:'ノード操作'"), 'Node actions must be separated from settings on mobile.');
assert.ok(source.includes("if(isMobileGraphWorkspace()&&plain)setWorkspaceSidebar('inspector',true)"), 'A single mobile node tap must open settings.');
assert.ok(source.includes("setWorkspaceSidebar('palette',false);setWorkspaceSidebar('inspector',true);"), 'Newly added mobile nodes should move directly into settings.');
assert.ok(source.includes('id="mobileRecipeButton"'), 'Recipe must be a first-class mobile action.');
assert.ok(source.includes('class="mobile-action-button recipe"'), 'Recipe mobile action must be visually promoted.');
assert.ok(source.includes('id="mobileRecipeGrid"'), 'Mobile Recipe card list is missing.');
assert.ok(source.includes('function renderMobileRecipeGrid()'), 'Mobile Recipe cards are not generated from the canonical Recipe select.');
assert.ok(source.includes('mobile-recipe-buttons'), 'Mobile Recipe category grids are missing.');
assert.ok(source.includes('id="mobileFitAction"'), 'Fit must remain reachable from the mobile More sheet.');
assert.ok(source.includes('id="mobilePopoverBackdrop"'), 'Mobile toolbar popover backdrop is missing.');
assert.ok(source.includes('mobile-toolbar-popover-open'), 'Mobile Recipe / More modal state is missing.');
assert.ok(!source.includes('id="mobileRecipeAction"'), 'Recipe should not be hidden inside More on mobile.');
assert.ok(source.includes('function syncMobileActionBar()'), 'Mobile action state synchronization is missing.');
console.log('[OK] v1.2.0 Mobile Graph Workspace smoke tests passed.');
