import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = (path) => fs.readFileSync(new URL(path, import.meta.url), 'utf8');
const source = read('../src/index.template.html');
const app = JSON.parse(read('../app.config.json'));
const runtime = JSON.parse(read('../runtime.lock.json'));
const readme = read('../README.md');
const readmeJa = read('../README.ja.md');
const repositoryCheck = read('../scripts/check-repository.ps1');
const buildWorkflow = read('../.github/workflows/build-standalone.yml');
const deployWorkflow = read('../.github/workflows/deploy-pages.yml');
const buildBat = read('../build-standalone.bat');
const buildPs1 = read('../build-standalone.ps1');

assert.equal(app.version, '1.1.0', 'Release version mismatch.');
assert.equal(app.build.blockRuntimeNetwork, true, 'Runtime network blocking must remain enabled.');
assert.equal(app.build.output, 'dist/index.html', 'ST output path changed unexpectedly.');
assert.equal(app.build.multiThreadOutput, 'dist/index.mt.html', 'MT output path changed unexpectedly.');
assert.equal(runtime.builderVersion, '1.9.8', 'FFmpeg WASM Builder pin changed unexpectedly.');
assert.equal(runtime.profile, 'ffmpeg-filter-builder', 'Runtime profile changed unexpectedly.');
for (const variant of ['single-thread', 'multi-thread']) {
  assert.match(runtime.variants[variant].sha256, /^[a-f0-9]{64}$/, `${variant} runtime SHA-256 is invalid.`);
}

assert.ok(source.includes('<span class="version-badge" id="versionBadge">v1.1.0</span>'), 'Release version badge missing.');
assert.ok(source.includes("connect-src 'none'"), 'CSP runtime network block missing.');
assert.ok(!/<script[^>]+src\s*=\s*["']https?:\/\//i.test(source), 'External runtime script URL detected.');
assert.ok(!/<link[^>]+href\s*=\s*["']https?:\/\//i.test(source), 'External runtime stylesheet URL detected.');
assert.ok(source.includes('schemaVersion:3') || source.includes('schemaVersion=3'), 'Graph schemaVersion 3 must remain unchanged.');
assert.ok(source.includes('state.workspace.positions=clone(project.workspace?.positions||{})'), 'v1.0.0 Graph JSON compatibility path is missing.');
assert.ok(source.includes('state.workspace.viewport=normalizeGraphViewport(project.workspace?.viewport)'), 'Optional workspace viewport import is missing.');

const stablePayload = source.match(/function stableGraphPayload\(graph=state\.graph\)\{([\s\S]*?)\n      \}/);
assert.ok(stablePayload, 'Graph hash payload implementation missing.');
assert.ok(!stablePayload[1].includes('workspace'), 'Workspace state must not affect Graph Hash.');

assert.ok(source.includes('class="graph-zoom-control"'), 'Zoom controls must render as one segmented control.');
assert.ok(source.includes('graph-canvas-sidebar-toggle'), 'Palette toggle must live on the canvas row.');
assert.ok(source.includes('graph-canvas-inspector-toggle'), 'Inspector reopen control must live on the canvas row.');
assert.ok(source.includes('syncWorkspaceSidebarToggleVisibility'), 'Collapsed-only sidebar reopen controls are missing.');
assert.ok(source.includes("AppConfirm.ask({title:t('resetConfirmTitle')"), 'Graph reset must use the confirmation dialog.');
assert.ok(source.includes('window.AppConfirm=Object.freeze({ask})'), 'Confirmation dialog runtime API missing.');
assert.ok(source.includes('.preview-shell.has-video'), 'Preview video must use the full-frame sizing rule.');
assert.ok(source.includes('z-index: 170'), 'Toast must stay above the floating graph workspace.');
assert.ok(!source.includes('id="sampleGraphButton"'), 'Legacy graph sample shortcut must be removed from the release UI.');

for (const marker of [
  'id="graphWorkspaceBackdrop"',
  'id="paletteSearchInput"',
  'id="inspectorContext"',
  'function ensureWorkspacePositions(order)',
  'function normalizeConnectionPair(',
  'function nearestConnectionTarget(',
  'id="graphMinimap"',
  'function renderMiniMap()',
  'id="mobileSheetBackdrop"',
  'function startTouchPinch()',
  'function updateTouchPinch()',
  'id="previewButton"',
  'id="fullRenderButton"'
]) assert.ok(source.includes(marker), `Release feature marker missing: ${marker}`);

assert.ok(readme.includes('v1.1.0'), 'English README is not synchronized to v1.1.0.');
assert.ok(readmeJa.includes('v1.1.0'), 'Japanese README is not synchronized to v1.1.0.');
assert.ok(!readme.includes('Release candidate'), 'English README must not advertise a release-candidate status.');
assert.ok(!readmeJa.includes('Release Candidate'), 'Japanese README must not advertise a release-candidate status.');
assert.ok(!readme.includes('v1.1.0-beta.3'), 'English README still advertises beta.3.');
assert.ok(!readmeJa.includes('v1.1.0-beta.3'), 'Japanese README still advertises beta.3.');

assert.ok(repositoryCheck.includes('1.1.0'), 'Repository checker version is not synchronized.');
assert.ok(repositoryCheck.includes('tests\\release-smoke.mjs'), 'Repository checker must require the final release regression test.');
assert.ok(buildBat.includes('v1.1.0'), 'Windows build entry point version is not synchronized.');
assert.ok(buildPs1.includes('v1.1.0'), 'PowerShell build version is not synchronized.');
for (const workflow of [buildWorkflow, deployWorkflow]) {
  assert.ok(workflow.includes('node ./tests/release-smoke.mjs'), 'Workflow does not run the final release regression test.');
  assert.ok(workflow.includes('node ./tests/mobile-workspace-smoke.mjs'), 'Workflow does not run the mobile regression test.');
  assert.ok(workflow.includes('node ./tests/connection-minimap-smoke.mjs'), 'Workflow does not run the MiniMap regression test.');
}

console.log('[OK] v1.1.0 final release regression contract passed.');
