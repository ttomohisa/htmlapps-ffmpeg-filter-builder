import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = (path) => fs.readFileSync(new URL(path, import.meta.url), 'utf8');
const exists = (path) => fs.existsSync(new URL(path, import.meta.url));
const source = read('../src/index.template.html');
const app = JSON.parse(read('../app.config.json'));
const runtime = JSON.parse(read('../runtime.lock.json'));
const readme = read('../README.md');
const readmeJa = read('../README.ja.md');
const changelog = read('../CHANGELOG.md');
const spec = read('../APP_SPEC.md');
const offline = read('../VERIFY_OFFLINE.md');
const repositoryCheck = read('../scripts/check-repository.ps1');
const workflows = [
  read('../.github/workflows/build-standalone.yml'),
  read('../.github/workflows/deploy-pages.yml')
];

assert.equal(app.version, '1.2.0', 'Stable app version mismatch.');
assert.equal(app.build.blockRuntimeNetwork, true, 'Stable must keep runtime network blocking enabled.');
assert.equal(runtime.builderVersion, '1.9.9', 'Stable must keep Builder v1.9.9 pinned.');
assert.equal(runtime.profile, 'ffmpeg-filter-builder', 'Stable runtime profile changed unexpectedly.');
for (const variant of ['single-thread', 'multi-thread']) {
  assert.match(runtime.variants[variant].sha256, /^[a-f0-9]{64}$/, `${variant} runtime SHA-256 is invalid.`);
  assert.ok(runtime.variants[variant].url.includes('/releases/download/v1.9.9/'), `${variant} runtime is not pinned to v1.9.9 release assets.`);
}

for (const marker of [
  '<span class="version-badge" id="versionBadge">v1.2.0</span>',
  "connect-src 'none'",
  'GRAPH_SCHEMA_VERSION=4',
  'function inspectMp4Tracks',
  'function autoRelinkMissingFiles',
  'recipeLogoNeedsImage',
  "recipeBgm:'BGMを追加'",
  "recipeReplaceAudio:'音声をBGMに置き換える'",
  'shortest=0:eof_action=pass:repeatlast=0',
  'eof_action=repeat:repeatlast=1',
  'aresample=48000',
  'amix=inputs=2',
  'id="relinkInputsButton"',
  'id="mobileSheetBackdrop"',
  'function startTouchPinch()',
  'const PALETTE_DRAG_MIME=',
  '.editor-grid { display:grid; grid-template-columns:230px minmax(0,1fr) 300px;',
  '.palette-panel .panel-body, .inspector-panel .panel-body { height:calc(100% - 57px); overflow:auto;',
  'helpKeyboard1:',
  'id="previewButton"',
  'id="fullRenderButton"'
]) assert.ok(source.includes(marker), `Stable feature marker missing: ${marker}`);

assert.ok(!/<script[^>]+src\s*=\s*["']https?:\/\//i.test(source), 'Stable source gained an external runtime script.');
assert.ok(!/<link[^>]+href\s*=\s*["']https?:\/\//i.test(source), 'Stable source gained an external runtime stylesheet.');

for (const test of [
  'beta1-pip-smoke.mjs',
  'beta2-logo-overlay-smoke.mjs',
  'beta3-audio-bgm-smoke.mjs',
  'beta4-auto-relink-smoke.mjs',
  'mp4-track-detection-smoke.mjs',
  'multi-input-runtime-smoke.mjs',
  'mobile-workspace-smoke.mjs',
  'pages-deployment-smoke.mjs',
  'release-smoke.mjs'
]) assert.ok(exists(`./${test}`), `Stable regression test missing: ${test}`);

for (const workflow of workflows) {
  for (const command of [
    'node ./tests/beta1-pip-smoke.mjs',
    'node ./tests/beta2-logo-overlay-smoke.mjs',
    'node ./tests/beta3-audio-bgm-smoke.mjs',
    'node ./tests/beta4-auto-relink-smoke.mjs',
    'node ./tests/mobile-workspace-smoke.mjs',
    'node ./tests/multi-input-runtime-smoke.mjs',
    'node ./tests/stable-release-smoke.mjs',
    'node ./tests/release-smoke.mjs'
  ]) assert.ok(workflow.includes(command), `Workflow missing Stable gate command: ${command}`);
}

assert.ok(repositoryCheck.includes('tests\\stable-release-smoke.mjs'), 'Repository check must require the Stable gate.');
assert.ok(readme.includes('Current release: **v1.2.0**'), 'English README Stable status missing.');
assert.ok(readmeJa.includes('現在の正式版: **v1.2.0**'), 'Japanese README Stable status missing.');
assert.ok(changelog.includes('## 1.2.0 - 2026-09-21'), 'Stable changelog entry missing.');
assert.ok(changelog.includes('## 1.2.0-rc.1 - 2026-09-21'), 'RC changelog history must be preserved.');
assert.ok(spec.includes('## v1.2.0 Stable（2026-09-21）'), 'Stable spec gate missing.');
assert.ok(offline.includes('# Offline verification — v1.2.0'), 'Stable offline verification heading missing.');
assert.ok(offline.includes('## v1.2.0 stable release regression'), 'Stable offline release section missing.');

for (const image of ['../assets/screenshot.png', '../assets/screenshot-en.png', '../assets/screenshot-mobile.png']) {
  const bytes = fs.readFileSync(new URL(image, import.meta.url));
  assert.ok(bytes.length > 10_000, `Release screenshot is unexpectedly small: ${image}`);
  assert.equal(bytes.toString('ascii', 1, 4), 'PNG', `Release screenshot is not PNG: ${image}`);
}

console.log('[OK] v1.2.0 stable release gate passed.');
