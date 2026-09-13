import assert from 'node:assert/strict';
import fs from 'node:fs';

const source = fs.readFileSync(new URL('../src/index.template.html', import.meta.url), 'utf8');
const app = JSON.parse(fs.readFileSync(new URL('../app.config.json', import.meta.url), 'utf8'));

assert.equal(app.version, '1.1.0', 'Workspace build must report v1.1.0.');
assert.ok(source.includes('<span class="version-badge" id="versionBadge">v1.1.0</span>'), 'Source version badge is not v1.1.0.');
assert.ok(source.includes('grid-template-columns:230px minmax(0,1fr) 300px; gap:0'), 'Workspace must keep flush sidebars around the canvas.');
assert.ok(source.includes('.graph-panel { grid-column:2; grid-row:1;'), 'Graph Canvas must occupy the center column.');
assert.ok(source.includes('.editor-grid.palette-collapsed'), 'Palette collapse state is missing.');
assert.ok(source.includes('.editor-grid.inspector-collapsed'), 'Inspector collapse state is missing.');
assert.ok(!source.includes('class="step-label"'), 'Numbered step badges must not remain.');
assert.ok(source.includes('height:clamp(560px,68vh,820px)'), 'Normal Graph Canvas height is missing.');
assert.ok(source.includes('touch-action:none'), 'Graph viewport must own pan/zoom gestures.');
for (const id of ['fitGraphButton','zoomOutButton','zoomResetButton','zoomInButton']) assert.ok(source.includes(`id="${id}"`), `${id} missing.`);
assert.ok(source.includes('const GRAPH_ZOOM_MIN=.4;'), 'Minimum zoom must be 40%.');
assert.ok(source.includes('const GRAPH_ZOOM_MAX=2;'), 'Maximum zoom must be 200%.');
assert.ok(source.includes('function fitGraph('), 'Fit Graph is missing.');
assert.ok(source.includes("graphScroll.addEventListener('wheel'"), 'Wheel zoom is missing.');
assert.ok(source.includes("graphScroll.addEventListener('pointerdown'"), 'Canvas pointer gestures are missing.');
assert.ok(source.includes("CSS.supports('zoom','1')"), 'Crisp CSS zoom path is missing.');
assert.ok(source.includes('workspace:{viewport:{x:0,y:0,zoom:1},positions:{}'), 'Workspace position state is missing.');
assert.ok(source.includes('positions:clone(state.workspace.positions||{})'), 'Graph JSON must persist positions separately from graph semantics.');
assert.ok(source.includes('state.workspace.positions=clone(project.workspace?.positions||{})'), 'Graph JSON import must restore positions.');
const stablePayloadMatch = source.match(/function stableGraphPayload\(graph=state\.graph\)\{([\s\S]*?)\n      \}/);
assert.ok(stablePayloadMatch, 'stableGraphPayload implementation was not found.');
assert.ok(!stablePayloadMatch[1].includes('workspace'), 'Workspace layout must not affect Graph Hash.');
console.log('[OK] v1.1.0 Graph Workspace Core smoke tests passed.');
