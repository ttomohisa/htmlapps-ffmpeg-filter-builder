import assert from 'node:assert/strict';
import fs from 'node:fs';

const source = fs.readFileSync(new URL('../src/index.template.html', import.meta.url), 'utf8');
const app = JSON.parse(fs.readFileSync(new URL('../app.config.json', import.meta.url), 'utf8'));
assert.equal(app.version, '1.1.0', 'Connection UX / MiniMap build must report v1.1.0.');

assert.ok(source.includes('function normalizeConnectionPair('), 'Bidirectional connection normalization missing.');
assert.ok(source.includes("startSide==='input'&&targetSide==='output'"), 'Input-to-output reverse wiring missing.');
assert.ok(source.includes('function canConnectPortPair('), 'Bidirectional connection validation missing.');
assert.ok(source.includes("const targetSide=drag.startSide==='output'?'input':'output'"), 'Opposite-side drag target selection missing.');
assert.ok(source.includes('connection-magnet'), 'Magnetic snapping must remain enabled.');
assert.ok(source.includes("startConnectionDrag(port,event);return;"), 'Pointer wiring must start from either port side.');

assert.ok(source.includes('id="graphMinimap"'), 'MiniMap container missing.');
assert.ok(source.includes('id="minimapViewport"'), 'MiniMap viewport marker missing.');
assert.ok(source.includes('function renderMiniMap()'), 'MiniMap rendering missing.');
assert.ok(source.includes('function centerGraphFromMiniMap('), 'MiniMap navigation missing.');
assert.ok(source.includes('function miniMapWorldFromClient('), 'MiniMap coordinate conversion missing.');
assert.ok(source.includes('function graphVisibleWorldRect('), 'Unified viewport/world conversion missing.');
assert.ok(source.includes('data-node-id="${escapeHtml(node.id)}"'), 'MiniMap node targeting missing.');
assert.ok(source.includes("event.target.id==='minimapViewport'"), 'MiniMap viewport drag behavior missing.');
assert.ok(source.includes('id="toggleMinimapButton"'), 'MiniMap visibility control missing.');
assert.ok(source.includes("graphMinimap.addEventListener('pointermove'"), 'MiniMap drag navigation missing.');
assert.ok(source.includes('.edge-hit:hover + .edge-path'), 'Edge hover feedback missing.');
assert.ok(source.includes('.graph-minimap,#toggleMinimapButton { display:none !important; }'), 'MiniMap must stay hidden on mobile.');

assert.ok(source.includes('schemaVersion:3') || source.includes('schemaVersion=3'), 'Graph schemaVersion 3 must remain unchanged.');
console.log('[OK] v1.1.0 Connection UX / MiniMap smoke tests passed.');
