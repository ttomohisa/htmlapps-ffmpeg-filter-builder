import assert from 'node:assert/strict';
import fs from 'node:fs';

const source = fs.readFileSync(new URL('../src/index.template.html', import.meta.url), 'utf8');
const app = JSON.parse(fs.readFileSync(new URL('../app.config.json', import.meta.url), 'utf8'));

assert.equal(app.version, '1.1.0', 'Mobile build must report v1.1.0.');
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
console.log('[OK] v1.1.0 Mobile Graph Workspace smoke tests passed.');
